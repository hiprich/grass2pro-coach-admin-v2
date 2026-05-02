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
    { id: "safeguarding", label: "Safeguarding", count: 2, icon: "shield" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" },
  ],
  updatedAt: new Date().toISOString(),
};

export function hasAirtableConfig() {
  return Boolean((process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY) && process.env.AIRTABLE_BASE_ID);
}

export function tableName(key, fallback) {
  return process.env[key] || fallback;
}

function token() {
  return process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
}

function encodeTable(table) {
  return table
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
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

export async function airtableCreate(table, fields) {
  if (!hasAirtableConfig()) {
    return { id: `demo_${Date.now()}`, fields, demo: true };
  }

  const response = await fetch(`${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${encodeTable(table)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable create failed for ${table}: ${body}`);
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
    consentStatus,
    photoConsent: boolValue(fields["Photo Consent"] || fields["Photo Permission"]),
    videoConsent: boolValue(fields["Video Consent"] || fields["Video Permission"]),
    websiteConsent: boolValue(fields["Website Consent"] || fields["Website Permission"]),
    socialConsent: boolValue(fields["Social Consent"] || fields["Social Permission"]),
    highlightsConsent: boolValue(fields["Highlights Consent"] || fields["Highlight Permission"]),
    reviewDue: stringValue(fields["Review Due"] || fields["Next Review"], new Date().toISOString()),
    progressScore: numberValue(fields["Progress Score"] || fields.Progress, 0),
  };
}

export function buildSidebar(players) {
  const needsAction = players.filter((player) => player.consentStatus === "red" || player.consentStatus === "grey").length;
  return [
    { id: "overview", label: "Overview", count: players.length, icon: "home" },
    { id: "players", label: "Players", count: players.length, icon: "users" },
    { id: "safeguarding", label: "Safeguarding", count: needsAction, icon: "shield" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" },
  ];
}

export async function getCoachAndPlayers() {
  if (!hasAirtableConfig()) return demoData;

  const coachParams = { maxRecords: "1" };
  if (process.env.AIRTABLE_COACH_FILTER) coachParams.filterByFormula = process.env.AIRTABLE_COACH_FILTER;

  const [coachRecords, playerRecords] = await Promise.all([
    airtableList(tableName("AIRTABLE_COACHES_TABLE", "Coaches"), coachParams),
    airtableList(tableName("AIRTABLE_PLAYERS_TABLE", "Players"), { pageSize: "100" }),
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
    notes: stringValue(fields.Notes || fields["Coach Notes"], ""),
    checkInEnabled: boolValue(fields["Check-in Enabled"]),
    qrFallbackCode: stringValue(fields["QR Fallback Code"]),
    playerIds: Array.isArray(fields.Players) ? fields.Players : [],
  };
}

export function normaliseAttendance(record) {
  const fields = record?.fields || {};
  const sessionLink = Array.isArray(fields.Session) ? fields.Session[0] : fields.Session;
  const playerLink = Array.isArray(fields.Player) ? fields.Player[0] : fields.Player;
  return {
    id: record?.id || crypto.randomUUID(),
    sessionId: stringValue(sessionLink, ""),
    playerId: stringValue(playerLink, ""),
    playerName: stringValue(fields["Player Name"] || fields["Player"], ""),
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

// Find existing Attendance record for (session, player). Uses an Airtable
// filterByFormula that searches the linked Session/Player record IDs so we do
// not have to scan every Attendance row — important once the table grows past
// a single page (100 rows). The formula relies on ARRAYJOIN({Session}) /
// ARRAYJOIN({Player}) returning the linked record IDs in the proxy/automation
// view used by the Airtable REST API.
export async function findAttendance(sessionId, playerId) {
  const table = tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance");
  if (!hasAirtableConfig()) return null;
  const safeSession = escapeFormulaString(sessionId);
  const safePlayer = escapeFormulaString(playerId);
  const params = {
    pageSize: "1",
    maxRecords: "1",
    filterByFormula: `AND(SEARCH('${safeSession}', ARRAYJOIN({Session})), SEARCH('${safePlayer}', ARRAYJOIN({Player})))`,
  };
  const records = await airtableList(table, params);
  return records.length > 0 ? records[0] : null;
}

export async function listSessions({ scope = "upcoming" } = {}) {
  const table = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions");
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

export async function listAttendance({ sessionId } = {}) {
  const table = tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance");
  if (!hasAirtableConfig()) return demoAttendance();
  const params = { pageSize: "100" };
  if (sessionId) {
    params.filterByFormula = `SEARCH('${escapeFormulaString(sessionId)}', ARRAYJOIN({Session}))`;
  }
  const records = await airtableList(table, params);
  return records.map(normaliseAttendance);
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
