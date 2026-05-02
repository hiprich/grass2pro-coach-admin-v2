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
    { id: "overview", label: "Overview", count: 4, icon: "home" },
    { id: "players", label: "Players", count: 4, icon: "users" },
    { id: "safeguarding", label: "Safeguarding", count: 2, icon: "shield" },
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

function encodeTable(table) {
  return table
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
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

  if (!response.ok) throw new Error(await response.text());
  return response.json();
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
    progressScore: Number.isFinite(progress) ? progress : 0,
  };
}

function buildSidebar(players) {
  const needsAction = players.filter((player) => player.consentStatus === "red" || player.consentStatus === "grey").length;
  return [
    { id: "overview", label: "Overview", count: players.length, icon: "home" },
    { id: "players", label: "Players", count: players.length, icon: "users" },
    { id: "safeguarding", label: "Safeguarding", count: needsAction, icon: "shield" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" },
  ];
}

async function adminData(env) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) return demoData;
  const coachParams = { maxRecords: "1" };
  if (env.AIRTABLE_COACH_FILTER) coachParams.filterByFormula = env.AIRTABLE_COACH_FILTER;
  const [coachRecords, playerRecords] = await Promise.all([
    airtableList(env, env.AIRTABLE_COACHES_TABLE || "Coaches", coachParams),
    airtableList(env, env.AIRTABLE_PLAYERS_TABLE || "Players", { pageSize: "100" }),
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
  const record = await airtableCreate(env, env.AIRTABLE_MEDIA_CONSENTS_TABLE || "Media Consents", fields);
  return json({ ok: true, id: record.id, demo: Boolean(record.demo), selectedPermissions }, 200, env);
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
  return {
    id: record.id || crypto.randomUUID(),
    sessionId: stringValue(sessionLink, ""),
    playerId: stringValue(playerLink, ""),
    playerName: stringValue(fields["Player Name"] || fields.Player, ""),
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

async function findAttendance(env, sessionId, playerId) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) return null;
  const safeSession = String(sessionId).replace(/'/g, "\\'");
  const safePlayer = String(playerId).replace(/'/g, "\\'");
  const params = {
    pageSize: "1",
    maxRecords: "1",
    filterByFormula: `AND(SEARCH('${safeSession}', ARRAYJOIN({Session})), SEARCH('${safePlayer}', ARRAYJOIN({Player})))`,
  };
  const records = await airtableList(env, env.AIRTABLE_ATTENDANCE_TABLE || "Attendance", params);
  return records.length > 0 ? records[0] : null;
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
  const records = await airtableList(env, env.AIRTABLE_SESSIONS_TABLE || "Sessions", params);
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
  const records = await airtableList(env, env.AIRTABLE_ATTENDANCE_TABLE || "Attendance", params);
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
    scanTime,
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

  const attendanceRecordIdText = existing?.id || `pending:${sessionId}:${playerId}`;
  const fields = {
    Session: [sessionId],
    Player: [playerId],
    "Scan Type": scanType,
    "Scan Time": scanTime || new Date().toISOString(),
    Method: method || "QR",
    "Confirmation Result": "Confirmed",
    "Attendance Record ID Text": attendanceRecordIdText,
  };
  if (parentId) fields["Parent/Guardian"] = [parentId];
  if (existing?.id) fields["Attendance Record"] = [existing.id];
  if (paymentResult) fields["Payment Result"] = paymentResult;
  if (notes) fields.Notes = notes;

  const record = await airtableCreate(env, env.AIRTABLE_QR_CHECKINS_TABLE || "QR Check-ins", fields);
  return json(
    {
      ok: true,
      id: record.id,
      scanType,
      sessionId,
      playerId,
      attendanceRecordIdText,
      existingAttendanceId: existing?.id || null,
      forceConfirm: Boolean(forceConfirm),
    },
    200,
    env,
  );
}

async function parents(env) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) {
    return [
      { id: "parent_demo_1", name: "M. Cole", email: "parent@example.com", parentalResponsibility: true },
    ];
  }
  const records = await airtableList(env, env.AIRTABLE_PARENTS_TABLE || "Parents", { pageSize: "100" });
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
