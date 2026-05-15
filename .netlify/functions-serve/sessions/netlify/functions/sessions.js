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

// netlify/functions/sessions.mjs
var sessions_exports = {};
__export(sessions_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(sessions_exports);

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
function boolValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["yes", "true", "approved", "allowed"].includes(value.toLowerCase());
  return Boolean(value);
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
function buildScanUrl(token2) {
  if (!token2) return "";
  const base = (process.env.SCAN_BASE_URL || process.env.URL || "https://grass2pro-coach-admin-staging.netlify.app").replace(/\/$/, "");
  return `${base}/scan?t=${encodeURIComponent(token2)}`;
}
function generateScanToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
async function listSessions({ scope = "upcoming" } = {}) {
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
  if (!hasAirtableConfig()) return demoSessions(scope);
  const params = { pageSize: "100" };
  params["sort[0][field]"] = "Date";
  params["sort[0][direction]"] = scope === "past" ? "desc" : "asc";
  const records = await airtableList(table, params);
  const all = records.map(normaliseSession);
  const now = /* @__PURE__ */ new Date();
  now.setHours(0, 0, 0, 0);
  const backfillTargets = records.filter((record, index) => {
    const session = all[index];
    if (session.scanToken) return false;
    if (!session.date) return true;
    return new Date(session.date) >= now;
  });
  if (backfillTargets.length > 0) {
    await Promise.allSettled(
      backfillTargets.map(async (record) => {
        const token2 = generateScanToken();
        try {
          await airtableUpdate(table, record.id, {
            "Scan Token": token2,
            "QR Code URL": buildScanUrl(token2)
          });
          const idx = records.indexOf(record);
          if (idx >= 0 && all[idx]) all[idx].scanToken = token2;
        } catch (err) {
          console.warn("Scan Token back-fill failed for", record.id, err?.message || err);
        }
      })
    );
  }
  if (scope === "all") return all;
  if (scope === "past") {
    return all.filter((s) => s.date && new Date(s.date) < now);
  }
  return all.filter((s) => !s.date || new Date(s.date) >= now);
}
function formatHumanDate(iso) {
  if (!iso) return "";
  const d = /* @__PURE__ */ new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
async function rescheduleSession(sessionId, { date, startTime, endTime, location, coach } = {}) {
  if (!sessionId) throw new Error("sessionId is required");
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
  const current = await airtableGet(table, sessionId);
  const before = current?.fields || {};
  const beforeDate = stringValue(before.Date);
  const beforeStart = stringValue(before["Start Time"]);
  const beforeEnd = stringValue(before["End Time"]);
  const beforeLocation = stringValue(before.Location);
  const beforeNotes = stringValue(before["Session Notes"]);
  const updates = {};
  const changes = [];
  if (date && date !== beforeDate) {
    updates.Date = date;
    changes.push(`date ${formatHumanDate(beforeDate) || "(none)"} \u2192 ${formatHumanDate(date)}`);
  }
  if (typeof startTime === "string" && startTime !== beforeStart) {
    updates["Start Time"] = startTime;
    changes.push(`start ${beforeStart || "(none)"} \u2192 ${startTime || "(cleared)"}`);
  }
  if (typeof endTime === "string" && endTime !== beforeEnd) {
    updates["End Time"] = endTime;
    changes.push(`end ${beforeEnd || "(none)"} \u2192 ${endTime || "(cleared)"}`);
  }
  if (typeof location === "string" && location !== beforeLocation) {
    updates.Location = location;
    changes.push(`location ${beforeLocation || "(none)"} \u2192 ${location || "(cleared)"}`);
  }
  if (changes.length === 0) {
    return normaliseSession(current);
  }
  const today = formatHumanDate((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const who = coach ? `, by ${coach}` : "";
  const auditLine = `[Rescheduled ${changes.join("; ")} on ${today}${who}]`;
  updates["Session Notes"] = beforeNotes ? `${auditLine}
${beforeNotes}` : auditLine;
  const updated = await airtableUpdate(table, sessionId, updates);
  return normaliseSession(updated);
}
async function cancelSession(sessionId, { reason, detail, coach } = {}) {
  if (!sessionId) throw new Error("sessionId is required");
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
  const current = await airtableGet(table, sessionId);
  const before = current?.fields || {};
  const beforeNotes = stringValue(before["Session Notes"]);
  const today = formatHumanDate((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const who = coach ? `, by ${coach}` : "";
  const reasonLabel = reason ? ` \u2014 ${reason}` : "";
  const detailLabel = detail ? ` (${detail})` : "";
  const auditLine = `[Cancelled${reasonLabel}${detailLabel} on ${today}${who}]`;
  const updates = {
    Status: "Cancelled",
    "Session Notes": beforeNotes ? `${auditLine}
${beforeNotes}` : auditLine
  };
  const updated = await airtableUpdate(table, sessionId, updates);
  return normaliseSession(updated);
}
async function editSession(sessionId, {
  name,
  date,
  startTime,
  endTime,
  location,
  pitchType,
  sessionFee,
  ageGroup,
  team,
  coach,
  notes,
  coachActor
} = {}) {
  if (!sessionId) throw new Error("sessionId is required");
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
  const current = await airtableGet(table, sessionId);
  const before = current?.fields || {};
  const beforeName = stringValue(before["Session Name"] || before.Name);
  const beforeDate = stringValue(before.Date);
  const beforeStart = stringValue(before["Start Time"]);
  const beforeEnd = stringValue(before["End Time"]);
  const beforeLocation = stringValue(before.Location);
  const beforePitchType = stringValue(before["Pitch Type"]);
  const beforeFee = typeof before["Session Fee"] === "number" ? before["Session Fee"] : null;
  const beforeAgeGroup = stringValue(before["Age Group"]);
  const beforeTeam = stringValue(before.Team);
  const beforeCoach = stringValue(before.Coach);
  const beforeNotes = stringValue(before["Session Notes"]);
  const updates = {};
  const significantChanges = [];
  if (typeof date === "string" && date && date !== beforeDate) {
    updates.Date = date;
    significantChanges.push(
      `date ${formatHumanDate(beforeDate) || "(none)"} \u2192 ${formatHumanDate(date)}`
    );
  }
  if (typeof startTime === "string" && startTime !== beforeStart) {
    updates["Start Time"] = startTime;
    significantChanges.push(`start ${beforeStart || "(none)"} \u2192 ${startTime || "(cleared)"}`);
  }
  if (typeof endTime === "string" && endTime !== beforeEnd) {
    updates["End Time"] = endTime;
    significantChanges.push(`end ${beforeEnd || "(none)"} \u2192 ${endTime || "(cleared)"}`);
  }
  if (typeof location === "string" && location !== beforeLocation) {
    updates.Location = location;
    significantChanges.push(`location ${beforeLocation || "(none)"} \u2192 ${location || "(cleared)"}`);
  }
  if (typeof pitchType === "string" && pitchType !== beforePitchType) {
    updates["Pitch Type"] = pitchType;
    significantChanges.push(`pitch ${beforePitchType || "(none)"} \u2192 ${pitchType || "(cleared)"}`);
  }
  if (typeof name === "string" && name && name !== beforeName) {
    updates["Session Name"] = name;
  }
  if (typeof sessionFee === "number" && Number.isFinite(sessionFee) && sessionFee !== beforeFee) {
    updates["Session Fee"] = sessionFee;
    if (sessionFee > 0) {
      updates["Charge Type"] = "Per Session";
      updates["Payment Required"] = true;
    }
  }
  if (typeof ageGroup === "string" && ageGroup !== beforeAgeGroup) {
    updates["Age Group"] = ageGroup;
  }
  if (typeof team === "string" && team !== beforeTeam) {
    updates.Team = team;
  }
  if (typeof coach === "string" && coach !== beforeCoach) {
    updates.Coach = coach;
  }
  const auditMatch = beforeNotes.match(/^((?:\[[^\]]+\]\n?)*)([\s\S]*)$/);
  const existingAudit = auditMatch ? auditMatch[1].trimEnd() : "";
  const existingBody = auditMatch ? auditMatch[2].trimStart() : beforeNotes;
  let newAuditLine = "";
  if (significantChanges.length > 0) {
    const today = formatHumanDate((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    const who = coachActor ? `, by ${coachActor}` : "";
    newAuditLine = `[Edited ${significantChanges.join("; ")} on ${today}${who}]`;
  }
  const nextBody = typeof notes === "string" ? notes.trim() : existingBody;
  const auditBlock = [existingAudit, newAuditLine].filter(Boolean).join("\n");
  const composedNotes = [auditBlock, nextBody].filter(Boolean).join("\n\n");
  const notesChanged = composedNotes !== beforeNotes;
  if (notesChanged) {
    updates["Session Notes"] = composedNotes;
  }
  if (Object.keys(updates).length === 0) {
    return normaliseSession(current);
  }
  const updated = await airtableUpdate(table, sessionId, updates, { typecast: true });
  return normaliseSession(updated);
}
async function createSession({
  name,
  date,
  startTime,
  endTime,
  location,
  pitchType,
  sessionFee,
  ageGroup,
  team,
  coach
} = {}) {
  if (!date) throw new Error("date is required");
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
  const fields = {
    "Session Name": name || deriveDefaultSessionName(date),
    Date: date,
    Status: "Upcoming",
    "Today's Session Type": "Training",
    "Check-in Enabled": true
  };
  const newToken = generateScanToken();
  fields["Scan Token"] = newToken;
  fields["QR Code URL"] = buildScanUrl(newToken);
  if (startTime) fields["Start Time"] = startTime;
  if (endTime) fields["End Time"] = endTime;
  if (location) fields.Location = location;
  if (pitchType) fields["Pitch Type"] = pitchType;
  if (typeof sessionFee === "number" && Number.isFinite(sessionFee)) {
    fields["Session Fee"] = sessionFee;
    fields["Charge Type"] = "Per Session";
    fields["Payment Required"] = true;
  }
  if (ageGroup) fields["Age Group"] = ageGroup;
  if (team) fields.Team = team;
  if (coach) fields.Coach = coach;
  const created = await airtableCreate(table, fields, { typecast: true });
  return normaliseSession(created);
}
function deriveDefaultSessionName(dateIso) {
  const d = /* @__PURE__ */ new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "New session";
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  return `${weekday} training`;
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

// netlify/functions/sessions.mjs
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
var TIME_RE = /^\d{1,2}:\d{2}$/;
var CANCEL_REASONS = /* @__PURE__ */ new Set([
  "Bad weather",
  "Not enough players",
  "Emergency",
  "Unforeseen circumstances"
]);
var PITCH_TYPES = /* @__PURE__ */ new Set(["Astro 4G", "Grass"]);
var handler = async (event) => {
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;
  const wrap = (res) => wrapCoachResponse(gate, res);
  if (event.httpMethod === "GET") return wrap(await handleList(event));
  if (event.httpMethod === "POST") return wrap(await handleCreate(event));
  if (event.httpMethod === "PATCH") return wrap(await handlePatch(event));
  if (event.httpMethod === "DELETE") return wrap(await handleCancel(event));
  return json(405, { error: "Method not allowed." });
};
async function handleList(event) {
  const scope = event.queryStringParameters?.scope || "upcoming";
  if (!["upcoming", "past", "all"].includes(scope)) {
    return json(400, { error: "Invalid scope. Use upcoming, past or all." });
  }
  try {
    const sessions = await listSessions({ scope });
    return json(200, { sessions, scope, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("Sessions list error:", error);
    if (!hasAirtableConfig()) {
      return json(200, {
        sessions: [],
        scope,
        warning: "Airtable not configured; returned empty list.",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return json(502, { error: "Sessions lookup failed." });
  }
}
async function handleCreate(event) {
  const payload = safeParse(event.body) || {};
  const date = typeof payload.date === "string" ? payload.date.trim() : "";
  if (!date || !DATE_RE.test(date)) {
    return json(400, { error: "date must be in yyyy-mm-dd format." });
  }
  const startTime = trimString(payload.startTime);
  const endTime = trimString(payload.endTime);
  if (startTime && !TIME_RE.test(startTime)) {
    return json(400, { error: "startTime must be in HH:mm format." });
  }
  if (endTime && !TIME_RE.test(endTime)) {
    return json(400, { error: "endTime must be in HH:mm format." });
  }
  const sessionFee = payload.sessionFee === "" || payload.sessionFee === null || payload.sessionFee === void 0 ? void 0 : Number(payload.sessionFee);
  if (sessionFee !== void 0 && (!Number.isFinite(sessionFee) || sessionFee < 0)) {
    return json(400, { error: "sessionFee must be a positive number." });
  }
  const rawPitchType = trimString(payload.pitchType);
  const pitchType = rawPitchType ? PITCH_TYPES.has(rawPitchType) ? rawPitchType : null : void 0;
  if (pitchType === null) {
    return json(400, { error: "pitchType must be one of: Astro 4G, Grass." });
  }
  if (!hasAirtableConfig()) {
    return json(200, {
      session: null,
      warning: "Airtable not configured; create was a no-op.",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  try {
    const session = await createSession({
      name: trimString(payload.name) || void 0,
      date,
      startTime: startTime || void 0,
      endTime: endTime || void 0,
      location: trimString(payload.location) || void 0,
      pitchType: pitchType || void 0,
      sessionFee,
      ageGroup: trimString(payload.ageGroup) || void 0,
      team: trimString(payload.team) || void 0,
      coach: trimString(payload.coach) || void 0
    });
    return json(200, { session, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("Sessions create error:", error);
    return json(502, {
      error: "Create session failed.",
      detail: error?.message || String(error)
    });
  }
}
async function handlePatch(event) {
  const id = sessionIdFrom(event);
  if (!id) return json(400, { error: "Missing session id." });
  const payload = safeParse(event.body) || {};
  const op = typeof payload.op === "string" ? payload.op : "reschedule";
  if (op === "edit") return handleEdit(id, payload);
  if (op === "reschedule") return handleReschedule(id, payload);
  return json(400, { error: 'op must be "edit" or "reschedule".' });
}
async function handleReschedule(id, payload) {
  const date = trimString(payload.date);
  const startTime = trimString(payload.startTime);
  const endTime = trimString(payload.endTime);
  const location = typeof payload.location === "string" ? payload.location.trim() : void 0;
  const coach = trimString(payload.coach) || void 0;
  if (date && !DATE_RE.test(date)) {
    return json(400, { error: "date must be in yyyy-mm-dd format." });
  }
  if (startTime && !TIME_RE.test(startTime)) {
    return json(400, { error: "startTime must be in HH:mm format." });
  }
  if (endTime && !TIME_RE.test(endTime)) {
    return json(400, { error: "endTime must be in HH:mm format." });
  }
  if (!hasAirtableConfig()) {
    return json(200, {
      session: null,
      warning: "Airtable not configured; reschedule was a no-op.",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  try {
    const session = await rescheduleSession(id, {
      date: date || void 0,
      startTime: startTime || void 0,
      endTime: endTime || void 0,
      location,
      coach
    });
    return json(200, { session, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("Sessions reschedule error:", error);
    return json(502, { error: "Reschedule failed." });
  }
}
async function handleEdit(id, payload) {
  const name = trimString(payload.name);
  const date = trimString(payload.date);
  const startTime = trimString(payload.startTime);
  const endTime = trimString(payload.endTime);
  const location = typeof payload.location === "string" ? payload.location.trim() : void 0;
  const ageGroup = typeof payload.ageGroup === "string" ? payload.ageGroup.trim() : void 0;
  const team = typeof payload.team === "string" ? payload.team.trim() : void 0;
  const coach = typeof payload.coach === "string" ? payload.coach.trim() : void 0;
  const notes = typeof payload.notes === "string" ? payload.notes : void 0;
  const coachActor = trimString(payload.coachActor) || void 0;
  if (date && !DATE_RE.test(date)) {
    return json(400, { error: "date must be in yyyy-mm-dd format." });
  }
  if (startTime && !TIME_RE.test(startTime)) {
    return json(400, { error: "startTime must be in HH:mm format." });
  }
  if (endTime && !TIME_RE.test(endTime)) {
    return json(400, { error: "endTime must be in HH:mm format." });
  }
  let sessionFee;
  if (payload.sessionFee !== "" && payload.sessionFee !== null && payload.sessionFee !== void 0) {
    const parsed = Number(payload.sessionFee);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return json(400, { error: "sessionFee must be a positive number." });
    }
    sessionFee = parsed;
  }
  let pitchType;
  if (typeof payload.pitchType === "string") {
    const trimmed = payload.pitchType.trim();
    if (trimmed === "") {
      pitchType = "";
    } else if (PITCH_TYPES.has(trimmed)) {
      pitchType = trimmed;
    } else {
      return json(400, { error: "pitchType must be one of: Astro 4G, Grass." });
    }
  }
  if (!hasAirtableConfig()) {
    return json(200, {
      session: null,
      warning: "Airtable not configured; edit was a no-op.",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  try {
    const session = await editSession(id, {
      name: name || void 0,
      date: date || void 0,
      startTime: typeof payload.startTime === "string" ? startTime : void 0,
      endTime: typeof payload.endTime === "string" ? endTime : void 0,
      location,
      pitchType,
      sessionFee,
      ageGroup,
      team,
      coach,
      notes,
      coachActor
    });
    return json(200, { session, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("Sessions edit error:", error);
    return json(502, {
      error: "Edit session failed.",
      detail: error?.message || String(error)
    });
  }
}
async function handleCancel(event) {
  const id = sessionIdFrom(event);
  if (!id) return json(400, { error: "Missing session id." });
  const payload = safeParse(event.body) || {};
  const rawReason = trimString(payload.reason);
  const reason = rawReason && CANCEL_REASONS.has(rawReason) ? rawReason : void 0;
  const detail = trimString(payload.detail) || (rawReason && !reason ? rawReason : void 0);
  const coach = trimString(payload.coach) || void 0;
  if (!hasAirtableConfig()) {
    return json(200, {
      session: null,
      warning: "Airtable not configured; cancel was a no-op.",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  try {
    const session = await cancelSession(id, { reason, detail, coach });
    return json(200, { session, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("Sessions cancel error:", error);
    return json(502, { error: "Cancel failed." });
  }
}
function sessionIdFrom(event) {
  return event.queryStringParameters?.id || safeParse(event.body)?.id || null;
}
function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function safeParse(body) {
  if (!body || typeof body !== "string") return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=sessions.js.map
