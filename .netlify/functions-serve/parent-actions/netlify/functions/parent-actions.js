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

// netlify/functions/parent-actions.mjs
var parent_actions_exports = {};
__export(parent_actions_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(parent_actions_exports);

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
function readableValue(value, fallback = "") {
  if (Array.isArray(value)) {
    const cleaned = value.filter((entry) => entry && !looksLikeRecordId(String(entry)));
    if (cleaned.length === 0) return fallback;
    return cleaned.join(", ");
  }
  if (value === void 0 || value === null || value === "") return fallback;
  if (looksLikeRecordId(String(value))) return fallback;
  return String(value);
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
function inferAttendanceStatus(raw, fields) {
  const status = String(raw || "").toLowerCase();
  if (status.includes("present")) return "present";
  if (status.includes("late")) return "late";
  if (status.includes("absent")) return "absent";
  if (status.includes("injur")) return "injured";
  if (status.includes("excus")) return "excused";
  if (fields && (fields["Arrival Time"] || fields["Departure Time"])) return "present";
  return "absent";
}
function normaliseAttendance(record) {
  const fields = record?.fields || {};
  const sessionLink = Array.isArray(fields.Session) ? fields.Session[0] : fields.Session;
  const playerLink = Array.isArray(fields.Player) ? fields.Player[0] : fields.Player;
  const playerName = readableValue(fields["Player Name (from Player)"]) || readableValue(fields["Player Name"]) || readableValue(fields["Player Full Name"]) || stringValue(playerLink, "");
  return {
    id: record?.id || crypto.randomUUID(),
    sessionId: stringValue(sessionLink, ""),
    playerId: stringValue(playerLink, ""),
    playerName,
    status: inferAttendanceStatus(fields["Attendance Status"], fields),
    arrivalTime: stringValue(fields["Arrival Time"], ""),
    departureTime: stringValue(fields["Departure Time"], ""),
    parentNotified: boolValue(fields["Parent Notified"] || fields["Confirmation Status"]),
    coachNotes: stringValue(fields["Coach Notes"] || fields.Notes, ""),
    checkInMethod: stringValue(fields["Check-in Method"], ""),
    confirmationStatus: stringValue(fields["Confirmation Status"], ""),
    paymentStatus: stringValue(fields["Payment Status at Check-in"], ""),
    attendanceRecordIdText: stringValue(fields["Attendance Record ID"], ""),
    // Parent-set RSVP for the upcoming session. "Coming" gates the no-show
    // check-in fan-out (see scheduled-push-fanout.mjs); blank means the
    // parent has not declared yet. Surfaced here so the SPA can render the
    // current selection on the parent portal session card.
    rsvpStatus: stringValue(fields["RSVP Status"], "")
  };
}
async function findAttendance(sessionId, playerId) {
  const table = tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance", TABLE_IDS.ATTENDANCE);
  if (!hasAirtableConfig()) return null;
  const records = await airtableList(table, { pageSize: "100" });
  return records.find((record) => {
    const fields = record?.fields || {};
    const sessionLinks = Array.isArray(fields.Session) ? fields.Session : fields.Session ? [fields.Session] : [];
    const playerLinks = Array.isArray(fields.Player) ? fields.Player : fields.Player ? [fields.Player] : [];
    return sessionLinks.includes(sessionId) && playerLinks.includes(playerId);
  }) || null;
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

// netlify/functions/parent-actions.mjs
var CONSENT_KEY_TO_FIELDS = {
  photo: ["Photo Consent", "Photo Permission"],
  video: ["Video Consent", "Video Permission"],
  matchPhoto: ["Match Photo Consent", "Match Photo Permission"],
  matchVideo: ["Match Video Consent", "Match Video Permission"],
  website: ["Website Consent", "Website Permission"],
  social: ["Social Consent", "Social Permission"],
  highlights: ["Highlights Consent", "Highlight Permission", "Highlights/Reels Use"],
  internalReports: ["Internal Reports Consent", "Internal Coaching Use"],
  press: ["Press Consent", "Press/Partner Use"],
  emergencyContact: ["Emergency Contact Consent", "Emergency Contact Sharing"],
  medicalInformation: [
    "Medical Information Consent",
    "Medical Information Sharing"
  ]
};
function isUnknownFieldError(error) {
  if (!error || typeof error.message !== "string") return false;
  return error.message.includes("UNKNOWN_FIELD_NAME");
}
async function airtableUpdateWithFieldFallback(table, recordId, candidates, value) {
  let lastError = null;
  for (const fieldName of candidates) {
    try {
      return await airtableUpdate(table, recordId, { [fieldName]: value });
    } catch (error) {
      lastError = error;
      if (!isUnknownFieldError(error)) throw error;
      console.warn(
        `[parent-actions] Field "${fieldName}" not found on ${table}; trying next candidate.`
      );
    }
  }
  throw lastError || new Error("No matching consent field found on the Players table.");
}
var ALLOWED_PATHWAYS = /* @__PURE__ */ new Set([
  "Grassroots Football",
  "Academy Football",
  "School Football",
  "Not Currently With a Team",
  "Other / Unsure",
  ""
]);
var ALLOWED_LEAVE_REASONS = /* @__PURE__ */ new Set([
  "Moved Area",
  "Joined Another Club",
  "Finished Age Group",
  "Parent Request",
  "Other"
]);
var ALLOWED_RSVP_VALUES = /* @__PURE__ */ new Set(["Coming", "Not Coming", "Maybe", ""]);
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
async function loadOwnedPlayer({ playerId, parentEmail }) {
  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  const parentsTable = tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS);
  const [records, parentRecords] = await Promise.all([
    airtableList(playersTable, { pageSize: "100" }),
    airtableList(parentsTable, { pageSize: "100" })
  ]);
  const match = records.find((record) => record.id === playerId);
  if (!match) {
    return { error: json(404, { error: "Player not found." }) };
  }
  const normalised = normalisePlayer(match);
  const matchingGuardianIds = new Set(
    parentRecords.filter((record) => {
      const email = String(record?.fields?.Email || "").trim().toLowerCase();
      return email && email === parentEmail;
    }).map((record) => record.id)
  );
  const linkedToParent = Array.isArray(normalised.guardianIds) ? normalised.guardianIds.some((id) => matchingGuardianIds.has(id)) : false;
  if (normalised.parentEmail !== parentEmail && !linkedToParent) {
    return { error: json(403, { error: "You don't have permission to update this player." }) };
  }
  return { player: normalised, table: playersTable };
}
async function handleSetConsent({ playerId, body, parentEmail }) {
  const key = String(body.key || "").trim();
  if (!Object.prototype.hasOwnProperty.call(CONSENT_KEY_TO_FIELDS, key)) {
    return json(400, { error: "Unsupported consent key." });
  }
  if (typeof body.value !== "boolean") {
    return json(400, { error: "Consent value must be true or false." });
  }
  const owned = await loadOwnedPlayer({ playerId, parentEmail });
  if (owned.error) return owned.error;
  const candidates = CONSENT_KEY_TO_FIELDS[key];
  const updated = await airtableUpdateWithFieldFallback(
    owned.table,
    playerId,
    candidates,
    body.value
  );
  return json(200, { player: normalisePlayer(updated) });
}
async function handleSetPathway({ playerId, body, parentEmail }) {
  const value = String(body.value ?? "").trim();
  if (!ALLOWED_PATHWAYS.has(value)) {
    return json(400, { error: "Unsupported pathway value." });
  }
  const owned = await loadOwnedPlayer({ playerId, parentEmail });
  if (owned.error) return owned.error;
  const updated = await airtableUpdate(owned.table, playerId, {
    "Football Pathway": value || null
  });
  return json(200, { player: normalisePlayer(updated) });
}
async function handleRequestLeave({ playerId, body, parentEmail }) {
  const reason = String(body.reason || "").trim();
  if (!ALLOWED_LEAVE_REASONS.has(reason)) {
    return json(400, { error: "Please pick a leave reason." });
  }
  const notes = String(body.notes || "").trim();
  const owned = await loadOwnedPlayer({ playerId, parentEmail });
  if (owned.error) return owned.error;
  const updated = await airtableUpdate(owned.table, playerId, {
    Status: "Left",
    "Leave Requested": true,
    "Leave Requested At": nowIso(),
    "Leave Reason": reason,
    "Leave Notes": notes || null
  });
  return json(200, { player: normalisePlayer(updated) });
}
async function handleRequestErasure({ playerId, parentEmail }) {
  const owned = await loadOwnedPlayer({ playerId, parentEmail });
  if (owned.error) return owned.error;
  const updated = await airtableUpdate(owned.table, playerId, {
    "Erasure Requested": true,
    "Erasure Requested At": nowIso()
  });
  return json(200, { player: normalisePlayer(updated) });
}
async function handleSetRsvp({ playerId, body, parentEmail }) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) {
    return json(400, { error: "sessionId is required." });
  }
  const rawValue = body.value == null ? "" : String(body.value).trim();
  if (!ALLOWED_RSVP_VALUES.has(rawValue)) {
    return json(400, { error: "Unsupported RSVP value." });
  }
  const owned = await loadOwnedPlayer({ playerId, parentEmail });
  if (owned.error) return owned.error;
  const attendanceTable = tableName(
    "AIRTABLE_ATTENDANCE_TABLE",
    "Attendance",
    TABLE_IDS.ATTENDANCE
  );
  const writeValue = rawValue === "" ? null : rawValue;
  const existing = await findAttendance(sessionId, playerId);
  let updatedRecord;
  if (existing) {
    updatedRecord = await airtableUpdate(attendanceTable, existing.id, {
      "RSVP Status": writeValue
    });
  } else {
    if (writeValue === null) {
      return json(200, {
        attendance: {
          sessionId,
          playerId,
          rsvpStatus: ""
        }
      });
    }
    updatedRecord = await airtableCreate(attendanceTable, {
      Session: [sessionId],
      Player: [playerId],
      "RSVP Status": writeValue
    });
  }
  return json(200, { attendance: normaliseAttendance(updatedRecord) });
}
var handler = async (event) => {
  const method = (event.httpMethod || "PATCH").toUpperCase();
  if (method !== "PATCH") {
    return json(405, { error: `Method ${method} not allowed.` });
  }
  if (!hasAirtableConfig()) {
    return json(503, { error: "The portal is not available in demo mode." });
  }
  const gate = requireParentSession(event, json);
  if (gate.error) return gate.error;
  const parentEmail = normaliseEmail(gate.session.email);
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const playerId = String(body.playerId || "").trim();
  const action = String(body.action || "").trim();
  if (!playerId || !action) {
    return json(400, { error: "playerId and action are required." });
  }
  try {
    let response;
    if (action === "set-consent") response = await handleSetConsent({ playerId, body, parentEmail });
    else if (action === "set-pathway") response = await handleSetPathway({ playerId, body, parentEmail });
    else if (action === "request-leave") response = await handleRequestLeave({ playerId, body, parentEmail });
    else if (action === "request-erasure") response = await handleRequestErasure({ playerId, parentEmail });
    else if (action === "set-rsvp") response = await handleSetRsvp({ playerId, body, parentEmail });
    else response = json(400, { error: `Unknown action: ${action}` });
    return withRefreshedSessionCookie(response, parentEmail);
  } catch (error) {
    console.error("[parent-actions] Update failed:", error);
    return json(500, { error: "We couldn't save that change. Please try again." });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=parent-actions.js.map
