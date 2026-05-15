var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/coach-partner-update.mjs
var coach_partner_update_exports = {};
__export(coach_partner_update_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(coach_partner_update_exports);

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

// netlify/functions/_partner-config-sanitize.mjs
var MAX_PARTNER_CONFIG_BYTES = 8 * 1024;
var ALLOWED_PARTNER_KEYS = /* @__PURE__ */ new Set([
  "brandName",
  "monogram",
  "tagline",
  "accent",
  "accentGradient",
  "ink",
  "wordmarkColor",
  "taglineColor",
  "outlineColor",
  "outlineWidth",
  "style",
  "shape",
  "fontStyle"
]);
var ALLOWED_FONT_STYLES = /* @__PURE__ */ new Set([
  "general-sans",
  "satoshi",
  "inter",
  "mono",
  "signature",
  "calligraphy"
]);
function sanitisePartnerPayload(input) {
  if (!input || typeof input !== "object") return null;
  const out = {};
  for (const key of Object.keys(input)) {
    if (!ALLOWED_PARTNER_KEYS.has(key)) continue;
    const value = input[key];
    if (value === void 0 || value === null) continue;
    if (key === "accentGradient") {
      if (typeof value !== "object" || Array.isArray(value)) continue;
      out[key] = value;
      continue;
    }
    if (key === "fontStyle") {
      if (typeof value !== "string" || !ALLOWED_FONT_STYLES.has(value)) continue;
      out[key] = value;
      continue;
    }
    out[key] = value;
  }
  if (typeof out.brandName !== "string" || out.brandName.trim() === "") {
    return null;
  }
  return out;
}

// netlify/functions/coach-partner-update.mjs
var DEFAULT_COACH_RECORD_ID = "rect8JRrno85KaRNG";
var handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }
  const expectedCode = process.env.LOGO_STUDIO_ADMIN_CODE;
  if (!expectedCode) {
    console.error(
      "coach-partner-update: LOGO_STUDIO_ADMIN_CODE env var is not set; refusing to save."
    );
    return json(503, {
      error: "Save is not configured on this deploy. Set LOGO_STUDIO_ADMIN_CODE in Netlify env vars."
    });
  }
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Request body must be valid JSON." });
  }
  const { adminCode, partner } = body || {};
  if (typeof adminCode !== "string" || adminCode !== expectedCode) {
    return json(401, { error: "Invalid admin code." });
  }
  const sanitised = sanitisePartnerPayload(partner);
  if (!sanitised) {
    return json(400, {
      error: "Partner config must include at least brandName (a non-empty string)."
    });
  }
  const serialised = JSON.stringify(sanitised);
  if (Buffer.byteLength(serialised, "utf8") > MAX_PARTNER_CONFIG_BYTES) {
    return json(413, {
      error: `Partner config exceeds ${MAX_PARTNER_CONFIG_BYTES} bytes.`
    });
  }
  const recordId = process.env.LOGO_STUDIO_COACH_RECORD_ID || DEFAULT_COACH_RECORD_ID;
  if (!hasAirtableConfig()) {
    return json(200, {
      ok: true,
      demo: true,
      partner: sanitised,
      message: "Airtable not configured on this deploy; payload validated but not persisted."
    });
  }
  const table = tableName(
    "AIRTABLE_COACHES_TABLE",
    "Coaches",
    TABLE_IDS.COACHES
  );
  try {
    const updated = await airtableUpdate(table, recordId, {
      "Partner Config": serialised
    });
    return json(200, {
      ok: true,
      recordId: updated.id,
      partner: sanitised
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("NOT_FOUND") || message.includes("not found")) {
      return json(404, {
        error: `Coach record ${recordId} not found in Airtable. Check LOGO_STUDIO_COACH_RECORD_ID.`
      });
    }
    console.error("coach-partner-update Airtable patch failed:", error);
    return json(500, {
      error: "Could not save partner config to Airtable. Make sure the Coaches table has a 'Partner Config' long-text field."
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=coach-partner-update.js.map
