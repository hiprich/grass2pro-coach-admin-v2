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

// netlify/functions/parent-scan-resolve.mjs
var parent_scan_resolve_exports = {};
__export(parent_scan_resolve_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(parent_scan_resolve_exports);

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
function stringValue(value, fallback = "") {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === void 0 || value === null) return fallback;
  return String(value);
}
function boolValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["yes", "true", "approved", "allowed"].includes(value.toLowerCase());
  return Boolean(value);
}
function inferSessionState(rawStatus, dateIso) {
  const status = String(rawStatus || "").toLowerCase();
  if (status.includes("cancel")) return "cancelled";
  if (status.includes("complete") || status.includes("done")) return "completed";
  if (status.includes("schedule") || status.includes("upcoming") || status.includes("planned")) return "scheduled";
  if (!status && dateIso) {
    const date = new Date(dateIso);
    if (!Number.isNaN(date.getTime()) && date.getTime() < Date.now() - 6 * 60 * 60 * 1e3) return "completed";
  }
  return "scheduled";
}
function inferSessionType(rawType) {
  const type = String(rawType || "").toLowerCase();
  if (type.includes("match")) return "match";
  if (type.includes("trial")) return "trial";
  if (type.includes("festival") || type.includes("tournament")) return "festival";
  return "training";
}
function normaliseSession(record) {
  const fields = record?.fields || {};
  const date = stringValue(fields.Date || fields["Session Date"]);
  return {
    id: record?.id || crypto.randomUUID(),
    name: stringValue(fields["Session Name"] || fields.Name, "Untitled session"),
    date,
    startTime: stringValue(fields["Start Time"] || fields.Start, ""),
    endTime: stringValue(fields["End Time"] || fields.End, ""),
    location: stringValue(fields.Location || fields.Venue, ""),
    team: stringValue(fields.Team || fields.Squad, ""),
    ageGroup: stringValue(fields["Age Group"] || fields.AgeGroup, ""),
    coach: stringValue(fields.Coach || fields["Lead Coach"], ""),
    type: inferSessionType(fields["Today's Session Type"] || fields["Session Type"] || fields.Type),
    state: inferSessionState(fields.Status || fields.State, date),
    notes: stringValue(fields["Session Notes"] || fields.Notes || fields["Coach Notes"], ""),
    checkInEnabled: boolValue(fields["Check-in Enabled"]),
    qrFallbackCode: stringValue(fields["QR Fallback Code"]),
    // Per-session bearer token for the parent scan flow (Phase A). One token
    // per session, valid for both Arrival and Departure phases. Empty when
    // the row pre-dates Phase A — sessions.mjs lazily back-fills on read.
    scanToken: stringValue(fields["Scan Token"], ""),
    playerIds: Array.isArray(fields.Players) ? fields.Players : [],
    // Pitch surface — drives kit, ball-pressure and weather-call decisions.
    // Empty string when the field hasn't been populated (e.g. legacy rows or
    // bases where the singleSelect hasn't been added in Airtable yet).
    pitchType: stringValue(fields["Pitch Type"], ""),
    // Session fee in £. Surfaced so the Edit dialog can pre-fill the input;
    // null when not set so the input shows as empty rather than "0".
    sessionFee: typeof fields["Session Fee"] === "number" ? fields["Session Fee"] : null
  };
}
async function findSessionByScanToken(token2) {
  if (!token2 || typeof token2 !== "string") return null;
  if (!hasAirtableConfig()) {
    const demo = demoSessions("all").find((s) => s.scanToken === token2);
    return demo || null;
  }
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
  const safe = token2.replace(/'/g, "\\'");
  const records = await airtableList(table, {
    filterByFormula: `{Scan Token} = '${safe}'`,
    maxRecords: "1",
    pageSize: "1"
  });
  if (!records.length) return null;
  return normaliseSession(records[0]);
}
function demoSessions(scope = "upcoming") {
  const today = /* @__PURE__ */ new Date();
  const iso = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  const all = [
    {
      id: "ses_demo_01",
      name: "U11 West - Technical Training",
      date: iso(2),
      startTime: "17:30",
      endTime: "19:00",
      location: "Pitch 3, Hackney Marshes",
      team: "Grass2Pro West",
      ageGroup: "U11",
      coach: "Kobby Mensah",
      type: "training",
      state: "scheduled",
      notes: "Demo session \u2014 Airtable env vars not set.",
      checkInEnabled: true,
      qrFallbackCode: "DEMO-U11-WEST",
      scanToken: "demo_token_u11west_aaaaaaaaaaaa",
      playerIds: []
    },
    {
      id: "ses_demo_02",
      name: "U8 Juniors - Skills Session",
      date: iso(3),
      startTime: "16:00",
      endTime: "17:00",
      location: "Community Astro, Hackney",
      team: "Grass2Pro Juniors",
      ageGroup: "U8",
      coach: "Kobby Mensah",
      type: "training",
      state: "scheduled",
      notes: "Demo session \u2014 Airtable env vars not set.",
      checkInEnabled: true,
      qrFallbackCode: "DEMO-U8-JR",
      scanToken: "demo_token_u8jrs_bbbbbbbbbbbbbb",
      playerIds: []
    },
    {
      id: "ses_demo_03",
      name: "U11 West - Tactical Review",
      date: iso(-7),
      startTime: "17:30",
      endTime: "18:45",
      location: "Pitch 3, Hackney Marshes",
      team: "Grass2Pro West",
      ageGroup: "U11",
      coach: "Kobby Mensah",
      type: "training",
      state: "completed",
      notes: "Demo session \u2014 Airtable env vars not set.",
      checkInEnabled: false,
      qrFallbackCode: "",
      scanToken: "",
      playerIds: []
    }
  ];
  if (scope === "all") return all;
  if (scope === "past") return all.filter((s) => s.state === "completed");
  return all.filter((s) => s.state === "scheduled");
}

// netlify/functions/parent-scan-resolve.mjs
var SESSION_GRACE_MS = 0;
var CHECKIN_OPEN_LEAD_MS = 30 * 60 * 1e3;
var DEPARTURE_LEAD_MS = 15 * 60 * 1e3;
var PHASE_LABEL = {
  arrival: "Arrival check-in open",
  departure: "Departure check-in open",
  upcoming: "Check-in not open yet",
  closed: "Session check-in closed"
};
var handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "Method not allowed." });
  }
  const token2 = (event.queryStringParameters?.t || event.queryStringParameters?.token || "").trim();
  if (!token2) {
    return json(400, { ok: false, error: "Missing scan token." });
  }
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token2)) {
    return json(404, { ok: false, error: "Invalid scan token." });
  }
  let session;
  try {
    session = await findSessionByScanToken(token2);
  } catch (error) {
    console.error("Scan resolve lookup failed:", error);
    if (!hasAirtableConfig()) {
      return json(503, {
        ok: false,
        error: "Scan service not configured."
      });
    }
    return json(502, { ok: false, error: "Unable to resolve scan token." });
  }
  if (!session) {
    return json(404, { ok: false, error: "Scan token not recognised." });
  }
  if (session.state === "cancelled") {
    return json(404, { ok: false, error: "Scan token not recognised." });
  }
  const startsAt = parseSessionDateTime(session.date, session.startTime);
  const endsAt = parseSessionDateTime(session.date, session.endTime);
  if (!startsAt || !endsAt) {
    return json(409, {
      ok: false,
      error: "Session times are not set yet \u2014 please ask the coach."
    });
  }
  const phase = computePhase(startsAt, endsAt, /* @__PURE__ */ new Date());
  const coachName = (session.coach || "").trim() || "Grass2Pro";
  const teamName = (session.team || "").trim();
  return json(200, {
    ok: true,
    sessionId: session.id,
    coachName,
    teamName,
    ageGroup: session.ageGroup || "",
    location: session.location || "",
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    phase,
    phaseLabel: PHASE_LABEL[phase],
    fallbackCode: session.qrFallbackCode || ""
  });
};
function parseSessionDateTime(date, time) {
  if (!date || !/^\d{2}:\d{2}$/.test(time || "")) return null;
  const d = /* @__PURE__ */ new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function computePhase(startsAt, endsAt, now) {
  const t = now.getTime();
  const arrivalOpens = startsAt.getTime() - CHECKIN_OPEN_LEAD_MS;
  const departureOpens = endsAt.getTime() - DEPARTURE_LEAD_MS;
  const departureCloses = endsAt.getTime() + SESSION_GRACE_MS;
  if (t < arrivalOpens) return "upcoming";
  if (t < departureOpens) return "arrival";
  if (t < departureCloses) return "departure";
  return "closed";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=parent-scan-resolve.js.map
