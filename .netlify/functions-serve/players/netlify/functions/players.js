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

// netlify/functions/players.mjs
var players_exports = {};
__export(players_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(players_exports);

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
function playerBelongsToCoach(player, coachRecordId, { legacyUnassignedVisible = false } = {}) {
  const ids = Array.isArray(player?.coachIds) ? player.coachIds : [];
  if (!coachRecordId) return false;
  if (ids.length === 0) return legacyUnassignedVisible;
  return ids.includes(coachRecordId);
}
function buildSidebar(players, counts = {}) {
  const needsAction = players.filter((player) => player.consentStatus === "red" || player.consentStatus === "grey").length;
  return [
    { id: "overview", label: "Overview", count: players.length, icon: "home" },
    { id: "players", label: "Players", count: players.length, icon: "users" },
    { id: "sessions", label: "Sessions", count: counts.sessions ?? 0, icon: "calendar" },
    { id: "attendance", label: "Attendance", count: counts.attendance ?? 0, icon: "clipboard" },
    { id: "safeguarding", label: "Safeguarding", count: needsAction, icon: "shield" },
    { id: "payments", label: "Payments", count: counts.payments ?? 0, icon: "pound" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" }
  ];
}
async function getCoachAndPlayers() {
  if (!hasAirtableConfig()) return demoData;
  const coachParams = { maxRecords: "1" };
  if (process.env.AIRTABLE_COACH_FILTER) coachParams.filterByFormula = process.env.AIRTABLE_COACH_FILTER;
  const [coachRecords, playerRecords] = await Promise.all([
    airtableList(tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES), coachParams),
    airtableList(tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS), { pageSize: "100" })
  ]);
  const coach = normaliseCoach(coachRecords[0]);
  const players = playerRecords.map(normalisePlayer);
  return {
    coach,
    players,
    sidebar: buildSidebar(players),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function findCoachRecordByNormalisedEmail(normalisedEmail) {
  if (!hasAirtableConfig()) return null;
  const coachesTable = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  const formula = `LOWER(TRIM({Email}))='${escapeFormulaString(normalisedEmail)}'`;
  const records = await airtableList(coachesTable, {
    filterByFormula: formula,
    maxRecords: "1"
  });
  return records[0] || null;
}
async function getCoachDashboardDataForSessionEmail(normalisedEmail) {
  if (!hasAirtableConfig()) return demoData;
  const coachRecord = await findCoachRecordByNormalisedEmail(normalisedEmail);
  if (!coachRecord) {
    const err = new Error("coach_not_found");
    err.code = "COACH_NOT_FOUND";
    throw err;
  }
  const coach = normaliseCoach(coachRecord);
  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  const coachesTable = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  const [playerRecords, coachRecords] = await Promise.all([
    airtableList(playersTable, { pageSize: "100" }),
    airtableList(coachesTable, { pageSize: 100, maxRecords: 50 })
  ]);
  const legacyUnassigned = coachRecords.length <= 1;
  const players = playerRecords.map(normalisePlayer).filter((player) => playerBelongsToCoach(player, coachRecord.id, { legacyUnassigned }));
  return {
    coach,
    players,
    sidebar: buildSidebar(players),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
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
function escapeFormulaString(value) {
  return String(value).replace(/'/g, "\\'");
}

// netlify/functions/_coach-session.mjs
var import_node_crypto2 = __toESM(require("crypto"), 1);

// netlify/functions/_parent-session.mjs
var import_node_crypto = __toESM(require("crypto"), 1);
function normaliseEmail(value) {
  return String(value || "").trim().toLowerCase();
}
function isValidEmail(value) {
  const email = normaliseEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// netlify/functions/_coach-session.mjs
var COACH_SESSION_COOKIE = "g2p_coach_session";
var COACH_SESSION_TTL_DAYS = 365;
var COACH_SESSION_VERSION = "cv1";
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
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + (4 - value.length % 4) % 4, "=");
  return Buffer.from(padded, "base64");
}
function sign(payload) {
  return import_node_crypto2.default.createHmac("sha256", sessionSecret()).update(payload).digest();
}
function createCoachSessionCookieValue(email) {
  const expSeconds = Math.floor(Date.now() / 1e3) + COACH_SESSION_TTL_DAYS * 24 * 60 * 60;
  const payload = base64UrlEncode(
    JSON.stringify({ email: normaliseEmail(email), exp: expSeconds, v: COACH_SESSION_VERSION })
  );
  const signature = base64UrlEncode(sign(payload));
  return `${payload}.${signature}`;
}
function safeEquals(a, b) {
  if (a.length !== b.length) return false;
  return import_node_crypto2.default.timingSafeEqual(a, b);
}
function readCoachSessionCookieValue(cookieValue) {
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
  if (typeof parsed.exp !== "number" || parsed.exp * 1e3 < Date.now()) return null;
  if (!isValidEmail(parsed.email)) return null;
  return { email: normaliseEmail(parsed.email), exp: parsed.exp };
}
function buildCoachSessionCookie(value, { maxAgeSeconds = COACH_SESSION_TTL_DAYS * 24 * 60 * 60 } = {}) {
  const parts = [`${COACH_SESSION_COOKIE}=${value}`, "Path=/", "HttpOnly", "Secure", "SameSite=Lax"];
  if (maxAgeSeconds <= 0) {
    parts.push("Max-Age=0");
  } else {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }
  return parts.join("; ");
}
function withRefreshedCoachSessionCookie(response, email) {
  if (!response || typeof response !== "object") return response;
  const status = Number(response.statusCode);
  if (!(status >= 200 && status < 300)) return response;
  if (!email || typeof email !== "string") return response;
  const value = createCoachSessionCookieValue(email);
  const cookie = buildCoachSessionCookie(value);
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
function readCoachSessionFromEvent(event) {
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
function requireCoachSession(event, jsonHelper) {
  const session = readCoachSessionFromEvent(event);
  if (!session) {
    return { error: jsonHelper(401, { error: "Coach sign-in required." }) };
  }
  return { session };
}

// netlify/functions/_coach-gate.mjs
function wrapCoachResponse(gate, response) {
  if (!gate || !gate.ok || gate.sessionEmail == null) return response;
  return withRefreshedCoachSessionCookie(response, gate.sessionEmail);
}
function gateCoachDashboard(event, jsonFn = json) {
  if (!hasAirtableConfig()) return { ok: true, sessionEmail: null };
  const auth = requireCoachSession(event, jsonFn);
  if (auth.error) return { ok: false, response: auth.error };
  return { ok: true, sessionEmail: auth.session.email };
}

// netlify/functions/players.mjs
var ALLOWED_LEAVE_REASONS = /* @__PURE__ */ new Set([
  "Moved Area",
  "Joined Another Club",
  "Finished Age Group",
  "Parent Request",
  "Other"
]);
var ALLOWED_PATHWAYS = /* @__PURE__ */ new Set([
  "Grassroots Football",
  "Academy Football",
  "School Football",
  "Not Currently With a Team",
  "Other / Unsure",
  ""
  // empty = clear
]);
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
async function handlePatch(event) {
  if (!hasAirtableConfig()) {
    return json(503, { error: "Airtable is not configured." });
  }
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const id = String(body.id || "").trim();
  const action = String(body.action || "").trim();
  if (!id || !action) {
    return json(400, { error: "id and action are required." });
  }
  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  if (action === "set-pathway") {
    const value = String(body.value ?? "").trim();
    if (!ALLOWED_PATHWAYS.has(value)) {
      return json(400, { error: "Unsupported pathway value." });
    }
    const updated = await airtableUpdate(playersTable, id, {
      "Football Pathway": value || null
    });
    return json(200, { player: normalisePlayer(updated) });
  }
  if (action === "mark-left") {
    const reasonRaw = String(body.reason || "").trim();
    if (!ALLOWED_LEAVE_REASONS.has(reasonRaw)) {
      return json(400, { error: "Unsupported leave reason." });
    }
    const notes = String(body.notes || "").trim();
    const updated = await airtableUpdate(playersTable, id, {
      Status: "Left",
      "Leave Reason": reasonRaw,
      "Leave Requested At": nowIso(),
      "Leave Notes": notes || null,
      "Leave Requested": false
    });
    return json(200, { player: normalisePlayer(updated) });
  }
  if (action === "acknowledge-leave") {
    const updated = await airtableUpdate(playersTable, id, {
      "Leave Requested": false
    });
    return json(200, { player: normalisePlayer(updated) });
  }
  if (action === "reinstate") {
    const updated = await airtableUpdate(playersTable, id, {
      Status: "Active",
      "Leave Requested": false,
      "Leave Requested At": null,
      "Leave Reason": null,
      "Leave Notes": null,
      "Erasure Requested": false,
      "Erasure Requested At": null
    });
    return json(200, { player: normalisePlayer(updated) });
  }
  return json(400, { error: `Unknown action: ${action}` });
}
var handler = async (event) => {
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;
  const method = (event.httpMethod || "GET").toUpperCase();
  try {
    if (method === "GET") {
      const data = gate.sessionEmail === null ? await getCoachAndPlayers() : await getCoachDashboardDataForSessionEmail(gate.sessionEmail);
      return wrapCoachResponse(gate, json(200, data.players));
    }
    if (method === "PATCH") {
      return wrapCoachResponse(gate, await handlePatch(event));
    }
    return json(405, { error: `Method ${method} not allowed.` });
  } catch (error) {
    console.error(error);
    if (hasAirtableConfig() && error?.code === "COACH_NOT_FOUND") {
      return json(403, { error: "Coach record not found for this session." });
    }
    return json(500, { error: "Unable to update player record." });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=players.js.map
