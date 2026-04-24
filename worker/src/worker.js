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
      return json({ error: "Not found" }, 404, env);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Unexpected API error" }, 500, env);
    }
  },
};
