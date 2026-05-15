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

// netlify/functions/parent-push-list.mjs
var parent_push_list_exports = {};
__export(parent_push_list_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(parent_push_list_exports);
var import_node_crypto2 = __toESM(require("crypto"), 1);

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
async function airtableGet(table, recordId) {
  if (!hasAirtableConfig()) {
    throw new Error("Airtable environment variables are not configured.");
  }
  const url = `${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${encodeTable(table)}/${encodeURIComponent(recordId)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable get failed for ${table}/${recordId}: ${body}`);
  }
  return response.json();
}

// netlify/functions/_parent-session.mjs
var import_node_crypto = __toESM(require("crypto"), 1);
var PARENT_SESSION_COOKIE = "g2p_parent_session";
var SESSION_VERSION = "v1";
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
function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + (4 - value.length % 4) % 4, "=");
  return Buffer.from(padded, "base64");
}
function sign(payload) {
  return import_node_crypto.default.createHmac("sha256", sessionSecret()).update(payload).digest();
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

// netlify/functions/parent-push-list.mjs
function pushSubsTable() {
  return tableName(
    "AIRTABLE_PUSH_SUBSCRIPTIONS_TABLE",
    "Push Subscriptions",
    TABLE_IDS.PUSH_SUBSCRIPTIONS
  );
}
function parentsTable() {
  return tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS);
}
async function findParentIdByEmail(email) {
  const target = normaliseEmail(email);
  if (!target) return null;
  const records = await airtableList(parentsTable(), { pageSize: "100" });
  const match = records.find((record) => {
    const candidate = normaliseEmail(record?.fields?.Email);
    return candidate && candidate === target;
  });
  return match?.id || null;
}
function hashEndpoint(endpoint) {
  return import_node_crypto2.default.createHash("sha256").update(String(endpoint || "")).digest("hex");
}
var handler = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();
  if (method !== "GET") {
    return json(405, { error: `Method ${method} not allowed.` });
  }
  if (!hasAirtableConfig()) {
    return json(503, { error: "The portal is not available in demo mode." });
  }
  const gate = requireParentSession(event, json);
  if (gate.error) return gate.error;
  const parentEmail = normaliseEmail(gate.session.email);
  try {
    const parentId = await findParentIdByEmail(parentEmail);
    if (!parentId) {
      return json(200, { subscriptions: [] });
    }
    const records = await airtableList(pushSubsTable(), { pageSize: "100" });
    const subscriptions = [];
    for (const record of records) {
      const fields = record?.fields || {};
      const linked = Array.isArray(fields.Parent) ? fields.Parent : [];
      if (!linked.includes(parentId)) continue;
      try {
        const parent = await airtableGet(parentsTable(), parentId);
        if (normaliseEmail(parent?.fields?.Email) !== parentEmail) continue;
      } catch {
        continue;
      }
      subscriptions.push({
        id: record.id,
        deviceLabel: String(fields["Device Label"] || "Unknown device"),
        userAgent: String(fields["User Agent"] || ""),
        active: Boolean(fields.Active),
        prefs: {
          oneHourReminder: Boolean(fields["Pref One Hour Reminder"]),
          checkInOpen: Boolean(fields["Pref Check In Open"]),
          pickupSoon: Boolean(fields["Pref Pickup Soon"]),
          // Default-on read so legacy rows that pre-date the field still
          // surface this pref as enabled in the SPA.
          noShowCheckIn: fields["Pref No Show Check-In"] === void 0 ? true : Boolean(fields["Pref No Show Check-In"])
        },
        endpointHash: hashEndpoint(fields.Endpoint),
        createdAt: fields["Created At"] || null,
        lastUsedAt: fields["Last Used At"] || null,
        failureCount: Number(fields["Failure Count"] || 0)
      });
    }
    subscriptions.sort((a, b) => {
      const aTs = Date.parse(a.lastUsedAt || a.createdAt || 0) || 0;
      const bTs = Date.parse(b.lastUsedAt || b.createdAt || 0) || 0;
      return bTs - aTs;
    });
    return json(200, { subscriptions });
  } catch (error) {
    console.error("[parent-push-list] Load failed:", error);
    return json(500, { error: "We couldn't load your notification settings. Please try again." });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=parent-push-list.js.map
