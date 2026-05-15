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

// netlify/functions/parent-announcements.mjs
var parent_announcements_exports = {};
__export(parent_announcements_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(parent_announcements_exports);

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
function firstAttachmentUrl(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value[0]?.url || value[0]?.thumbnails?.large?.url || "";
  }
  if (typeof value === "string") return value;
  return "";
}
function stringValue(value, fallback = "") {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === void 0 || value === null) return fallback;
  return String(value);
}
function looksLikeRecordId(value) {
  return typeof value === "string" && /^rec[a-zA-Z0-9]{14,}$/.test(value);
}
function recordIdArray(value) {
  const out = [];
  const push = (entry) => {
    const id = String(entry || "").trim();
    if (looksLikeRecordId(id) && !out.includes(id)) out.push(id);
  };
  if (Array.isArray(value)) {
    for (const entry of value) push(entry);
  } else if (typeof value === "string") {
    for (const entry of value.split(",")) push(entry);
  }
  return out;
}
function boolValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["yes", "true", "approved", "allowed"].includes(value.toLowerCase());
  return Boolean(value);
}
function numberValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function normaliseConsentStatus(rawFields) {
  const explicit = stringValue(rawFields["Consent Status"] || rawFields["Media Consent Status"]).toLowerCase();
  if (["green", "amber", "red", "grey"].includes(explicit)) return explicit;
  if (explicit.includes("withdraw")) return "red";
  if (explicit.includes("limited")) return "amber";
  if (explicit.includes("not") || explicit.includes("missing")) return "grey";
  if (boolValue(rawFields["Photo Consent"]) && boolValue(rawFields["Video Consent"])) return "green";
  if (boolValue(rawFields["Photo Consent"]) || boolValue(rawFields["Video Consent"])) return "amber";
  return "grey";
}
function parsePartnerConfig(raw) {
  if (raw === void 0 || raw === null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function normaliseCoach(record) {
  const fields = record?.fields || {};
  return {
    id: record?.id || "coach",
    name: stringValue(fields["Full Name"] || fields.Name || fields["Coach Name"], "Grass2Pro Coach"),
    role: stringValue(fields.Role || fields.Title, "Coach admin"),
    credential: stringValue(fields.Qualification || fields.Credential || fields.Qualifications, "Safeguarding lead"),
    avatarUrl: firstAttachmentUrl(fields["Avatar Image"] || fields.Avatar || fields.Photo),
    email: stringValue(fields.Email),
    phone: stringValue(fields.Phone),
    dbsStatus: stringValue(fields["DBS Status"]),
    firstAidStatus: stringValue(fields["First Aid Status"]),
    partner: parsePartnerConfig(fields["Partner Config"])
  };
}
function normalisePlayer(record) {
  const fields = record?.fields || {};
  const consentStatus = normaliseConsentStatus(fields);
  return {
    id: record?.id || crypto.randomUUID(),
    name: stringValue(fields["Full Name"] || fields.Name || fields["Player Name"], "Unnamed player"),
    ageGroup: stringValue(fields["Age Group"] || fields.AgeGroup, "U11"),
    team: stringValue(fields.Team || fields.Squad, "Grass2Pro"),
    position: stringValue(fields.Position, "N/A"),
    status: stringValue(fields.Status, consentStatus === "red" ? "Withdrawn media consent" : "Active"),
    guardianName: stringValue(fields["Guardian Name"] || fields["Parent/Guardian"] || fields.Parent, "Parent/Guardian"),
    guardianIds: recordIdArray(fields["Parent/Guardian"] || fields.Parent || fields["Guardian Name"]),
    dateOfBirth: stringValue(fields["Date of Birth"] || fields.DOB, ""),
    // Empty string when unset so the Overview's "Pathway not set" tile can
    // count migrated players that pre-date this field.
    footballPathway: stringValue(fields["Football Pathway"], ""),
    // Parent contact email used to look up which children belong to a
    // signed-in parent on the /portal route. Stored as Email type in
    // Airtable; we lower-case it on the way out so subsequent comparisons
    // are case-insensitive.
    parentEmail: stringValue(fields["Parent Email"], "").trim().toLowerCase(),
    // Leave/move-on flow flags. These are surfaced on the Overview "Action
    // needed" card and on the Players list so a coach can act on parent
    // requests without leaving the dashboard.
    leaveRequested: boolValue(fields["Leave Requested"]),
    leaveRequestedAt: stringValue(fields["Leave Requested At"], ""),
    leaveReason: stringValue(fields["Leave Reason"], ""),
    leaveNotes: stringValue(fields["Leave Notes"], ""),
    erasureRequested: boolValue(fields["Erasure Requested"]),
    erasureRequestedAt: stringValue(fields["Erasure Requested At"], ""),
    consentStatus,
    photoConsent: boolValue(fields["Photo Consent"] || fields["Photo Permission"]),
    videoConsent: boolValue(fields["Video Consent"] || fields["Video Permission"]),
    matchPhotoConsent: boolValue(
      fields["Match Photo Consent"] || fields["Match Photo Permission"]
    ),
    matchVideoConsent: boolValue(
      fields["Match Video Consent"] || fields["Match Video Permission"]
    ),
    websiteConsent: boolValue(fields["Website Consent"] || fields["Website Permission"]),
    socialConsent: boolValue(fields["Social Consent"] || fields["Social Permission"]),
    highlightsConsent: boolValue(fields["Highlights Consent"] || fields["Highlight Permission"]),
    internalReportsConsent: boolValue(
      fields["Internal Reports Consent"] || fields["Internal Coaching Use"]
    ),
    pressConsent: boolValue(fields["Press Consent"] || fields["Press/Partner Use"]),
    emergencyContactConsent: boolValue(
      fields["Emergency Contact Consent"] || fields["Emergency Contact Sharing"]
    ),
    medicalInformationConsent: boolValue(
      fields["Medical Information Consent"] || fields["Medical Information Sharing"]
    ),
    reviewDue: stringValue(fields["Review Due"] || fields["Next Review"], (/* @__PURE__ */ new Date()).toISOString()),
    progressScore: numberValue(fields["Progress Score"] || fields.Progress, 0),
    // Linked Coaches row(s). Drives multi-coach dashboard scoping and parent announcements.
    coachIds: recordIdArray(fields.Coach || fields["Lead Coach"] || fields["Assigned Coach"])
  };
}
function announcementsTable() {
  return tableName("AIRTABLE_ANNOUNCEMENTS_TABLE", "Coach Announcements", TABLE_IDS.ANNOUNCEMENTS);
}
function normaliseAnnouncement(record) {
  const fields = record?.fields || {};
  const coachIds = recordIdArray(fields.Coach || fields["Lead Coach"]);
  return {
    id: record?.id || "",
    coachId: coachIds[0] || "",
    coachIds,
    title: stringValue(fields.Title || fields.Headline, "").trim(),
    body: stringValue(fields.Body || fields.Message || fields.Content, "").trim(),
    publishedAt: stringValue(fields["Published At"] || fields["Created At"] || fields.Created, ""),
    active: fields.Active === void 0 ? true : boolValue(fields.Active)
  };
}
async function listAnnouncementsForCoachIds(coachIds) {
  const wanted = new Set((coachIds || []).filter(Boolean));
  if (wanted.size === 0) return [];
  if (!hasAirtableConfig()) return [];
  try {
    const records = await airtableList(announcementsTable(), { pageSize: 100, maxRecords: 200 });
    const out = [];
    for (const rec of records) {
      const row = normaliseAnnouncement(rec);
      if (!row.active) continue;
      const matches = row.coachIds.some((id) => wanted.has(id)) || row.coachId && wanted.has(row.coachId);
      if (!matches) continue;
      if (!row.title && !row.body) continue;
      out.push(row);
    }
    out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    return out;
  } catch (error) {
    if (String(error?.message || "").includes("NOT_FOUND")) return [];
    throw error;
  }
}

// netlify/functions/_parent-session.mjs
var import_node_crypto = __toESM(require("crypto"), 1);
var PARENT_SESSION_COOKIE = "g2p_parent_session";
var PARENT_SESSION_TTL_DAYS = 365;
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

// netlify/functions/parent-announcements.mjs
async function loadPlayersForParent(parentEmail) {
  if (!hasAirtableConfig()) return [];
  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  const parentsTable = tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS);
  const [playerRecords, parentRecords] = await Promise.all([
    airtableList(playersTable, { pageSize: "100" }),
    airtableList(parentsTable, { pageSize: "100" })
  ]);
  const matchingGuardianIds = new Set(
    parentRecords.filter((record) => {
      const email = String(record?.fields?.Email || "").trim().toLowerCase();
      return email && email === parentEmail;
    }).map((record) => record.id)
  );
  return playerRecords.map(normalisePlayer).filter((player) => {
    if (player.parentEmail === parentEmail) return true;
    if (Array.isArray(player.guardianIds)) {
      for (const id of player.guardianIds) {
        if (matchingGuardianIds.has(id)) return true;
      }
    }
    return false;
  });
}
function collectCoachIds(players) {
  const ids = /* @__PURE__ */ new Set();
  for (const player of players) {
    for (const id of player.coachIds || []) {
      if (id) ids.add(id);
    }
  }
  return [...ids];
}
var handler = async (event) => {
  if ((event.httpMethod || "GET").toUpperCase() !== "GET") {
    return json(405, { error: "Method not allowed." });
  }
  const gate = requireParentSession(event, json);
  if (gate.error) return gate.error;
  const parentEmail = normaliseEmail(gate.session.email);
  try {
    const players = await loadPlayersForParent(parentEmail);
    const coachIds = collectCoachIds(players);
    const announcements = await listAnnouncementsForCoachIds(coachIds);
    const coachesTable = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
    const coachNameById = /* @__PURE__ */ new Map();
    if (hasAirtableConfig() && coachIds.length > 0) {
      const coachRecords = await airtableList(coachesTable, { pageSize: 100, maxRecords: 200 });
      for (const rec of coachRecords) {
        if (!coachIds.includes(rec.id)) continue;
        coachNameById.set(rec.id, normaliseCoach(rec).name);
      }
    }
    const enriched = announcements.map((row) => ({
      ...row,
      coachName: coachNameById.get(row.coachId) || "Your coach"
    }));
    return withRefreshedSessionCookie(
      json(200, { ok: true, announcements: enriched, coachIds }),
      parentEmail
    );
  } catch (error) {
    console.error("[parent-announcements]", error);
    return json(500, { error: "Could not load announcements right now." });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=parent-announcements.js.map
