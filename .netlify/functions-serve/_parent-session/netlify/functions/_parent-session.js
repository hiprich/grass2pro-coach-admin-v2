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

// netlify/functions/_parent-session.mjs
var parent_session_exports = {};
__export(parent_session_exports, {
  MAGIC_LINK_TTL_MINUTES: () => MAGIC_LINK_TTL_MINUTES,
  PARENT_SESSION_COOKIE: () => PARENT_SESSION_COOKIE,
  PARENT_SESSION_TTL_DAYS: () => PARENT_SESSION_TTL_DAYS,
  buildSessionCookie: () => buildSessionCookie,
  clearSessionCookie: () => clearSessionCookie,
  consumeMagicLinkToken: () => consumeMagicLinkToken,
  createSessionCookieValue: () => createSessionCookieValue,
  hashToken: () => hashToken,
  isValidEmail: () => isValidEmail,
  mintMagicLinkToken: () => mintMagicLinkToken,
  normaliseEmail: () => normaliseEmail,
  readSessionCookieValue: () => readSessionCookieValue,
  readSessionFromEvent: () => readSessionFromEvent,
  requireParentSession: () => requireParentSession,
  storeMagicLinkToken: () => storeMagicLinkToken,
  withRefreshedSessionCookie: () => withRefreshedSessionCookie
});
module.exports = __toCommonJS(parent_session_exports);
var import_node_crypto = __toESM(require("crypto"), 1);

// netlify/functions/_airtable.mjs
var AIRTABLE_API = "https://api.airtable.com/v0";
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
function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + (4 - value.length % 4) % 4, "=");
  return Buffer.from(padded, "base64");
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
function safeEquals(a, b) {
  if (a.length !== b.length) return false;
  return import_node_crypto.default.timingSafeEqual(a, b);
}
function readSessionCookieValue(cookieValue) {
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
  if (typeof parsed.exp !== "number" || parsed.exp * 1e3 < Date.now()) return null;
  if (!isValidEmail(parsed.email)) return null;
  return { email: normaliseEmail(parsed.email), exp: parsed.exp };
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
function readSessionFromEvent(event) {
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
function requireParentSession(event, jsonHelper) {
  const session = readSessionFromEvent(event);
  if (!session) {
    return { error: jsonHelper(401, { error: "Sign in required." }) };
  }
  return { session };
}
function withRefreshedSessionCookie(response, email) {
  if (!response || typeof response !== "object") return response;
  const status = Number(response.statusCode);
  if (!(status >= 200 && status < 300)) return response;
  const value = createSessionCookieValue(email);
  const cookie = buildSessionCookie(value);
  const existing = response.multiValueHeaders || {};
  const setCookie = Array.isArray(existing["Set-Cookie"]) ? existing["Set-Cookie"].slice() : [];
  setCookie.push(cookie);
  return {
    ...response,
    multiValueHeaders: {
      ...existing,
      "Set-Cookie": setCookie
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MAGIC_LINK_TTL_MINUTES,
  PARENT_SESSION_COOKIE,
  PARENT_SESSION_TTL_DAYS,
  buildSessionCookie,
  clearSessionCookie,
  consumeMagicLinkToken,
  createSessionCookieValue,
  hashToken,
  isValidEmail,
  mintMagicLinkToken,
  normaliseEmail,
  readSessionCookieValue,
  readSessionFromEvent,
  requireParentSession,
  storeMagicLinkToken,
  withRefreshedSessionCookie
});
//# sourceMappingURL=_parent-session.js.map
