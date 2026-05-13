// HttpOnly cookie session for the coach dashboard (mirrors parent portal crypto,
// distinct cookie name + payload version so the two sessions never collide).
import crypto from "node:crypto";

import { isValidEmail, normaliseEmail } from "./_parent-session.mjs";

export const COACH_SESSION_COOKIE = "g2p_coach_session";
/** Rolling window for each issued cookie; extended on activity via withRefreshedCoachSessionCookie (same idea as parents). */
export const COACH_SESSION_TTL_DAYS = 365;
export const COACH_SESSION_VERSION = "cv1";

function sessionSecret() {
  const fromEnv = process.env.PARENT_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PARENT_SESSION_SECRET is required in production.");
  }
  return "dev-only-parent-session-secret-change-me-please-32";
}

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

export function createCoachSessionCookieValue(email) {
  const expSeconds = Math.floor(Date.now() / 1000) + COACH_SESSION_TTL_DAYS * 24 * 60 * 60;
  const payload = base64UrlEncode(
    JSON.stringify({ email: normaliseEmail(email), exp: expSeconds, v: COACH_SESSION_VERSION }),
  );
  const signature = base64UrlEncode(sign(payload));
  return `${payload}.${signature}`;
}

function safeEquals(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function readCoachSessionCookieValue(cookieValue) {
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
  if (!parsed || parsed.v !== COACH_SESSION_VERSION) return null;
  if (typeof parsed.exp !== "number" || parsed.exp * 1000 < Date.now()) return null;
  if (!isValidEmail(parsed.email)) return null;
  return { email: normaliseEmail(parsed.email), exp: parsed.exp };
}

export function buildCoachSessionCookie(value, { maxAgeSeconds = COACH_SESSION_TTL_DAYS * 24 * 60 * 60 } = {}) {
  const parts = [`${COACH_SESSION_COOKIE}=${value}`, "Path=/", "HttpOnly", "Secure", "SameSite=Lax"];
  if (maxAgeSeconds <= 0) {
    parts.push("Max-Age=0");
  } else {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }
  return parts.join("; ");
}

export function clearCoachSessionCookie() {
  return buildCoachSessionCookie("", { maxAgeSeconds: 0 });
}

/**
 * Sliding renewal: re-issue the coach session cookie on successful API responses
 * so active coaches keep a fresh COACH_SESSION_TTL_DAYS window (mirrors
 * withRefreshedSessionCookie for parents).
 *
 * Only attaches Set-Cookie on HTTP 2xx; errors do not extend the session.
 */
export function withRefreshedCoachSessionCookie(response, email) {
  if (!response || typeof response !== "object") return response;
  const status = Number(response.statusCode);
  if (!(status >= 200 && status < 300)) return response;
  if (!email || typeof email !== "string") return response;
  const value = createCoachSessionCookieValue(email);
  const cookie = buildCoachSessionCookie(value);
  const existing = response.multiValueHeaders || {};
  const setCookie = Array.isArray(existing["Set-Cookie"])
    ? existing["Set-Cookie"].slice()
    : [];
  setCookie.push(cookie);
  return {
    ...response,
    multiValueHeaders: {
      ...existing,
      "Set-Cookie": setCookie,
    },
  };
}

export function readCoachSessionFromEvent(event) {
  const header = event?.headers?.cookie || event?.headers?.Cookie;
  if (!header) return null;
  const cookies = String(header).split(";");
  for (const raw of cookies) {
    const [nameRaw, ...rest] = raw.trim().split("=");
    if (nameRaw !== COACH_SESSION_COOKIE) continue;
    return readCoachSessionCookieValue(rest.join("="));
  }
  return null;
}

export function requireCoachSession(event, jsonHelper) {
  const session = readCoachSessionFromEvent(event);
  if (!session) {
    return { error: jsonHelper(401, { error: "Coach sign-in required." }) };
  }
  return { session };
}
