// Shared helpers for the parent portal (/portal) sign-in flow.
//
// The portal uses a magic-link pattern:
//
//   1. Parent enters their email on /portal.
//   2. parent-auth?action=request-link mints a random token, stores its
//      SHA-256 hash in the Auth Tokens Airtable table with a 15-minute
//      expiry, and emails the parent a one-time link.
//   3. Parent clicks the link, which hits /portal?token=...&email=...; the
//      SPA forwards that to parent-auth?action=verify-token.
//   4. The function looks up the matching Auth Tokens row, marks it used,
//      and issues an HttpOnly signed session cookie (HMAC-SHA-256, 7-day
//      expiry).
//   5. parent-data and parent-actions read that cookie to scope every
//      request to the signed-in parent's children.
//
// All crypto here is the Node 20+ built-in `node:crypto` module — we
// deliberately avoid pulling in jsonwebtoken so the bundle stays small and
// there are no extra dependencies to audit.
import crypto from "node:crypto";

import {
  TABLE_IDS,
  airtableCreate,
  airtableList,
  airtableUpdate,
  hasAirtableConfig,
  tableName,
} from "./_airtable.mjs";

export const PARENT_SESSION_COOKIE = "g2p_parent_session";
// 365 days. Parents stay signed in essentially forever \u2014 we re-issue
// the cookie on every authenticated request (sliding renewal, see
// withRefreshedSessionCookie below) so anyone who opens the portal even
// once a year is never logged out. When payments land we'll likely drop
// this back to ~30 days and add an idle-timeout server-side; until then
// minimum-friction wins.
export const PARENT_SESSION_TTL_DAYS = 365;
export const MAGIC_LINK_TTL_MINUTES = 15;

const TOKEN_BYTES = 32; // 256-bit token before hex-encoding
const SESSION_VERSION = "v1";

function authTokensTable() {
  return tableName("AIRTABLE_AUTH_TOKENS_TABLE", "Auth Tokens", TABLE_IDS.AUTH_TOKENS);
}

function sessionSecret() {
  // The session secret signs cookies. It MUST be set in production. We fall
  // back to a deterministic dev secret only when not in production so
  // `netlify dev` and tests work without configuration. Production
  // deployments should always have PARENT_SESSION_SECRET set.
  const fromEnv = process.env.PARENT_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PARENT_SESSION_SECRET is required in production.");
  }
  return "dev-only-parent-session-secret-change-me-please-32";
}

// Normalise an email for comparison. We match parents to players on a
// trimmed, lowercased email so casing or trailing whitespace can't lock a
// parent out of their own portal.
export function normaliseEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normaliseEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------- Magic-link tokens ----------

// Generate a fresh random token (URL-safe hex). The plaintext is sent to the
// parent in the email; only the SHA-256 hash is stored in Airtable, so a
// leaked Auth Tokens table can't be used to log anyone in.
export function mintMagicLinkToken() {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

export async function storeMagicLinkToken({ email, hash, expiresAtIso, audience = "parent" }) {
  if (!hasAirtableConfig()) return null;
  const fields = {
    "Token Hash": hash,
    Email: email,
    Expires: expiresAtIso,
    Used: false,
  };
  // Coaches use the same Auth Tokens rows with Audience = coach (requires the
  // Audience field on that table — see README).Parents omit the field entirely
  // so legacy rows remain valid consumption targets.
  if (audience === "coach") {
    fields.Audience = "coach";
  }
  return airtableCreate(authTokensTable(), fields);
}

// Find an unused, unexpired auth-token row that matches the supplied raw
// token. We scan the recent set rather than filterByFormula on the hash
// column because Airtable's formula engine doesn't expose hashing — and
// the table is small (one row per sign-in attempt, expiring every 15 mins).
export async function consumeMagicLinkToken({ email, rawToken, audience = "parent" }) {
  if (!hasAirtableConfig()) return null;
  const hash = hashToken(rawToken);
  const records = await airtableList(authTokensTable(), {
    pageSize: "100",
    "sort[0][field]": "Created",
    "sort[0][direction]": "desc",
  });
  const targetEmail = normaliseEmail(email);
  const now = Date.now();
  const match = records.find((record) => {
    const fields = record?.fields || {};
    const audienceField = String(fields.Audience || "")
      .trim()
      .toLowerCase();
    if (audience === "parent" && audienceField === "coach") return false;
    if (audience === "coach" && audienceField !== "coach") return false;
    const recordHash = String(fields["Token Hash"] || "");
    if (recordHash !== hash) return false;
    if (normaliseEmail(fields.Email) !== targetEmail) return false;
    if (fields.Used) return false;
    const expires = Date.parse(fields.Expires);
    if (!Number.isFinite(expires) || expires < now) return false;
    return true;
  });
  if (!match) return null;
  // Burn the token immediately so it can't be replayed even within the TTL.
  await airtableUpdate(authTokensTable(), match.id, { Used: true });
  return match;
}

// ---------- Session cookies ----------
//
// The session cookie is `<base64url payload>.<base64url signature>` where
// payload is `{ email, exp, v }` JSON and the signature is HMAC-SHA-256
// over the payload using PARENT_SESSION_SECRET. We hand-roll this so we
// avoid an extra dependency; the format is essentially a stripped-down JWT.

function base64UrlEncode(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function sign(payload) {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest();
}

export function createSessionCookieValue(email) {
  const expSeconds = Math.floor(Date.now() / 1000) + PARENT_SESSION_TTL_DAYS * 24 * 60 * 60;
  const payload = base64UrlEncode(JSON.stringify({ email: normaliseEmail(email), exp: expSeconds, v: SESSION_VERSION }));
  const signature = base64UrlEncode(sign(payload));
  return `${payload}.${signature}`;
}

// timingSafeEqual throws on length mismatch, so we wrap it.
function safeEquals(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function readSessionCookieValue(cookieValue) {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expectedSig = sign(payload);
  let providedSig;
  try {
    providedSig = base64UrlDecode(signature);
  } catch {
    return null;
  }
  if (!safeEquals(expectedSig, providedSig)) return null;
  let parsed;
  try {
    parsed = JSON.parse(base64UrlDecode(payload).toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || parsed.v !== SESSION_VERSION) return null;
  if (typeof parsed.exp !== "number" || parsed.exp * 1000 < Date.now()) return null;
  if (!isValidEmail(parsed.email)) return null;
  return { email: normaliseEmail(parsed.email), exp: parsed.exp };
}

// Format a Set-Cookie header for issuing or clearing the session cookie.
// HttpOnly + Secure + SameSite=Lax keeps the cookie out of JavaScript and
// out of cross-site contexts, while still letting the magic-link callback
// land the cookie when the browser navigates from the email client.
export function buildSessionCookie(value, { maxAgeSeconds = PARENT_SESSION_TTL_DAYS * 24 * 60 * 60 } = {}) {
  const parts = [
    `${PARENT_SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ];
  if (maxAgeSeconds <= 0) {
    parts.push("Max-Age=0");
  } else {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }
  return parts.join("; ");
}

export function clearSessionCookie() {
  return buildSessionCookie("", { maxAgeSeconds: 0 });
}

// Pull the parent's session cookie out of the incoming Netlify event. We
// parse the Cookie header by hand so the helper has zero deps. Returns
// `{ email }` on success or null when there is no valid session.
export function readSessionFromEvent(event) {
  const header = event?.headers?.cookie || event?.headers?.Cookie;
  if (!header) return null;
  const cookies = String(header).split(";");
  for (const raw of cookies) {
    const [nameRaw, ...rest] = raw.trim().split("=");
    if (nameRaw !== PARENT_SESSION_COOKIE) continue;
    return readSessionCookieValue(rest.join("="));
  }
  return null;
}

// Convenience: most function handlers just want the parent's email or a
// 401 response. This returns one or the other.
export function requireParentSession(event, jsonHelper) {
  const session = readSessionFromEvent(event);
  if (!session) {
    return { error: jsonHelper(401, { error: "Sign in required." }) };
  }
  return { session };
}

// Sliding-renewal helper. Wrap any authenticated success response with
// this so the parent's session cookie gets re-issued with a fresh
// PARENT_SESSION_TTL_DAYS window on every request. The wrapped response
// keeps its existing headers (including Content-Type / Cache-Control)
// and gains a Set-Cookie via multiValueHeaders so other Set-Cookie
// values (we don't currently emit any, but defensive) aren't clobbered.
//
// Usage:
//   return withRefreshedSessionCookie(json(200, payload), parentEmail);
export function withRefreshedSessionCookie(response, email) {
  if (!response || typeof response !== "object") return response;
  // Only refresh on 2xx \u2014 we don't want a 401/500 to extend a session.
  const status = Number(response.statusCode);
  if (!(status >= 200 && status < 300)) return response;
  const value = createSessionCookieValue(email);
  const cookie = buildSessionCookie(value);
  // Preserve any existing multiValueHeaders the handler may have set.
  const existing = response.multiValueHeaders || {};
  const setCookie = Array.isArray(existing["Set-Cookie"]) ? existing["Set-Cookie"].slice() : [];
  setCookie.push(cookie);
  return {
    ...response,
    multiValueHeaders: {
      ...existing,
      "Set-Cookie": setCookie,
    },
  };
}
