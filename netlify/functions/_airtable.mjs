const AIRTABLE_API = "https://api.airtable.com/v0";

export const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

export const demoData = {
  coach: {
    id: "rec_demo_coach",
    name: "Kobby Mensah",
    role: "Grassroots coach admin",
    credential: "FA Level 1 | DBS checked",
    email: "coach@grass2pro.com",
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
      progressScore: 84,
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
      progressScore: 71,
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
      progressScore: 48,
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
      progressScore: 67,
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
      progressScore: 76,
    },
  ],
  sidebar: [
    { id: "overview", label: "Overview", count: 5, icon: "home" },
    { id: "players", label: "Players", count: 5, icon: "users" },
    { id: "sessions", label: "Sessions", count: 0, icon: "calendar" },
    { id: "attendance", label: "Attendance", count: 0, icon: "clipboard" },
    { id: "safeguarding", label: "Safeguarding", count: 2, icon: "shield" },
    { id: "payments", label: "Payments", count: 0, icon: "pound" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" },
  ],
  updatedAt: new Date().toISOString(),
};

export function hasAirtableConfig() {
  return Boolean((process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY) && process.env.AIRTABLE_BASE_ID);
}

// Resolve the Airtable table identifier for a given env key.
//
// Two env vars are honoured for every table: the existing `<KEY>` (a table
// *name* like "Parents/Guardians") and `<KEY>_ID` (an Airtable table id like
// "tblC9YZ2eI0rK1KFc"). The ID form is preferred when set because it is
// stable across renames and avoids the URL-encoding pitfalls of names that
// contain "/" or other reserved characters. When neither env var is set we
// fall back to the supplied default name (or, when provided, default ID).
export function tableName(key, fallbackName, fallbackId) {
  const idEnv = process.env[`${key}_ID`];
  if (idEnv) return idEnv;
  const nameEnv = process.env[key];
  if (nameEnv) return nameEnv;
  if (fallbackId) return fallbackId;
  return fallbackName;
}

// Known Airtable table IDs for this base. These are used as the ultimate
// fallback so a fresh deployment without any AIRTABLE_*_TABLE env vars still
// hits the right tables, even when the human-readable name contains a "/" or
// other reserved character that the Airtable API would otherwise reject.
export const TABLE_IDS = {
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
};

function token() {
  return process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
}

// Airtable table identifiers always start with "tbl" followed by alphanumerics.
// When the caller passes a raw table id we use it verbatim — it contains no
// reserved characters and Airtable rejects any percent-encoding inside the id.
function looksLikeTableId(value) {
  return typeof value === "string" && /^tbl[a-zA-Z0-9]{10,}$/.test(value);
}

// Encode a table identifier for use as a single URL path segment.
//
// Table NAMES may legitimately contain "/" (e.g. "Parents/Guardians"), spaces,
// "&", "?" etc. Splitting on "/" and joining the encoded parts back with a
// literal "/" — as the previous implementation did — caused Airtable to
// resolve the path as two separate segments and return NOT_FOUND. We instead
// percent-encode the whole identifier so reserved characters survive the trip
// to Airtable. Table IDs (tbl...) are returned untouched because they are
// already URL-safe and Airtable expects them verbatim.
function encodeTable(table) {
  if (looksLikeTableId(table)) return table;
  return encodeURIComponent(table);
}

export async function airtableList(table, params = {}) {
  if (!hasAirtableConfig()) {
    throw new Error("Airtable environment variables are not configured.");
  }

  const url = new URL(`${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${encodeTable(table)}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable list failed for ${table}: ${body}`);
  }

  const payload = await response.json();
  return payload.records || [];
}

export class AirtableHttpError extends Error {
  constructor(message, { status, body, table } = {}) {
    super(message);
    this.name = "AirtableHttpError";
    this.status = status;
    this.body = body;
    this.table = table;
  }
}

export async function airtableCreate(table, fields, options = {}) {
  if (!hasAirtableConfig()) {
    return { id: `demo_${Date.now()}`, fields, demo: true };
  }

  const body = { fields };
  // typecast lets Airtable accept singleSelect/multipleSelects values that are
  // not yet in the field's choice list and add them on the fly. We use it for
  // Media Consents so renaming the "Consent Type" chips to purpose-level
  // labels (e.g. "Photos during sessions") doesn't fail with
  // INVALID_MULTIPLE_CHOICE_OPTIONS the first time a new label is written.
  if (options.typecast) body.typecast = true;

  const response = await fetch(`${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${encodeTable(table)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AirtableHttpError(`Airtable create failed for ${table}: ${body}`, {
      status: response.status,
      body,
      table,
    });
  }

  return response.json();
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
  if (value === undefined || value === null) return fallback;
  return String(value);
}

// Airtable linked-record fields return arrays of record IDs (e.g.
// "rec0faJqj2SUI6tiH"). Lookup fields backed by linked records return arrays
// of the looked-up display value(s). When we want a human-readable name we
// must skip values that look like raw record IDs, otherwise the UI shows the
// rec... ID instead of the player/session name.
function looksLikeRecordId(value) {
  return typeof value === "string" && /^rec[a-zA-Z0-9]{14,}$/.test(value);
}

// Extract the set of Airtable record IDs from a linked-record-style value.
// Linked-record fields normally come back as arrays of "rec..." IDs, but the
// admin-data payload has historically stringified them via stringValue, so
// downstream consumers may also pass us a comma-separated string. Handle both
// shapes, drop anything that isn't an Airtable record id, and de-duplicate.
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
  if (value === undefined || value === null || value === "") return fallback;
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

export function normaliseCoach(record) {
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
  };
}

export function normalisePlayer(record) {
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
      fields["Match Photo Consent"] || fields["Match Photo Permission"],
    ),
    matchVideoConsent: boolValue(
      fields["Match Video Consent"] || fields["Match Video Permission"],
    ),
    websiteConsent: boolValue(fields["Website Consent"] || fields["Website Permission"]),
    socialConsent: boolValue(fields["Social Consent"] || fields["Social Permission"]),
    highlightsConsent: boolValue(fields["Highlights Consent"] || fields["Highlight Permission"]),
    internalReportsConsent: boolValue(
      fields["Internal Reports Consent"] || fields["Internal Coaching Use"],
    ),
    pressConsent: boolValue(fields["Press Consent"] || fields["Press/Partner Use"]),
    emergencyContactConsent: boolValue(
      fields["Emergency Contact Consent"] || fields["Emergency Contact Sharing"],
    ),
    medicalInformationConsent: boolValue(
      fields["Medical Information Consent"] || fields["Medical Information Sharing"],
    ),
    reviewDue: stringValue(fields["Review Due"] || fields["Next Review"], new Date().toISOString()),
    progressScore: numberValue(fields["Progress Score"] || fields.Progress, 0),
  };
}

export function buildSidebar(players, counts = {}) {
  const needsAction = players.filter((player) => player.consentStatus === "red" || player.consentStatus === "grey").length;
  // Always emit the full operational navigation so the dashboard can render a
  // stable sidebar even when some counts are not yet known. Sessions,
  // Attendance and Payments are sourced from their own endpoints; the
  // frontend backfills/overrides these counts from the live data it loads.
  return [
    { id: "overview", label: "Overview", count: players.length, icon: "home" },
    { id: "players", label: "Players", count: players.length, icon: "users" },
    { id: "sessions", label: "Sessions", count: counts.sessions ?? 0, icon: "calendar" },
    { id: "attendance", label: "Attendance", count: counts.attendance ?? 0, icon: "clipboard" },
    { id: "safeguarding", label: "Safeguarding", count: needsAction, icon: "shield" },
    { id: "payments", label: "Payments", count: counts.payments ?? 0, icon: "pound" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" },
  ];
}

export async function getCoachAndPlayers() {
  if (!hasAirtableConfig()) return demoData;

  const coachParams = { maxRecords: "1" };
  if (process.env.AIRTABLE_COACH_FILTER) coachParams.filterByFormula = process.env.AIRTABLE_COACH_FILTER;

  const [coachRecords, playerRecords] = await Promise.all([
    airtableList(tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES), coachParams),
    airtableList(tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS), { pageSize: "100" }),
  ]);

  const coach = normaliseCoach(coachRecords[0]);
  const players = playerRecords.map(normalisePlayer);

  return {
    coach,
    players,
    sidebar: buildSidebar(players),
    updatedAt: new Date().toISOString(),
  };
}

// ---------- Sessions / Attendance / QR Check-ins ----------

export async function airtableGet(table, recordId) {
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

export async function airtableUpdate(table, recordId, fields) {
  if (!hasAirtableConfig()) {
    return { id: recordId || `demo_${Date.now()}`, fields, demo: true };
  }
  const url = `${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${encodeTable(table)}/${encodeURIComponent(recordId)}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable update failed for ${table}/${recordId}: ${body}`);
  }
  return response.json();
}

function escapeFormulaString(value) {
  return String(value).replace(/'/g, "\\'");
}

function inferSessionState(rawStatus, dateIso) {
  const status = String(rawStatus || "").toLowerCase();
  if (status.includes("cancel")) return "cancelled";
  if (status.includes("complete") || status.includes("done")) return "completed";
  if (status.includes("schedule") || status.includes("upcoming") || status.includes("planned")) return "scheduled";
  if (!status && dateIso) {
    const date = new Date(dateIso);
    if (!Number.isNaN(date.getTime()) && date.getTime() < Date.now() - 6 * 60 * 60 * 1000) return "completed";
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

function inferAttendanceStatus(raw, fields) {
  const status = String(raw || "").toLowerCase();
  if (status.includes("present")) return "present";
  if (status.includes("late")) return "late";
  if (status.includes("absent")) return "absent";
  if (status.includes("injur")) return "injured";
  if (status.includes("excus")) return "excused";
  // Fall back from times.
  if (fields && (fields["Arrival Time"] || fields["Departure Time"])) return "present";
  return "absent";
}

export function normaliseSession(record) {
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
    playerIds: Array.isArray(fields.Players) ? fields.Players : [],
  };
}

export function normaliseAttendance(record) {
  const fields = record?.fields || {};
  const sessionLink = Array.isArray(fields.Session) ? fields.Session[0] : fields.Session;
  const playerLink = Array.isArray(fields.Player) ? fields.Player[0] : fields.Player;
  // Prefer the lookup column "Player Name (from Player)" — Airtable returns
  // the looked-up display name there. The bare "Player" field is the linked
  // record array of rec... IDs, which is not human-readable.
  const playerName =
    readableValue(fields["Player Name (from Player)"]) ||
    readableValue(fields["Player Name"]) ||
    readableValue(fields["Player Full Name"]) ||
    stringValue(playerLink, "");
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
  };
}

// Find existing Attendance record for (session, player). ARRAYJOIN against a
// linked-record field returns the *primary field* values of the linked rows,
// not their record IDs, so a SEARCH for `recXXXX...` against ARRAYJOIN({Player})
// silently returns no matches even when the row exists. Instead we list
// attendance for the session (via the REST API, which returns linked-record
// fields as arrays of IDs) and match the player ID in code.
export async function findAttendance(sessionId, playerId) {
  const table = tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance", TABLE_IDS.ATTENDANCE);
  if (!hasAirtableConfig()) return null;

  const records = await airtableList(table, { pageSize: "100" });
  return (
    records.find((record) => {
      const fields = record?.fields || {};
      const sessionLinks = Array.isArray(fields.Session) ? fields.Session : fields.Session ? [fields.Session] : [];
      const playerLinks = Array.isArray(fields.Player) ? fields.Player : fields.Player ? [fields.Player] : [];
      return sessionLinks.includes(sessionId) && playerLinks.includes(playerId);
    }) || null
  );
}

export async function listSessions({ scope = "upcoming" } = {}) {
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
  if (!hasAirtableConfig()) return demoSessions(scope);
  const params = { pageSize: "100" };
  // Sort upcoming first by date.
  params["sort[0][field]"] = "Date";
  params["sort[0][direction]"] = scope === "past" ? "desc" : "asc";
  const records = await airtableList(table, params);
  const all = records.map(normaliseSession);
  if (scope === "all") return all;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (scope === "past") {
    return all.filter((s) => s.date && new Date(s.date) < today);
  }
  return all.filter((s) => !s.date || new Date(s.date) >= today);
}

// Format a yyyy-mm-dd date string into a short, human-readable label like
// "04 May 2026". Used by rescheduleSession() to write a clear audit note.
function formatHumanDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Reschedule (or relocate) a session. Updates Date / Start Time / End Time /
// Location and prepends an audit line to Session Notes so coaches and parents
// can see the change history. Returns the normalised session.
export async function rescheduleSession(
  sessionId,
  { date, startTime, endTime, location, coach } = {},
) {
  if (!sessionId) throw new Error("sessionId is required");
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);

  // Pull the current record so we can build the audit line and only patch
  // fields that actually changed.
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

  // Prepend an audit line. Keep it terse so the notes column stays readable
  // even after several reschedules.
  const today = formatHumanDate(new Date().toISOString().slice(0, 10));
  const who = coach ? `, by ${coach}` : "";
  const auditLine = `[Rescheduled ${changes.join("; ")} on ${today}${who}]`;
  updates["Session Notes"] = beforeNotes ? `${auditLine}\n${beforeNotes}` : auditLine;

  const updated = await airtableUpdate(table, sessionId, updates);
  return normaliseSession(updated);
}

export async function listAttendance({ sessionId } = {}) {
  const table = tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance", TABLE_IDS.ATTENDANCE);
  if (!hasAirtableConfig()) return demoAttendance();
  const params = { pageSize: "100" };
  if (sessionId) {
    params.filterByFormula = `SEARCH('${escapeFormulaString(sessionId)}', ARRAYJOIN({Session}))`;
  }
  const records = await airtableList(table, params);
  return records.map(normaliseAttendance);
}

// ---------- Media Consents ----------
//
// The Media Consents table is the source of truth for what permissions a
// parent has actually granted. The Players table has its own Photo/Video
// Consent checkboxes for legacy/manual use, but new submissions only land in
// Media Consents. The Overview mini-cards (and the Players page consent
// badges) need to reflect the latest Media Consents row per player so a
// freshly submitted consent shows up immediately.
//
// We pick the most recent row per linked Player record. Rows where the
// parent later set "Withdrawal Requested" override an earlier Active grant
// and are treated as withdrawn (red).
export async function listMediaConsents() {
  const table = tableName("AIRTABLE_MEDIA_CONSENTS_TABLE", "Media Consents", TABLE_IDS.MEDIA_CONSENTS);
  if (!hasAirtableConfig()) return [];
  const params = { pageSize: "100" };
  const records = await airtableList(table, params);
  return records;
}

function mediaConsentTimestamp(record) {
  const fields = record?.fields || {};
  const raw =
    fields["Submitted At"] ||
    fields["Submission Date"] ||
    fields["Date Submitted"] ||
    fields["Created"] ||
    record?.createdTime ||
    "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Read the "Consent Type" multipleSelects field as a normalised list of lower-
// case chip values. Older or partially-filled consent rows in Airtable may
// only have these chips populated (e.g. "Media/photo/video", "Match reports",
// "Website/social media") with the matching Photo/Video/Website checkboxes
// left blank, so we rely on the chips as a parallel signal.
function consentTypeChips(record) {
  const raw = record?.fields?.["Consent Type"];
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => String(value || "").toLowerCase().trim()).filter(Boolean);
}

// Each chip matcher accepts both the legacy broad/grouped chip values
// ("Media/photo/video", "Match reports", "Website/social media") that early
// consent rows were saved with AND the purpose-level labels ("Photos during
// sessions", "Video for coaching review", "Parent progress reports", "Club
// website", "Social media", "Press/partner use") used by current submissions.
// Older records continue to read correctly while new rows store the more
// specific labels the parent actually saw on the form.
//
// Match permissions are now distinct from session/coaching-review permissions
// — "Photos during matches" must NOT imply "Photos during sessions" and vice
// versa. The matchers below are written so the session and match chips only
// match the chip the parent actually ticked. Legacy bundled chips (e.g.
// "Media/photo/video") are still treated as session-only photo + coaching
// review video grants because match was never offered as a separate option
// when those rows were saved.
function chipImpliesPhoto(chips) {
  // Session photos. Match a chip ONLY when it explicitly references sessions
  // or training, or when it is a legacy bundled chip from before the match
  // split. "Photos during matches" must not satisfy this — that chip is
  // captured by chipImpliesMatchPhoto below.
  return chips.some((chip) => {
    if (chip.includes("match")) return false;
    return (
      chip === "photos during sessions" ||
      chip === "photos during training" ||
      chip.includes("session photo") ||
      chip.includes("training photo") ||
      chip.includes("media/") ||
      chip === "media" ||
      chip.includes("image") ||
      // Bare "photo" / "photos" chips predate the match split — treat them
      // as session-only photo grants.
      chip === "photo" ||
      chip === "photos"
    );
  });
}

function chipImpliesMatchPhoto(chips) {
  return chips.some(
    (chip) =>
      chip === "photos during matches" ||
      chip === "match photos" ||
      chip.includes("match photo") ||
      chip.includes("photos during match") ||
      chip.includes("photos at match") ||
      chip.includes("matchday photo") ||
      chip.includes("match-day photo"),
  );
}

function chipImpliesVideo(chips) {
  // Video for coaching review (training analysis). Match-only video chips
  // ("Video during matches") must not satisfy this — that grant is captured
  // by chipImpliesMatchVideo below.
  return chips.some((chip) => {
    if (chip.includes("during match") || chip.includes("match video") || chip === "match videos") {
      return false;
    }
    return (
      chip === "video for coaching review" ||
      chip.includes("coaching review") ||
      chip.includes("media/") ||
      chip === "media" ||
      // Bare "video" / "videos" chips predate the match split — treat them
      // as coaching-review-only video grants.
      chip === "video" ||
      chip === "videos"
    );
  });
}

function chipImpliesMatchVideo(chips) {
  return chips.some(
    (chip) =>
      chip === "video during matches" ||
      chip === "match video" ||
      chip === "match videos" ||
      chip.includes("match video") ||
      chip.includes("video during match") ||
      chip.includes("video at match") ||
      chip.includes("matchday video") ||
      chip.includes("match-day video"),
  );
}

function chipImpliesWebsite(chips) {
  return chips.some(
    (chip) =>
      chip.includes("website") ||
      chip.includes("club website") ||
      chip.includes("club site"),
  );
}

function chipImpliesSocial(chips) {
  return chips.some((chip) => chip.includes("social"));
}

function chipImpliesHighlights(chips) {
  return chips.some((chip) => chip.includes("highlight") || chip.includes("reel"));
}

// Derive the Overview booleans from a Media Consents row, preferring the
// explicit Airtable checkboxes but falling back to the Consent Type chips
// when a checkbox is blank. The chips are how partial submissions surface in
// the Airtable grid, so treating them as authoritative keeps the dashboard
// honest about what was granted.
//
// Match-only permissions (matchPhotoConsent / matchVideoConsent) are derived
// from chips alone for now. Optional `Match Photo Permission` and
// `Match Video Permission` Airtable checkbox fields are read when present so
// the integration upgrades transparently if those columns are added later.
function permissionsFromMediaConsent(record) {
  const fields = record?.fields || {};
  const chips = consentTypeChips(record);
  return {
    photoConsent: boolValue(fields["Photo Permission"]) || chipImpliesPhoto(chips),
    videoConsent: boolValue(fields["Video Permission"]) || chipImpliesVideo(chips),
    matchPhotoConsent:
      boolValue(fields["Match Photo Permission"]) || chipImpliesMatchPhoto(chips),
    matchVideoConsent:
      boolValue(fields["Match Video Permission"]) || chipImpliesMatchVideo(chips),
    websiteConsent: boolValue(fields["Website Use"]) || chipImpliesWebsite(chips),
    socialConsent: boolValue(fields["Social Media Use"]) || chipImpliesSocial(chips),
    highlightsConsent: boolValue(fields["Highlights/Reels Use"]) || chipImpliesHighlights(chips),
    internalReportsConsent:
      boolValue(fields["Internal Coaching Use"]) ||
      chips.some(
        (chip) =>
          chip.includes("match report") ||
          chip.includes("internal") ||
          chip.includes("progress report") ||
          chip.includes("coaching review"),
      ),
    pressConsent:
      boolValue(fields["Press/Partner Use"]) ||
      chips.some((chip) => chip.includes("press") || chip.includes("partner")),
    // Information-sharing grants live on the same row as the media chips. They
    // are independent of media consent status but the dashboard still needs to
    // surface them so coaches can see exactly what each parent agreed to.
    emergencyContactConsent:
      boolValue(fields["Emergency Contact Sharing"]) ||
      chips.some((chip) => chip.includes("emergency contact")),
    medicalInformationConsent:
      boolValue(fields["Medical Information Sharing"]) ||
      chips.some((chip) => chip.includes("medical")),
  };
}

function consentStatusFromMediaConsent(record) {
  const fields = record?.fields || {};
  if (boolValue(fields["Withdrawal Requested"])) return "red";
  const withdrawalDate = stringValue(fields["Withdrawal Date"]);
  if (withdrawalDate) return "red";

  const explicit = stringValue(fields["Consent Status"]).toLowerCase();
  if (explicit.includes("withdraw")) return "red";

  // Permission flags drive Active/Limited. The set mirrors the media
  // permissions the consent form exposes today: photos during sessions,
  // photos during matches, video for coaching review, video during matches,
  // internal progress reports, website, social media, and press/partner.
  // Information-sharing toggles (emergency contact / medical) are an
  // independent grant and intentionally NOT included. "Highlights/Reels" is
  // also excluded — it is a legacy Airtable column with no matching form
  // option, so requiring it would make Active unreachable for current
  // submissions.
  const perms = permissionsFromMediaConsent(record);
  const flags = [
    perms.photoConsent,
    perms.videoConsent,
    perms.matchPhotoConsent,
    perms.matchVideoConsent,
    perms.websiteConsent,
    perms.socialConsent,
    perms.internalReportsConsent,
    perms.pressConsent,
  ];
  const granted = flags.filter(Boolean).length;
  const allGranted = granted === flags.length;

  // Trust the explicit status only when the underlying permissions back it
  // up. Earlier rows in Airtable were sometimes stamped "Active" with only a
  // partial permission set (e.g. coaching review video + internal reports),
  // which is exactly the bug we're fixing — never promote those to green.
  // A row stamped "Active" with the full permission set still resolves to
  // green via the permission check below; "Limited" rows resolve to amber the
  // same way when at least one permission is granted.
  if (explicit === "active" && allGranted) return "green";

  // A current Media Consent record exists for this player. Even when the
  // explicit status reads "Needs Review" or is blank, a row with at least one
  // granted permission is a Limited consent — not a missing record. Only fall
  // through to "grey" when nothing at all has been granted and the explicit
  // status is missing or signals "needs review".
  //
  // "Active" requires every media permission, including the new match-
  // specific chips. Anything in between is Limited.
  if (allGranted) return "green";
  if (granted > 0) return "amber";
  if (explicit === "limited") return "amber";
  if (explicit.includes("needs review") || explicit.includes("not")) return "grey";
  return "grey";
}

function consentRecordChildName(record) {
  const fields = record?.fields || {};
  // The Media Consents form writes the child name into the "Consent Record"
  // primary field as "Child - Parent - Consent - DD/MM/YYYY HH:mm". When the
  // row is also linked to a Player, the linked record id is what we match on
  // first; this name fallback covers consent rows that failed player lookup.
  const label = stringValue(fields["Consent Record"]);
  if (label) {
    const head = label.split(" - ")[0];
    if (head) return head.trim().toLowerCase();
  }
  const direct = stringValue(fields["Child Name"] || fields.Child || fields["Player Name"]);
  return direct ? direct.trim().toLowerCase() : "";
}

// Pick the most recent Media Consents record per player. We index by linked
// Player record id when the consent row has one, by Parent/Guardian record id
// for rows that omit the Player link (the consent form sometimes submits with
// only the guardian populated), and by lowercased child name as a final
// fallback so consent submissions whose player lookup failed at submit time
// still flow through to the dashboard.
export function indexLatestMediaConsents(records) {
  const byPlayerId = new Map();
  const byGuardianId = new Map();
  const byChildName = new Map();
  const upsert = (map, key, record, ts) => {
    if (!key) return;
    const existing = map.get(key);
    if (!existing || ts >= existing.ts) map.set(key, { record, ts });
  };
  for (const record of records || []) {
    const fields = record?.fields || {};
    const playerLinks = recordIdArray(fields.Player);
    const guardianLinks = recordIdArray(fields["Parent/Guardian"] || fields.Parent || fields.Guardian);
    const ts = mediaConsentTimestamp(record);
    for (const playerId of playerLinks) upsert(byPlayerId, playerId, record, ts);
    if (playerLinks.length === 0) {
      // Only index guardian fallbacks for rows that lack an explicit Player
      // link, so a consent that names a sibling does not bleed onto another
      // child of the same parent.
      for (const guardianId of guardianLinks) upsert(byGuardianId, guardianId, record, ts);
    }
    upsert(byChildName, consentRecordChildName(record), record, ts);
  }
  return { byPlayerId, byGuardianId, byChildName };
}

// Resolve the latest Media Consents row for a player by collecting candidates
// from each index — explicit Player link, Parent/Guardian overlap (only when
// the guardian uniquely identifies one player in this payload), and the child
// name fallback — then picking the most recent match. We do not short-circuit
// on Player link alone: when the parent has since submitted a fresher consent
// without populating the Player field, the newer row should still win.
function resolveMediaConsentEntry(player, players, indexes) {
  const candidates = [];
  const direct = indexes.byPlayerId.get(player.id);
  if (direct) candidates.push(direct);

  const guardianIds = Array.isArray(player.guardianIds)
    ? player.guardianIds
    : recordIdArray(player.guardianIds || player.guardianName);
  for (const guardianId of guardianIds) {
    // Skip guardians that are shared by multiple players in this payload — a
    // guardian-only match cannot tell siblings apart, so we drop those rather
    // than attach the same row to two players.
    const playersForGuardian = players.filter((other) =>
      Array.isArray(other.guardianIds) && other.guardianIds.includes(guardianId),
    );
    if (playersForGuardian.length !== 1) continue;
    const entry = indexes.byGuardianId.get(guardianId);
    if (entry) candidates.push(entry);
  }

  const nameMatch = indexes.byChildName.get(String(player.name || "").trim().toLowerCase());
  if (nameMatch) candidates.push(nameMatch);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.ts - a.ts);
  return candidates[0];
}

// Overlay live Media Consents data onto the player objects produced by
// normalisePlayer. The Media Consents row wins when present because the form
// is the source of truth for what permissions the parent granted.
export function mergeMediaConsentsIntoPlayers(players, consentRecords) {
  const indexes = indexLatestMediaConsents(consentRecords);
  if (indexes.byPlayerId.size === 0 && indexes.byGuardianId.size === 0 && indexes.byChildName.size === 0) {
    return players;
  }
  return players.map((player) => {
    const entry = resolveMediaConsentEntry(player, players, indexes);
    if (!entry) return player;
    const perms = permissionsFromMediaConsent(entry.record);
    const consentStatus = consentStatusFromMediaConsent(entry.record);
    return {
      ...player,
      consentStatus,
      photoConsent: perms.photoConsent,
      videoConsent: perms.videoConsent,
      matchPhotoConsent: perms.matchPhotoConsent,
      matchVideoConsent: perms.matchVideoConsent,
      websiteConsent: perms.websiteConsent,
      socialConsent: perms.socialConsent,
      highlightsConsent: perms.highlightsConsent,
      internalReportsConsent: perms.internalReportsConsent,
      pressConsent: perms.pressConsent,
      emergencyContactConsent: perms.emergencyContactConsent,
      medicalInformationConsent: perms.medicalInformationConsent,
    };
  });
}

// Demo data used when AIRTABLE_* env vars are missing so the API still works.
function demoSessions(scope = "upcoming") {
  const today = new Date();
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
      notes: "Demo session — Airtable env vars not set.",
      checkInEnabled: true,
      qrFallbackCode: "DEMO-U11-WEST",
      playerIds: [],
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
      notes: "Demo session — Airtable env vars not set.",
      checkInEnabled: true,
      qrFallbackCode: "DEMO-U8-JR",
      playerIds: [],
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
      notes: "Demo session — Airtable env vars not set.",
      checkInEnabled: false,
      qrFallbackCode: "",
      playerIds: [],
    },
  ];
  if (scope === "all") return all;
  if (scope === "past") return all.filter((s) => s.state === "completed");
  return all.filter((s) => s.state === "scheduled");
}

function demoAttendance() {
  return [
    {
      id: "att_demo_01",
      sessionId: "ses_demo_03",
      playerId: "ply_demo_01",
      playerName: "Jayden Cole",
      status: "present",
      arrivalTime: "17:25",
      departureTime: "18:45",
      parentNotified: true,
      coachNotes: "Demo attendance — Airtable env vars not set.",
      checkInMethod: "QR",
      confirmationStatus: "Confirmed",
      paymentStatus: "Paid",
      attendanceRecordIdText: "att_demo_01",
    },
  ];
}
