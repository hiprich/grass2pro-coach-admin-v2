var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/parent-auth.mjs
var parent_auth_exports = {};
__export(parent_auth_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(parent_auth_exports);

// netlify/functions/_airtable.mjs
var AIRTABLE_API = "https://api.airtable.com/v0";
var json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body)
});
var demoData = {
  coach: {
    id: "rec_demo_coach",
    name: "Kobby Mensah",
    role: "Grassroots coach admin",
    credential: "FA Level 1 | DBS checked",
    email: "coach@grass2pro.com"
  },
  players: [
    {
      id: "ply_01",
      name: "Jayden Cole",
      ageGroup: "U11",
      team: "Grass2Pro West",
      position: "CM",
      status: "Active",
      guardianName: "M. Cole",
      consentStatus: "green",
      photoConsent: true,
      videoConsent: true,
      matchPhotoConsent: true,
      matchVideoConsent: true,
      websiteConsent: true,
      socialConsent: false,
      highlightsConsent: true,
      reviewDue: "2026-05-02",
      progressScore: 84
    },
    {
      id: "ply_02",
      name: "Noah Patel",
      ageGroup: "U11",
      team: "Grass2Pro West",
      position: "RW",
      status: "Active",
      guardianName: "A. Patel",
      consentStatus: "amber",
      photoConsent: true,
      videoConsent: true,
      matchPhotoConsent: false,
      matchVideoConsent: false,
      websiteConsent: false,
      socialConsent: false,
      highlightsConsent: false,
      reviewDue: "2026-05-07",
      progressScore: 71
    },
    {
      id: "ply_03",
      name: "Leo Brooks",
      ageGroup: "U8",
      team: "Grass2Pro Juniors",
      position: "ST",
      status: "Needs parent follow-up",
      guardianName: "S. Brooks",
      consentStatus: "grey",
      photoConsent: false,
      videoConsent: false,
      matchPhotoConsent: false,
      matchVideoConsent: false,
      websiteConsent: false,
      socialConsent: false,
      highlightsConsent: false,
      reviewDue: "2026-05-10",
      progressScore: 48
    },
    {
      id: "ply_04",
      name: "Amari James",
      ageGroup: "U11",
      team: "Grass2Pro West",
      position: "CB",
      status: "Withdrawn media consent",
      guardianName: "T. James",
      consentStatus: "red",
      photoConsent: false,
      videoConsent: false,
      matchPhotoConsent: false,
      matchVideoConsent: false,
      websiteConsent: false,
      socialConsent: false,
      highlightsConsent: false,
      reviewDue: "2026-05-12",
      progressScore: 67
    },
    {
      id: "ply_05",
      name: "Ethan Smith",
      ageGroup: "U8",
      team: "Grass2Pro Juniors",
      position: "GK",
      status: "Active",
      guardianName: "R. Smith",
      consentStatus: "green",
      photoConsent: true,
      videoConsent: true,
      matchPhotoConsent: true,
      matchVideoConsent: true,
      websiteConsent: false,
      socialConsent: false,
      highlightsConsent: true,
      reviewDue: "2026-05-04",
      progressScore: 76
    }
  ],
  sidebar: [
    { id: "overview", label: "Overview", count: 5, icon: "home" },
    { id: "players", label: "Players", count: 5, icon: "users" },
    { id: "sessions", label: "Sessions", count: 0, icon: "calendar" },
    { id: "attendance", label: "Attendance", count: 0, icon: "clipboard" },
    { id: "safeguarding", label: "Safeguarding", count: 2, icon: "shield" },
    { id: "payments", label: "Payments", count: 0, icon: "pound" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" }
  ],
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function hasAirtableConfig() {
  return Boolean((process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY) && process.env.AIRTABLE_BASE_ID);
}
function tableName(key, fallbackName, fallbackId) {
  const idEnv = process.env[`${key}_ID`];
  if (idEnv) return idEnv;
  const nameEnv = process.env[key];
  if (nameEnv) return nameEnv;
  if (fallbackId) return fallbackId;
  return fallbackName;
}
var TABLE_IDS = {
  COACHES: "tblb7EEVuRBz1BeA5",
  PLAYERS: "tbl4iFx39SdFcidqu",
  PARENTS: "tblC9YZ2eI0rK1KFc",
  MEDIA_CONSENTS: "tblFY37amCu9zbfHO",
  SESSIONS: "tblmiOGnUUil58oyw",
  ATTENDANCE: "tblLtPoWSS1fU5pHy",
  QR_CHECKINS: "tblZwhRy23bodjUCE",
  // Auth Tokens stores hashed magic-link tokens for parent portal sign-in.
  // The id is left blank so the AIRTABLE_AUTH_TOKENS_TABLE env var (or the
  // human-readable "Auth Tokens" name) takes over until the table id is
  // captured here.
  AUTH_TOKENS: "",
  // Push Subscriptions stores Web Push endpoints (one row per parent device)
  // plus per-notification preference toggles. Used by the scheduled fan-out
  // function to send the T−60 / T−30 reminders.
  PUSH_SUBSCRIPTIONS: "tbl3FDPfK1iYFvEwJ",
  // Notifications Sent is the dedupe + audit rail for the scheduled push
  // fan-out. One row per (session, kind, parent) tuple. The cron writes the
  // row BEFORE attempting the web-push send so a duplicate tick within the
  // same 5-minute window cannot trigger a second notification.
  NOTIFICATIONS_SENT: "tblqUnGbvAHgxjsm7",
  // Coach Announcements — parent portal megaphone board (optional until table exists).
  ANNOUNCEMENTS: ""
};
function token() {
  return process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
}
function looksLikeTableId(value) {
  return typeof value === "string" && /^tbl[a-zA-Z0-9]{10,}$/.test(value);
}
function encodeTable(table) {
  if (looksLikeTableId(table)) return table;
  return encodeURIComponent(table);
}
async function airtableList(table, params = {}) {
  if (!hasAirtableConfig()) {
    throw new Error("Airtable environment variables are not configured.");
  }
  const url = new URL(`${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${encodeTable(table)}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== void 0 && value !== null && value !== "") url.searchParams.set(key, value);
  });
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token()}`
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable list failed for ${table}: ${body}`);
  }
  const payload = await response.json();
  return payload.records || [];
}
var AirtableHttpError = class extends Error {
  constructor(message, { status, body, table } = {}) {
    super(message);
    this.name = "AirtableHttpError";
    this.status = status;
    this.body = body;
    this.table = table;
  }
};
async function airtableCreate(table, fields, options = {}) {
  if (!hasAirtableConfig()) {
    return { id: `demo_${Date.now()}`, fields, demo: true };
  }
  const body = { fields };
  if (options.typecast) body.typecast = true;
  const response = await fetch(`${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${encodeTable(table)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const body2 = await response.text();
    throw new AirtableHttpError(`Airtable create failed for ${table}: ${body2}`, {
      status: response.status,
      body: body2,
      table
    });
  }
  return response.json();
}
async function airtableUpdate(table, recordId, fields, { typecast = false } = {}) {
  if (!hasAirtableConfig()) {
    return { id: recordId || `demo_${Date.now()}`, fields, demo: true };
  }
  const url = `${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${encodeTable(table)}/${encodeURIComponent(recordId)}`;
  const body = typecast ? { fields, typecast: true } : { fields };
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable update failed for ${table}/${recordId}: ${text}`);
  }
  return response.json();
}

// netlify/functions/_parent-session.mjs
var import_node_crypto = __toESM(require("crypto"), 1);
var PARENT_SESSION_COOKIE = "g2p_parent_session";
var PARENT_SESSION_TTL_DAYS = 365;
var MAGIC_LINK_TTL_MINUTES = 15;
var TOKEN_BYTES = 32;
var SESSION_VERSION = "v1";
function authTokensTable() {
  return tableName("AIRTABLE_AUTH_TOKENS_TABLE", "Auth Tokens", TABLE_IDS.AUTH_TOKENS);
}
function sessionSecret() {
  const fromEnv = process.env.PARENT_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PARENT_SESSION_SECRET is required in production.");
  }
  return "dev-only-parent-session-secret-change-me-please-32";
}
function normaliseEmail(value) {
  return String(value || "").trim().toLowerCase();
}
function isValidEmail(value) {
  const email = normaliseEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function mintMagicLinkToken() {
  const raw = import_node_crypto.default.randomBytes(TOKEN_BYTES).toString("hex");
  return { raw, hash: hashToken(raw) };
}
function hashToken(raw) {
  return import_node_crypto.default.createHash("sha256").update(String(raw)).digest("hex");
}
async function storeMagicLinkToken({ email, hash, expiresAtIso, audience = "parent" }) {
  if (!hasAirtableConfig()) return null;
  const fields = {
    "Token Hash": hash,
    Email: email,
    Expires: expiresAtIso,
    Used: false
  };
  if (audience === "coach") {
    fields.Audience = "coach";
  }
  return airtableCreate(authTokensTable(), fields);
}
async function consumeMagicLinkToken({ email, rawToken, audience = "parent" }) {
  if (!hasAirtableConfig()) return null;
  const hash = hashToken(rawToken);
  const records = await airtableList(authTokensTable(), {
    pageSize: "100",
    "sort[0][field]": "Created",
    "sort[0][direction]": "desc"
  });
  const targetEmail = normaliseEmail(email);
  const now = Date.now();
  const match = records.find((record) => {
    const fields = record?.fields || {};
    const audienceField = String(fields.Audience || "").trim().toLowerCase();
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
  await airtableUpdate(authTokensTable(), match.id, { Used: true });
  return match;
}
function base64UrlEncode(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function sign(payload) {
  return import_node_crypto.default.createHmac("sha256", sessionSecret()).update(payload).digest();
}
function createSessionCookieValue(email) {
  const expSeconds = Math.floor(Date.now() / 1e3) + PARENT_SESSION_TTL_DAYS * 24 * 60 * 60;
  const payload = base64UrlEncode(JSON.stringify({ email: normaliseEmail(email), exp: expSeconds, v: SESSION_VERSION }));
  const signature = base64UrlEncode(sign(payload));
  return `${payload}.${signature}`;
}
function buildSessionCookie(value, { maxAgeSeconds = PARENT_SESSION_TTL_DAYS * 24 * 60 * 60 } = {}) {
  const parts = [
    `${PARENT_SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ];
  if (maxAgeSeconds <= 0) {
    parts.push("Max-Age=0");
  } else {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }
  return parts.join("; ");
}
function clearSessionCookie() {
  return buildSessionCookie("", { maxAgeSeconds: 0 });
}

// netlify/functions/_parent-mailer.mjs
var RESEND_ENDPOINT = "https://api.resend.com/emails";
function sender() {
  return process.env.EMAIL_FROM || "Grass2Pro <noreply@grass2pro.com>";
}
function portalBaseUrl() {
  return process.env.PARENT_PORTAL_BASE_URL || "";
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function sanitiseNext(next) {
  if (typeof next !== "string") return "";
  const trimmed = next.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "";
  if (!/^\/(scan|portal)(\/|\?|$)/i.test(trimmed)) return "";
  return trimmed;
}
function buildMagicLinkUrl(email, rawToken, next) {
  const base = portalBaseUrl().replace(/\/+$/, "");
  const safeNext = sanitiseNext(next);
  const params = { email, token: rawToken };
  if (safeNext) params.next = safeNext;
  const query = new URLSearchParams(params).toString();
  if (!base) return `/portal?${query}`;
  return `${base}/portal?${query}`;
}
function magicLinkSubject() {
  return "Your Grass2Pro sign-in link";
}
function magicLinkText({ url, expiresInMinutes }) {
  return [
    "Hi,",
    "",
    "Use this link to sign in to your Grass2Pro parent portal:",
    url,
    "",
    `The link expires in ${expiresInMinutes} minutes and can only be used once.`,
    "",
    "If you didn't request this, you can safely ignore the email.",
    "",
    "\u2014 Grass2Pro"
  ].join("\n");
}
function magicLinkHtml({ url, expiresInMinutes }) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111827; background:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #e5e7eb;">
      <h1 style="font-size:20px; margin:0 0 16px;">Sign in to Grass2Pro</h1>
      <p style="margin:0 0 16px; line-height:1.5;">Tap the button below to sign in to your parent portal.</p>
      <p style="margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block; background:#0d6efd; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;">Sign in to Grass2Pro</a>
      </p>
      <p style="margin:16px 0; color:#6b7280; font-size:14px; line-height:1.5;">Or paste this link into your browser:<br /><a href="${safeUrl}" style="color:#0d6efd; word-break:break-all;">${safeUrl}</a></p>
      <p style="margin:24px 0 0; color:#6b7280; font-size:13px;">The link expires in ${expiresInMinutes} minutes and can only be used once. If you didn't request this, you can safely ignore the email.</p>
    </div>
  </body>
</html>`;
}
async function sendMagicLinkEmail({ to, rawToken, expiresInMinutes, next }) {
  const url = buildMagicLinkUrl(to, rawToken, next);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[parent-mailer] RESEND_API_KEY not set; skipping send. Magic link would have been:",
      url
    );
    return { ok: false, reason: "mailer-not-configured" };
  }
  const payload = {
    from: sender(),
    to: [to],
    subject: magicLinkSubject(),
    text: magicLinkText({ url, expiresInMinutes }),
    html: magicLinkHtml({ url, expiresInMinutes })
  };
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("[parent-mailer] Resend rejected send:", response.status, body);
      return { ok: false, reason: "send-rejected" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[parent-mailer] Resend request failed:", error);
    return { ok: false, reason: "send-failed" };
  }
}

// netlify/functions/parent-auth.mjs
function jsonWithCookie(statusCode, body, cookie) {
  const base = json(statusCode, body);
  return {
    ...base,
    headers: {
      ...base.headers || {},
      "Set-Cookie": cookie
    }
  };
}
async function handleRequestLink(body) {
  const email = normaliseEmail(body.email);
  if (!isValidEmail(email)) {
    return json(400, { error: "Enter a valid email address." });
  }
  if (!hasAirtableConfig()) {
    return json(200, { ok: true, demo: true });
  }
  const { raw, hash } = mintMagicLinkToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1e3).toISOString();
  try {
    await storeMagicLinkToken({ email, hash, expiresAtIso: expiresAt });
  } catch (error) {
    console.error("[parent-auth] Failed to store magic-link token:", error);
    return json(200, { ok: true });
  }
  const result = await sendMagicLinkEmail({
    to: email,
    rawToken: raw,
    expiresInMinutes: MAGIC_LINK_TTL_MINUTES,
    next: typeof body.next === "string" ? body.next : ""
  });
  return json(200, { ok: true, sent: result.ok, reason: result.ok ? void 0 : result.reason });
}
async function handleVerifyToken(body) {
  const email = normaliseEmail(body.email);
  const tokenRaw = String(body.token || "").trim();
  if (!isValidEmail(email) || !tokenRaw) {
    return json(400, { error: "Sign-in link is missing or invalid." });
  }
  if (!hasAirtableConfig()) {
    return json(503, { error: "Sign-in is not available in demo mode." });
  }
  const match = await consumeMagicLinkToken({ email, rawToken: tokenRaw });
  if (!match) {
    return json(401, { error: "This sign-in link is no longer valid. Please request a new one." });
  }
  const cookieValue = createSessionCookieValue(email);
  return jsonWithCookie(200, { ok: true, email }, buildSessionCookie(cookieValue));
}
function handleSignOut() {
  return jsonWithCookie(200, { ok: true }, clearSessionCookie());
}
var handler = async (event) => {
  const method = (event.httpMethod || "POST").toUpperCase();
  if (method !== "POST") {
    return json(405, { error: `Method ${method} not allowed.` });
  }
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const action = String(body.action || "").trim();
  try {
    if (action === "request-link") return await handleRequestLink(body);
    if (action === "verify-token") return await handleVerifyToken(body);
    if (action === "sign-out") return handleSignOut();
    return json(400, { error: `Unknown action: ${action}` });
  } catch (error) {
    console.error("[parent-auth] Unhandled error:", error);
    return json(500, { error: "Sign-in is temporarily unavailable. Please try again." });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=parent-auth.js.map
