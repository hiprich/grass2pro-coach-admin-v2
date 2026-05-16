const AIRTABLE_API = "https://api.airtable.com/v0";

const demoData = {
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
  ],
  sidebar: [
    { id: "overview", label: "Coach dashboard", count: 4, icon: "home" },
    { id: "players", label: "Players", count: 4, icon: "users" },
    { id: "sessions", label: "Sessions", count: 0, icon: "calendar" },
    { id: "attendance", label: "Attendance", count: 0, icon: "clipboard" },
    { id: "safeguarding", label: "Safeguarding", count: 2, icon: "shield" },
    { id: "payments", label: "Payments", count: 0, icon: "pound" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" },
  ],
  updatedAt: new Date().toISOString(),
};

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Cache-Control": "no-store",
  };
}

function json(body, status = 200, env = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(env),
    },
  });
}

// Known Airtable table IDs for this base. Used as the ultimate fallback so a
// fresh deployment without any AIRTABLE_*_TABLE env vars still hits the right
// tables, even when the human-readable name contains a "/" or other reserved
// character that would otherwise need URL-encoding.
const TABLE_IDS = {
  PLAYERS: "tbl4iFx39SdFcidqu",
  PARENTS: "tblC9YZ2eI0rK1KFc",
  MEDIA_CONSENTS: "tblFY37amCu9zbfHO",
};

// Resolve a table identifier from env, preferring the `_ID` form when set
// because IDs are stable across renames and contain no reserved characters.
function tableRef(env, key, fallbackName, fallbackId) {
  return env[`${key}_ID`] || env[key] || fallbackId || fallbackName;
}

function looksLikeTableId(value) {
  return typeof value === "string" && /^tbl[a-zA-Z0-9]{10,}$/.test(value);
}

// Percent-encode the whole table identifier so reserved characters (notably
// "/", as in "Parents/Guardians") survive the trip to Airtable. Splitting on
// "/" and re-joining with literal "/" — as the previous implementation did —
// caused Airtable to resolve the path as two separate segments and return
// NOT_FOUND. Table IDs (tbl...) are returned untouched.
function encodeTable(table) {
  if (looksLikeTableId(table)) return table;
  return encodeURIComponent(table);
}

async function airtableList(env, table, params = {}) {
  const url = new URL(`${AIRTABLE_API}/${env.AIRTABLE_BASE_ID}/${encodeTable(table)}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}` },
  });
  if (!response.ok) throw new Error(await response.text());
  const payload = await response.json();
  return payload.records || [];
}

class AirtableHttpError extends Error {
  constructor(message, { status, body, table } = {}) {
    super(message);
    this.name = "AirtableHttpError";
    this.status = status;
    this.body = body;
    this.table = table;
  }
}

async function airtableCreate(env, table, fields) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) {
    return { id: `demo_${Date.now()}`, fields, demo: true };
  }

  const response = await fetch(`${AIRTABLE_API}/${env.AIRTABLE_BASE_ID}/${encodeTable(table)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
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

async function airtableUpdate(env, table, recordId, fields) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) {
    return { id: recordId || `demo_${Date.now()}`, fields, demo: true };
  }
  const url = `${AIRTABLE_API}/${env.AIRTABLE_BASE_ID}/${encodeTable(table)}/${encodeURIComponent(recordId)}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new AirtableHttpError(`Airtable update failed for ${table}/${recordId}: ${body}`, {
      status: response.status,
      body,
      table,
    });
  }
  return response.json();
}

function normaliseDateOfBirth(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (parsed.getTime() > today.getTime()) return null;
  return trimmed;
}

function extractAirtableErrorDetail(body) {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body);
    const err = parsed?.error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      return err.message || err.type || undefined;
    }
  } catch {
    // Non-JSON body — drop it rather than leak internals.
  }
  return undefined;
}

function firstAttachmentUrl(value) {
  if (Array.isArray(value) && value.length > 0) return value[0]?.url || value[0]?.thumbnails?.large?.url || "";
  if (typeof value === "string") return value;
  return "";
}

function stringValue(value, fallback = "") {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === undefined || value === null) return fallback;
  return String(value);
}

// Skip raw Airtable record IDs (e.g. "rec0faJqj2SUI6tiH") so a linked-record
// field doesn't leak through where we want a human-readable lookup value.
function looksLikeRecordId(value) {
  return typeof value === "string" && /^rec[a-zA-Z0-9]{14,}$/.test(value);
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

function normaliseConsentStatus(fields) {
  const explicit = stringValue(fields["Consent Status"] || fields["Media Consent Status"]).toLowerCase();
  if (["green", "amber", "red", "grey"].includes(explicit)) return explicit;
  if (explicit.includes("withdraw")) return "red";
  if (explicit.includes("limited")) return "amber";
  if (explicit.includes("not") || explicit.includes("missing")) return "grey";
  if (boolValue(fields["Photo Consent"]) && boolValue(fields["Video Consent"])) return "green";
  if (boolValue(fields["Photo Consent"]) || boolValue(fields["Video Consent"])) return "amber";
  return "grey";
}

function normaliseCoach(record = {}) {
  const fields = record.fields || {};
  return {
    id: record.id || "coach",
    name: stringValue(fields["Full Name"] || fields.Name || fields["Coach Name"], "Grass2Pro Coach"),
    role: stringValue(fields.Role || fields.Title, "Coach admin"),
    credential: stringValue(fields.Qualification || fields.Credential || fields.Qualifications, "Safeguarding lead"),
    avatarUrl: firstAttachmentUrl(fields["Avatar Image"] || fields.Avatar || fields.Photo),
    email: stringValue(fields.Email),
  };
}

function normalisePlayer(record = {}) {
  const fields = record.fields || {};
  const consentStatus = normaliseConsentStatus(fields);
  const progress = Number(fields["Progress Score"] || fields.Progress || 0);
  return {
    id: record.id || crypto.randomUUID(),
    name: stringValue(fields["Full Name"] || fields.Name || fields["Player Name"], "Unnamed player"),
    ageGroup: stringValue(fields["Age Group"] || fields.AgeGroup, "U11"),
    team: stringValue(fields.Team || fields.Squad, "Grass2Pro"),
    position: readableValue(fields.Position, ""),
    status: stringValue(fields.Status, consentStatus === "red" ? "Withdrawn media consent" : "Active"),
    // Guardian field is often a linked-record array of Airtable record IDs; use
    // readableValue so we don't leak rec... strings into the coach-facing UI.
    guardianName: readableValue(fields["Guardian Name"] || fields["Parent/Guardian"] || fields.Parent, ""),
    dateOfBirth: stringValue(fields["Date of Birth"] || fields.DOB, ""),
    consentStatus,
    photoConsent: boolValue(fields["Photo Consent"] || fields["Photo Permission"]),
    videoConsent: boolValue(fields["Video Consent"] || fields["Video Permission"]),
    websiteConsent: boolValue(fields["Website Consent"] || fields["Website Permission"]),
    socialConsent: boolValue(fields["Social Consent"] || fields["Social Permission"]),
    highlightsConsent: boolValue(fields["Highlights Consent"] || fields["Highlight Permission"]),
    reviewDue: stringValue(fields["Review Due"] || fields["Next Review"], new Date().toISOString()),
    progressScore: Number.isFinite(progress) ? progress : 0,
  };
}

function buildSidebar(players, counts = {}) {
  const needsAction = players.filter((player) => player.consentStatus === "red" || player.consentStatus === "grey").length;
  // Always emit the full operational navigation. Sessions, Attendance and
  // Payments are populated from their dedicated endpoints by the dashboard
  // — counts default to 0 here and are overridden client-side from live data.
  return [
    { id: "overview", label: "Coach dashboard", count: players.length, icon: "home" },
    { id: "players", label: "Players", count: players.length, icon: "users" },
    { id: "sessions", label: "Sessions", count: counts.sessions ?? 0, icon: "calendar" },
    { id: "attendance", label: "Attendance", count: counts.attendance ?? 0, icon: "clipboard" },
    { id: "safeguarding", label: "Safeguarding", count: needsAction, icon: "shield" },
    { id: "payments", label: "Payments", count: counts.payments ?? 0, icon: "pound" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" },
  ];
}

async function adminData(env) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) return demoData;
  const coachParams = { maxRecords: "1" };
  if (env.AIRTABLE_COACH_FILTER) coachParams.filterByFormula = env.AIRTABLE_COACH_FILTER;
  const [coachRecords, playerRecords] = await Promise.all([
    airtableList(env, tableRef(env, "AIRTABLE_COACHES_TABLE", "Coaches"), coachParams),
    airtableList(env, tableRef(env, "AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS), { pageSize: "100" }),
  ]);
  const players = playerRecords.map(normalisePlayer);
  return {
    coach: normaliseCoach(coachRecords[0]),
    players,
    sidebar: buildSidebar(players),
    updatedAt: new Date().toISOString(),
  };
}

async function saveConsent(request, env) {
  const payload = await request.json();
  if (!payload.childName || !payload.parentName || !payload.parentEmail || !payload.parentalResponsibility || !payload.withdrawalProcessAcknowledged) {
    return json({ error: "Missing required consent fields." }, 400, env);
  }
  // childDateOfBirth is optional at the API layer (older clients may not send
  // it) but if it is present it must parse cleanly. The UI requires DOB; this
  // guard protects direct API callers from corrupting the Players Date of
  // Birth field with an unparseable value.
  const dateOfBirth = normaliseDateOfBirth(payload.childDateOfBirth);
  if (payload.childDateOfBirth && !dateOfBirth) {
    return json(
      { error: "Player date of birth must be a valid past date in YYYY-MM-DD format." },
      400,
      env,
    );
  }
  const permissions = payload.permissions || {};
  const selectedPermissions = Object.entries(permissions)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
  const fields = {
    "Child Full Name": payload.childName,
    "Age Group": payload.ageGroup || "",
    "Parent/Guardian Name": payload.parentName,
    "Parent/Guardian Email": payload.parentEmail,
    "Parent/Guardian Phone": payload.parentPhone || "",
    Relationship: payload.relationship || "",
    "Photo Permission": Boolean(permissions.photoTraining),
    "Video Permission": Boolean(permissions.videoTraining),
    "Internal Report Permission": Boolean(permissions.internalReports),
    "Website Permission": Boolean(permissions.website),
    "Social Media Permission": Boolean(permissions.social),
    "Press Permission": Boolean(permissions.press),
    "Selected Permissions": selectedPermissions.join(", "),
    "Usage Details": payload.usageDetails || "",
    "Storage Duration": payload.storageDuration || "",
    "Withdrawal Process Acknowledged": Boolean(payload.withdrawalProcessAcknowledged),
    "Child Consulted": Boolean(payload.childConsulted),
    "Parental Responsibility Confirmed": Boolean(payload.parentalResponsibility),
    "Consent State": selectedPermissions.length > 0 ? "Active" : "No media consent",
    "Withdrawal State": "Not withdrawn",
    Notes: payload.notes || "",
    "Submitted At": new Date().toISOString(),
  };
  const record = await airtableCreate(
    env,
    tableRef(env, "AIRTABLE_MEDIA_CONSENTS_TABLE", "Media Consents", TABLE_IDS.MEDIA_CONSENTS),
    fields,
  );

  // Best-effort write of the player's Date of Birth into the Players table so
  // the Age Group formula can pick it up. We only attempt this when the
  // submitted child name maps unambiguously to an existing Player row —
  // failures or no-matches never block the consent submission.
  if (dateOfBirth && env.AIRTABLE_TOKEN && env.AIRTABLE_BASE_ID) {
    try {
      const playerId = await findPlayerIdByName(env, payload.childName);
      if (playerId) {
        await airtableUpdate(
          env,
          tableRef(env, "AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
          playerId,
          { "Date of Birth": dateOfBirth },
        );
      }
    } catch (error) {
      console.error("Player Date of Birth update failed:", error);
    }
  }

  return json({ ok: true, id: record.id, demo: Boolean(record.demo), selectedPermissions }, 200, env);
}

async function findPlayerIdByName(env, childName) {
  const trimmed = String(childName || "").trim().toLowerCase();
  if (!trimmed) return null;
  const records = await airtableList(
    env,
    tableRef(env, "AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
    { pageSize: "100" },
  );
  const nameOf = (record) => {
    const fields = record?.fields || {};
    return String(fields["Full Name"] || fields.Name || fields["Player Name"] || "")
      .trim()
      .toLowerCase();
  };
  const exact = records.find((record) => nameOf(record) === trimmed);
  return exact?.id || null;
}

// ---------- Sessions / Attendance / QR Check-ins ----------

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
  if (fields && (fields["Arrival Time"] || fields["Departure Time"])) return "present";
  return "absent";
}

function normaliseSession(record = {}) {
  const fields = record.fields || {};
  const date = stringValue(fields.Date || fields["Session Date"]);
  return {
    id: record.id || crypto.randomUUID(),
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

function normaliseAttendance(record = {}) {
  const fields = record.fields || {};
  const sessionLink = Array.isArray(fields.Session) ? fields.Session[0] : fields.Session;
  const playerLink = Array.isArray(fields.Player) ? fields.Player[0] : fields.Player;
  // Prefer the lookup column "Player Name (from Player)"; the bare "Player"
  // field is the linked rec... ID array and is not human-readable.
  const playerName =
    readableValue(fields["Player Name (from Player)"]) ||
    readableValue(fields["Player Name"]) ||
    readableValue(fields["Player Full Name"]) ||
    stringValue(playerLink, "");
  return {
    id: record.id || crypto.randomUUID(),
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

// ARRAYJOIN against a linked-record field returns the *primary field* values
// of the linked rows, not their record IDs, so a SEARCH for `recXXXX...`
// silently returns no matches even when the row exists. List the attendance
// rows and match the linked Session/Player IDs in code instead.
async function findAttendance(env, sessionId, playerId) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) return null;
  const records = await airtableList(env, tableRef(env, "AIRTABLE_ATTENDANCE_TABLE", "Attendance"), { pageSize: "100" });
  return (
    records.find((record) => {
      const fields = record?.fields || {};
      const sessionLinks = Array.isArray(fields.Session) ? fields.Session : fields.Session ? [fields.Session] : [];
      const playerLinks = Array.isArray(fields.Player) ? fields.Player : fields.Player ? [fields.Player] : [];
      return sessionLinks.includes(sessionId) && playerLinks.includes(playerId);
    }) || null
  );
}

function demoSessionsList(scope) {
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
  ];
  if (scope === "all") return all;
  if (scope === "past") return [];
  return all;
}

async function listSessions(env, scope = "upcoming") {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) return demoSessionsList(scope);
  const params = {
    pageSize: "100",
    "sort[0][field]": "Date",
    "sort[0][direction]": scope === "past" ? "desc" : "asc",
  };
  const records = await airtableList(env, tableRef(env, "AIRTABLE_SESSIONS_TABLE", "Sessions"), params);
  const all = records.map(normaliseSession);
  if (scope === "all") return all;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (scope === "past") return all.filter((s) => s.date && new Date(s.date) < today);
  return all.filter((s) => !s.date || new Date(s.date) >= today);
}

async function listAttendanceRecords(env, sessionId) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) return [];
  const params = { pageSize: "100" };
  if (sessionId) {
    const safe = String(sessionId).replace(/'/g, "\\'");
    params.filterByFormula = `SEARCH('${safe}', ARRAYJOIN({Session}))`;
  }
  const records = await airtableList(env, tableRef(env, "AIRTABLE_ATTENDANCE_TABLE", "Attendance"), params);
  return records.map(normaliseAttendance);
}

async function createQrCheckin(request, env) {
  const payload = await request.json().catch(() => ({}));
  const {
    sessionId,
    playerId,
    parentId,
    scanType,
    confirmationResult,
    method,
    notes,
    paymentResult,
    forceConfirm = false,
  } = payload || {};

  if (!sessionId || !playerId) {
    return json({ error: "sessionId and playerId are required." }, 400, env);
  }
  if (scanType !== "Arrival" && scanType !== "Departure") {
    return json({ error: "scanType must be 'Arrival' or 'Departure'.", received: scanType }, 400, env);
  }
  if (confirmationResult !== "Confirmed") {
    return json({ error: "confirmationResult must be 'Confirmed'.", received: confirmationResult }, 400, env);
  }

  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) {
    return json(
      { ok: true, demo: true, warning: "Airtable env vars not set; QR scan was not persisted.", scanType, sessionId, playerId },
      200,
      env,
    );
  }

  let existingRecord = null;
  try {
    existingRecord = await findAttendance(env, sessionId, playerId);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Attendance lookup failed." }, 500, env);
  }
  const existing = existingRecord ? normaliseAttendance(existingRecord) : null;

  if (!forceConfirm && existing) {
    if (scanType === "Arrival" && existing.arrivalTime) {
      return json({ warning: "duplicate_arrival", message: "Arrival already recorded.", existing }, 409, env);
    }
    if (scanType === "Departure" && existing.departureTime) {
      return json({ warning: "duplicate_departure", message: "Departure already recorded.", existing }, 409, env);
    }
    if (scanType === "Departure" && !existing.arrivalTime) {
      return json({ warning: "departure_without_arrival", message: "No arrival recorded yet.", existing }, 409, env);
    }
  }
  if (!forceConfirm && !existing && scanType === "Departure") {
    return json({ warning: "departure_without_arrival", message: "No attendance record yet.", existing: null }, 409, env);
  }

  // "Scan Time" (createdTime) and "Attendance Record ID Text" (formula) are
  // computed columns on the QR Check-ins table; sending values for them yields
  // an Airtable 422 INVALID_VALUE_FOR_COLUMN. The downstream automation derives
  // the Attendance row from the linked Attendance Record / (Session, Player).
  const fields = {
    Session: [sessionId],
    Player: [playerId],
    "Scan Type": scanType,
    Method: method || "QR Code",
    "Confirmation Result": "Confirmed",
  };
  if (parentId) fields["Parent/Guardian"] = [parentId];
  if (existing?.id) fields["Attendance Record"] = [existing.id];
  if (paymentResult) fields["Payment Result"] = paymentResult;
  if (notes) fields.Notes = notes;

  try {
    const record = await airtableCreate(env, tableRef(env, "AIRTABLE_QR_CHECKINS_TABLE", "QR Check-ins"), fields);
    return json(
      {
        ok: true,
        id: record.id,
        scanType,
        sessionId,
        playerId,
        existingAttendanceId: existing?.id || null,
        forceConfirm: Boolean(forceConfirm),
      },
      200,
      env,
    );
  } catch (error) {
    if (error instanceof AirtableHttpError) {
      const detail = extractAirtableErrorDetail(error.body);
      return json(
        {
          error: "Airtable rejected the QR check-in record.",
          detail,
          status: error.status,
        },
        error.status === 422 ? 422 : 502,
        env,
      );
    }
    return json({ error: "Unable to create QR check-in record." }, 500, env);
  }
}

async function parents(env) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) {
    return [
      { id: "parent_demo_1", name: "M. Cole", email: "parent@example.com", parentalResponsibility: true },
    ];
  }
  const records = await airtableList(
    env,
    tableRef(env, "AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS),
    { pageSize: "100" },
  );
  return records.map((record) => ({
    id: record.id,
    name: record.fields["Full Name"] || record.fields.Name || record.fields["Parent/Guardian Name"] || "",
    email: record.fields.Email || "",
    phone: record.fields.Phone || "",
    relationship: record.fields.Relationship || "",
    parentalResponsibility: Boolean(record.fields["Parental Responsibility"]),
  }));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/admin-data") return json(await adminData(env), 200, env);
      if (request.method === "GET" && url.pathname === "/coach") return json((await adminData(env)).coach, 200, env);
      if (request.method === "GET" && url.pathname === "/players") return json((await adminData(env)).players, 200, env);
      if (request.method === "GET" && url.pathname === "/parents") return json(await parents(env), 200, env);
      if (request.method === "POST" && url.pathname === "/media-consent") return saveConsent(request, env);
      if (request.method === "GET" && url.pathname === "/sessions") {
        const scope = url.searchParams.get("scope") || "upcoming";
        if (!["upcoming", "past", "all"].includes(scope)) return json({ error: "Invalid scope." }, 400, env);
        return json({ sessions: await listSessions(env, scope), scope, updatedAt: new Date().toISOString() }, 200, env);
      }
      if (request.method === "GET" && url.pathname === "/attendance") {
        const sessionId = url.searchParams.get("sessionId") || undefined;
        return json(
          { attendance: await listAttendanceRecords(env, sessionId), sessionId: sessionId || null, updatedAt: new Date().toISOString() },
          200,
          env,
        );
      }
      if (request.method === "POST" && url.pathname === "/qr-checkins") return createQrCheckin(request, env);
      return json({ error: "Not found" }, 404, env);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Unexpected API error" }, 500, env);
    }
  },
};
