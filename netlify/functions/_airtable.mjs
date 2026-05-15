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
  // Push Subscriptions stores Web Push endpoints (one row per parent device)
  // plus per-notification preference toggles. Used by the scheduled fan-out
  // function to send the T−60 / T−30 reminders.
  PUSH_SUBSCRIPTIONS: "tbl3FDPfK1iYFvEwJ",
  // Notifications Sent is the dedupe + audit rail for the scheduled push
  // fan-out. One row per (session, kind, parent) tuple. The cron writes the
  // row BEFORE attempting the web-push send so a duplicate tick within the
  // same 5-minute window cannot trigger a second notification.
  NOTIFICATIONS_SENT: "tblqUnGbvAHgxjsm7",
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

/** Parses Logo Studio JSON from the Coaches "Partner Config" long-text field. */
function parsePartnerConfig(raw) {
  if (raw === undefined || raw === null) return null;
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
    partner: parsePartnerConfig(fields["Partner Config"]),
  };
}

/** Coaches table: omit from GET /api/public-coaches when checked/true. */
function isHiddenFromPublicCoachDirectory(fields) {
  return boolValue(fields["Hide from directory"]) || boolValue(fields["Directory hidden"]);
}

function sanitisePublicDirectoryPartner(partner) {
  if (!partner || typeof partner !== "object" || Array.isArray(partner)) return null;
  const brandName = stringValue(partner.brandName, "").trim();
  if (!brandName) return null;
  const monogram = stringValue(partner.monogram, "").trim();
  const tagline = stringValue(partner.tagline, "").trim();
  return {
    brandName,
    ...(monogram ? { monogram } : {}),
    ...(tagline ? { tagline } : {}),
  };
}

/**
 * Public-safe projection for the parent-facing coach directory. Omits email,
 * phone, DBS/first-aid, and internal-only fields.
 */
export function normalisePublicDirectoryCoach(record) {
  if (!record) return null;
  const fields = record?.fields || {};
  if (isHiddenFromPublicCoachDirectory(fields)) return null;

  const name = stringValue(fields["Full Name"] || fields.Name || fields["Coach Name"], "Grass2Pro Coach");
  const role = stringValue(fields.Role || fields.Title, "Coach admin");
  const credential = stringValue(fields.Qualification || fields.Credential || fields.Qualifications, "");
  const location = stringValue(
    fields.Location ||
      fields.Venue ||
      fields.Area ||
      fields.City ||
      fields["Training location"] ||
      fields.Address,
    "",
  ).trim();
  const avatarUrl = firstAttachmentUrl(fields["Avatar Image"] || fields.Avatar || fields.Photo);
  const rawHint = stringValue(fields["Public Slug"] || fields["URL Slug"] || fields["Page Slug"] || fields.Slug, "")
    .trim()
    .toLowerCase();
  const publicSlugHint = rawHint.replace(/^\/+/, "").split(/[/?#]/)[0] || "";
  const partner = sanitisePublicDirectoryPartner(parsePartnerConfig(fields["Partner Config"]));

  return {
    id: record?.id || "coach",
    name,
    role,
    credential: credential.trim(),
    location,
    avatarUrl: avatarUrl || "",
    publicSlugHint,
    partner,
  };
}

/**
 * All Coaches rows suitable for the public directory (no AIRTABLE_COACH_FILTER).
 * Add optional checkbox "Hide from directory" on the Coaches table to opt out.
 */
export async function listPublicCoachDirectoryRows() {
  if (!hasAirtableConfig()) {
    const demo = normalisePublicDirectoryCoach({
      id: "rect8JRrno85KaRNG",
      fields: {
        "Full Name": "Hope Bouhe",
        Role: "FA Talent ID Level 2 Scout",
        Qualification: "FA Talent ID Level 2",
        Location: "Colindale Football Centre, Great Strand, NW9 5PE",
      },
    });
    return demo ? [demo] : [];
  }

  const table = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  const records = await airtableList(table, { pageSize: 100, maxRecords: 200 });
  const out = [];
  for (const rec of records) {
    const row = normalisePublicDirectoryCoach(rec);
    if (row) out.push(row);
  }
  out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return out;
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

/** Look up a Coaches row whose Email equals the normalised inbox (case-insensitive). */
export async function findCoachRecordByNormalisedEmail(normalisedEmail) {
  if (!hasAirtableConfig()) return null;
  const coachesTable = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  const formula = `LOWER(TRIM({Email}))='${escapeFormulaString(normalisedEmail)}'`;
  const records = await airtableList(coachesTable, {
    filterByFormula: formula,
    maxRecords: "1",
  });
  return records[0] || null;
}

/**
 * Load the dashboard payload scoped to whichever coach authenticated — must
 * match a Coaches.Email field identical to parent magic-link casing rules.
 */
export async function getCoachDashboardDataForSessionEmail(normalisedEmail) {
  if (!hasAirtableConfig()) return demoData;

  const coachRecord = await findCoachRecordByNormalisedEmail(normalisedEmail);
  if (!coachRecord) {
    const err = new Error("coach_not_found");
    err.code = "COACH_NOT_FOUND";
    throw err;
  }

  const coach = normaliseCoach(coachRecord);
  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  const playerRecords = await airtableList(playersTable, { pageSize: "100" });
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

export async function airtableUpdate(table, recordId, fields, { typecast = false } = {}) {
  if (!hasAirtableConfig()) {
    return { id: recordId || `demo_${Date.now()}`, fields, demo: true };
  }
  const url = `${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${encodeTable(table)}/${encodeURIComponent(recordId)}`;
  const body = typecast ? { fields, typecast: true } : { fields };
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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

// Build the public scan URL for a given token. The host is configurable so
// staging and production can each render their own deep-link without code
// changes. SCAN_BASE_URL takes precedence; otherwise we use Netlify's URL env
// var which the platform sets automatically per deploy. Falls back to the
// staging hostname so back-fill on a base hooked up to a brand-new Netlify
// site doesn't write a useless half-URL.
export function buildScanUrl(token) {
  if (!token) return "";
  const base = (
    process.env.SCAN_BASE_URL ||
    process.env.URL ||
    "https://grass2pro-coach-admin-staging.netlify.app"
  ).replace(/\/$/, "");
  return `${base}/scan?t=${encodeURIComponent(token)}`;
}

// Generate a 32-char URL-safe random token for a session's parent scan flow.
// Uses crypto.randomBytes so the entropy is suitable for a bearer token.
// The token is the *only* credential a parent presents on the scan landing
// page — we treat it like a one-time link, valid only while `now` falls inside
// the session's arrival/departure windows.
export function generateScanToken() {
  // 24 bytes of randomness → 32 chars of base64url with no padding. Keeps the
  // QR small enough to render crisply on a coach's phone screen while still
  // giving us 192 bits of entropy.
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
    sessionFee:
      typeof fields["Session Fee"] === "number" ? fields["Session Fee"] : null,
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
    // Parent-set RSVP for the upcoming session. "Coming" gates the no-show
    // check-in fan-out (see scheduled-push-fanout.mjs); blank means the
    // parent has not declared yet. Surfaced here so the SPA can render the
    // current selection on the parent portal session card.
    rsvpStatus: stringValue(fields["RSVP Status"], ""),
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

  // Phase A back-fill: any session that is still upcoming (i.e. could plausibly
  // be scanned into) without a Scan Token gets one generated and persisted.
  // We deliberately skip past sessions — they're read-only and don't need a
  // QR. Failures are swallowed: a missing token is a degraded UX (coach sees
  // "QR unavailable") but should never break the dashboard load.
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const backfillTargets = records.filter((record, index) => {
    const session = all[index];
    if (session.scanToken) return false;
    if (!session.date) return true; // sessions without a date are treated as live
    return new Date(session.date) >= now;
  });
  if (backfillTargets.length > 0) {
    await Promise.allSettled(
      backfillTargets.map(async (record) => {
        const token = generateScanToken();
        try {
          // Write both the bearer token and the click-through URL so the
          // Airtable row is fully populated in one round-trip.
          await airtableUpdate(table, record.id, {
            "Scan Token": token,
            "QR Code URL": buildScanUrl(token),
          });
          // Mutate the in-memory copy so the response we return to the client
          // already reflects the new token, no extra round-trip needed.
          const idx = records.indexOf(record);
          if (idx >= 0 && all[idx]) all[idx].scanToken = token;
        } catch (err) {
          console.warn("Scan Token back-fill failed for", record.id, err?.message || err);
        }
      }),
    );
  }

  if (scope === "all") return all;
  if (scope === "past") {
    return all.filter((s) => s.date && new Date(s.date) < now);
  }
  return all.filter((s) => !s.date || new Date(s.date) >= now);
}

// Look up a session by its Scan Token. Returns the normalised session record
// or null. Used by parent-scan-resolve.mjs — the token IS the credential, so
// this is the only authentication the parent presents.
//
// We use Airtable's filterByFormula instead of fetching the whole table because
// (a) it's faster on bases with hundreds of sessions and (b) it limits the
// blast radius if someone tries to enumerate tokens — they can't list, only
// match-or-miss.
export async function findSessionByScanToken(token) {
  if (!token || typeof token !== "string") return null;
  if (!hasAirtableConfig()) {
    const demo = demoSessions("all").find((s) => s.scanToken === token);
    return demo || null;
  }
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
  // Escape any single quotes in the token defensively. Our generator only
  // produces base64url chars (A–Z, a–z, 0–9, -, _) so this is belt-and-braces,
  // but it stops a malformed token from breaking the formula syntax.
  const safe = token.replace(/'/g, "\\'");
  const records = await airtableList(table, {
    filterByFormula: `{Scan Token} = '${safe}'`,
    maxRecords: "1",
    pageSize: "1",
  });
  if (!records.length) return null;
  return normaliseSession(records[0]);
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

// Cancel a session. Flips Status to Cancelled and writes a tagged audit line
// into Session Notes so the reason is preserved alongside any prior history.
// We keep the reason in Notes (rather than a dedicated single-select column)
// for now — a future schema change can promote it to its own field once we
// know what reasons coaches actually pick most.
export async function cancelSession(
  sessionId,
  { reason, detail, coach } = {},
) {
  if (!sessionId) throw new Error("sessionId is required");
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);

  const current = await airtableGet(table, sessionId);
  const before = current?.fields || {};
  const beforeNotes = stringValue(before["Session Notes"]);

  const today = formatHumanDate(new Date().toISOString().slice(0, 10));
  const who = coach ? `, by ${coach}` : "";
  const reasonLabel = reason ? ` \u2014 ${reason}` : "";
  const detailLabel = detail ? ` (${detail})` : "";
  const auditLine = `[Cancelled${reasonLabel}${detailLabel} on ${today}${who}]`;

  const updates = {
    Status: "Cancelled",
    "Session Notes": beforeNotes ? `${auditLine}\n${beforeNotes}` : auditLine,
  };

  const updated = await airtableUpdate(table, sessionId, updates);
  return normaliseSession(updated);
}

// Edit an existing session. Mirrors the shape of createSession but takes a
// session ID and only patches fields that actually changed. Significant edits
// (date, start, end, location, pitch type) prepend an audit line into Session
// Notes — silent edits (name, team, age group, coach, fee, notes) save without
// noise, mirroring the user's preference for a quiet log on small tweaks.
//
// `notes` is treated specially: when present, it REPLACES the body of Session
// Notes (audit lines preserved at the top), because notes is a free-text field
// the coach is expected to author directly. If the audit history matters more
// than the new note text, callers can simply omit `notes` from the payload.
export async function editSession(
  sessionId,
  {
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
    coachActor,
  } = {},
) {
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

  // ---- Significant fields (logged) ----
  if (typeof date === "string" && date && date !== beforeDate) {
    updates.Date = date;
    significantChanges.push(
      `date ${formatHumanDate(beforeDate) || "(none)"} \u2192 ${formatHumanDate(date)}`,
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

  // ---- Silent fields (saved but not logged) ----
  if (typeof name === "string" && name && name !== beforeName) {
    updates["Session Name"] = name;
  }
  if (typeof sessionFee === "number" && Number.isFinite(sessionFee) && sessionFee !== beforeFee) {
    updates["Session Fee"] = sessionFee;
    // Mirror createSession's behaviour: a non-zero fee implies Per Session +
    // Payment Required so attendance/payments stay coherent.
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

  // Build notes: existing audit history + new audit line (if any) + body.
  // We split beforeNotes into bracketed audit lines (kept) and free body
  // (replaced when `notes` is supplied) so editing the note doesn't wipe the
  // reschedule/cancel/edit trail.
  const auditMatch = beforeNotes.match(/^((?:\[[^\]]+\]\n?)*)([\s\S]*)$/);
  const existingAudit = auditMatch ? auditMatch[1].trimEnd() : "";
  const existingBody = auditMatch ? auditMatch[2].trimStart() : beforeNotes;

  let newAuditLine = "";
  if (significantChanges.length > 0) {
    const today = formatHumanDate(new Date().toISOString().slice(0, 10));
    const who = coachActor ? `, by ${coachActor}` : "";
    newAuditLine = `[Edited ${significantChanges.join("; ")} on ${today}${who}]`;
  }

  const nextBody =
    typeof notes === "string" ? notes.trim() : existingBody;

  const auditBlock = [existingAudit, newAuditLine].filter(Boolean).join("\n");
  const composedNotes = [auditBlock, nextBody].filter(Boolean).join("\n\n");

  const notesChanged = composedNotes !== beforeNotes;
  if (notesChanged) {
    updates["Session Notes"] = composedNotes;
  }

  if (Object.keys(updates).length === 0) {
    return normaliseSession(current);
  }

  // typecast=true so a fresh Pitch Type option (e.g. if Airtable singleSelect
  // is missing one of the two values) gets auto-created server-side instead
  // of failing the whole patch.
  const updated = await airtableUpdate(table, sessionId, updates, { typecast: true });
  return normaliseSession(updated);
}

// Create a new session. Captures only the five fields a coach naturally types
// when scheduling (Date / Start / End / Location / Fee) and lets sensible
// defaults handle the rest. Status is forced to "Upcoming" so the row lands in
// the right column straight away.
export async function createSession({
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
} = {}) {
  if (!date) throw new Error("date is required");
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);

  const fields = {
    "Session Name": name || deriveDefaultSessionName(date),
    Date: date,
    Status: "Upcoming",
    "Today's Session Type": "Training",
    "Check-in Enabled": true,
  };
  // Phase A: per-session bearer token + click-through scan URL. Generated up
  // front so every new session has a usable QR from the moment it lands in
  // Airtable, and so the existing "QR Code URL" Airtable column is populated
  // (handy for debugging and for sharing a session via WhatsApp without the
  // QR image). listSessions() back-fills any pre-Phase-A rows on read.
  const newToken = generateScanToken();
  fields["Scan Token"] = newToken;
  fields["QR Code URL"] = buildScanUrl(newToken);
  if (startTime) fields["Start Time"] = startTime;
  if (endTime) fields["End Time"] = endTime;
  if (location) fields.Location = location;
  // Pitch Type is an Airtable singleSelect (Title Case): "Astro 4G" or "Grass".
  // typecast is already on for this create call so a brand-new option name will
  // be auto-created server-side if the field exists; the field itself still has
  // to be added to the Sessions table once — see the README for the manual step.
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

// Build a friendly default name when the coach didn't type one. Hope's actual
// messages describe by day-of-week ("Tuesday training", "Saturday match") so
// we mirror that shape and leave session type as Training by default.
function deriveDefaultSessionName(dateIso) {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "New session";
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  return `${weekday} training`;
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
      scanToken: "demo_token_u11west_aaaaaaaaaaaa",
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
      scanToken: "demo_token_u8jrs_bbbbbbbbbbbbbb",
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
      scanToken: "",
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
