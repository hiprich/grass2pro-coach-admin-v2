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

// netlify/functions/media-consent.mjs
var media_consent_exports = {};
__export(media_consent_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(media_consent_exports);

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
var COACH_SLUG_TO_RECORD_ID = {
  hope: "rect8JRrno85KaRNG",
  "hope-bouhe": "rect8JRrno85KaRNG",
  cobby: "recmp3FJkW3A9yyvm",
  "cobby-jones": "recmp3FJkW3A9yyvm"
};
async function resolveCoachRecordIdFromSlug(slug) {
  const key = String(slug || "").trim().toLowerCase().replace(/^\/+/, "").split(/[/?#]/)[0];
  if (!key) return null;
  if (COACH_SLUG_TO_RECORD_ID[key]) return COACH_SLUG_TO_RECORD_ID[key];
  if (!hasAirtableConfig()) return null;
  const table = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  const records = await airtableList(table, { pageSize: 100, maxRecords: 200 });
  for (const rec of records) {
    const fields = rec?.fields || {};
    const raw = stringValue(
      fields["Public Slug"] || fields["URL Slug"] || fields["Page Slug"] || fields.Slug,
      ""
    ).trim().toLowerCase().replace(/^\/+/, "").split(/[/?#]/)[0];
    if (raw === key) return rec.id;
  }
  return null;
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

// netlify/functions/media-consent.mjs
var required = ["childName", "parentName", "parentEmail"];
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(value) {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed);
}
function isValidPhone(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return true;
  const digits = trimmed.replace(/\D+/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  return /^[+()\-.\s\d]+$/.test(trimmed);
}
function normaliseDateOfBirth(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = /* @__PURE__ */ new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const todayUtc = /* @__PURE__ */ new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  if (parsed.getTime() > todayUtc.getTime()) return null;
  return trimmed;
}
var PERMISSION_FIELD_MAP = {
  photoTraining: "Photo Permission",
  videoTraining: "Video Permission",
  internalReports: "Internal Coaching Use",
  website: "Website Use",
  social: "Social Media Use",
  press: "Press/Partner Use"
};
var UI_PERMISSION_KEYS = Object.keys(PERMISSION_FIELD_MAP);
var PERMISSION_TYPE_MAP = {
  photoTraining: "Photos during sessions",
  photoMatch: "Photos during matches",
  videoTraining: "Video for coaching review",
  videoMatch: "Video during matches",
  internalReports: "Parent progress reports",
  website: "Club website",
  social: "Social media",
  press: "Press/partner use"
};
var CHIP_ONLY_PERMISSION_KEYS = ["photoMatch", "videoMatch"];
var ALL_MEDIA_PERMISSION_KEYS = [...UI_PERMISSION_KEYS, ...CHIP_ONLY_PERMISSION_KEYS];
var INFO_SHARING_TYPE_MAP = {
  emergencyContact: "Emergency contact sharing",
  medicalInformation: "Medical information sharing"
};
var PARENT_RELATIONSHIP_CHOICES = ["Mother", "Father", "Guardian", "Carer", "Other"];
var FOOTBALL_PATHWAY_CHOICES = [
  "Grassroots Football",
  "Academy Football",
  "School Football",
  "Not Currently With a Team",
  "Other / Unsure"
];
function normaliseFootballPathway(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const match = FOOTBALL_PATHWAY_CHOICES.find((choice) => choice.toLowerCase() === lower);
  return match || "";
}
function formatLondonTimestamp(date) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    const day = get("day");
    const month = get("month");
    const year = get("year");
    const hour = get("hour");
    const minute = get("minute");
    if (day && month && year && hour && minute) {
      return `${day}/${month}/${year} ${hour}:${minute}`;
    }
  } catch {
  }
  const iso = date.toISOString();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)} UTC`;
}
function buildConsentRecordLabel(childName, parentName, date) {
  const child = String(childName || "").trim() || "Unknown child";
  const parent = String(parentName || "").trim() || "Unknown parent";
  return `${child} - ${parent} - Consent - ${formatLondonTimestamp(date)}`;
}
function normaliseRelationship(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const exact = PARENT_RELATIONSHIP_CHOICES.find((choice) => choice.toLowerCase() === lower);
  if (exact) return exact;
  if (lower === "mum" || lower === "mom") return "Mother";
  if (lower === "dad") return "Father";
  return "Other";
}
var handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const missing = required.filter((key) => !payload[key]);
  if (missing.length > 0 || !payload.parentalResponsibility || !payload.withdrawalProcessAcknowledged) {
    return json(400, {
      error: "Missing required consent fields.",
      missing
    });
  }
  if (!isValidEmail(payload.parentEmail)) {
    return json(400, {
      error: "Parent email is not a valid email address.",
      field: "parentEmail"
    });
  }
  if (!isValidPhone(payload.parentPhone)) {
    return json(400, {
      error: "Parent phone number must contain 10-15 digits and only common phone formatting.",
      field: "parentPhone"
    });
  }
  const dateOfBirth = normaliseDateOfBirth(payload.childDateOfBirth);
  if (payload.childDateOfBirth && !dateOfBirth) {
    return json(400, {
      error: "Player date of birth must be a valid past date in YYYY-MM-DD format.",
      field: "childDateOfBirth"
    });
  }
  let coachRecordId = null;
  const rawCoachId = String(payload.coachRecordId || "").trim();
  if (rawCoachId.startsWith("rec")) {
    coachRecordId = rawCoachId;
  } else if (payload.coachSlug) {
    try {
      coachRecordId = await resolveCoachRecordIdFromSlug(payload.coachSlug);
    } catch (error) {
      console.warn("[media-consent] Could not resolve coach slug:", error);
    }
  }
  const footballPathway = normaliseFootballPathway(payload.footballPathway);
  const permissions = payload.permissions || {};
  const selectedMediaKeys = ALL_MEDIA_PERMISSION_KEYS.filter((key) => Boolean(permissions[key]));
  const infoSharing = payload.infoSharing || {};
  const selectedInfoSharingKeys = Object.keys(INFO_SHARING_TYPE_MAP).filter(
    (key) => Boolean(infoSharing[key])
  );
  const consentStatus = selectedMediaKeys.length === 0 ? "Needs Review" : selectedMediaKeys.length < ALL_MEDIA_PERMISSION_KEYS.length ? "Limited" : "Active";
  const consentTypes = Array.from(
    new Set(
      [
        ...selectedMediaKeys.map((key) => PERMISSION_TYPE_MAP[key]),
        ...selectedInfoSharingKeys.map((key) => INFO_SHARING_TYPE_MAP[key])
      ].filter(Boolean)
    )
  );
  const permissionFields = {};
  for (const [key, fieldName] of Object.entries(PERMISSION_FIELD_MAP)) {
    permissionFields[fieldName] = Boolean(permissions[key]);
  }
  const headers = event.headers || {};
  const submittedIp = headers["x-nf-client-connection-ip"] || headers["x-forwarded-for"]?.split(",")[0]?.trim() || headers["client-ip"] || "";
  const submittedUserAgent = headers["user-agent"] || "";
  const submittedAt = /* @__PURE__ */ new Date();
  const consentRecordLabel = buildConsentRecordLabel(
    payload.childName,
    payload.parentName,
    submittedAt
  );
  const evidenceLines = [
    `Consent record: ${consentRecordLabel}`,
    `Child: ${payload.childName}`,
    dateOfBirth ? `Date of birth: ${dateOfBirth}` : null,
    payload.ageGroup ? `Age group: ${payload.ageGroup}` : null,
    footballPathway ? `Football pathway: ${footballPathway}` : null,
    `Parent/Guardian: ${payload.parentName} <${payload.parentEmail}>`,
    payload.parentPhone ? `Phone: ${payload.parentPhone}` : null,
    payload.relationship ? `Relationship: ${payload.relationship}` : null,
    `Selected permissions: ${selectedMediaKeys.length > 0 ? selectedMediaKeys.join(", ") : "none"}`,
    `Information sharing: ${selectedInfoSharingKeys.length > 0 ? selectedInfoSharingKeys.map((key) => INFO_SHARING_TYPE_MAP[key]).join(", ") : "none"}`,
    payload.usageDetails ? `Usage details: ${payload.usageDetails}` : null,
    payload.storageDuration ? `Storage duration: ${payload.storageDuration}` : null
  ].filter(Boolean);
  const fields = {
    "Consent Record": consentRecordLabel,
    "Consent Status": consentStatus,
    ...permissionFields,
    "Parental Responsibility Confirmed": Boolean(payload.parentalResponsibility),
    "Child Consulted": Boolean(payload.childConsulted),
    "Withdrawal Process Acknowledged": Boolean(payload.withdrawalProcessAcknowledged),
    "Usage Details Acknowledged": Boolean(payload.usageDetails),
    "Storage Duration Acknowledged": Boolean(payload.storageDuration),
    "Withdrawal Requested": false,
    "Submitted By Name": payload.parentName,
    "Consent Evidence Text": evidenceLines.join("\n"),
    Notes: payload.notes || ""
  };
  if (consentTypes.length > 0) {
    fields["Consent Type"] = consentTypes;
  }
  if (submittedIp) fields["Submitted IP Address"] = submittedIp;
  if (submittedUserAgent) {
    fields["Submitted User Agent"] = submittedUserAgent;
    fields["Submitted Device"] = submittedUserAgent;
  }
  let playerId = null;
  let players = null;
  if (hasAirtableConfig()) {
    try {
      players = await loadPlayers();
      playerId = matchPlayerByName(players, payload.childName);
    } catch (error) {
      console.error("Player lookup failed:", error);
    }
    let parentId;
    try {
      parentId = await resolveOrCreateParent(payload, playerId);
      if (parentId) {
        fields["Parent/Guardian"] = [parentId];
      } else {
        return json(500, {
          error: "Unable to resolve or create the Parent/Guardian record for this consent."
        });
      }
    } catch (error) {
      console.error("Parent/Guardian resolve-or-create failed:", error);
      if (error instanceof AirtableHttpError) {
        const detail = extractAirtableErrorDetail(error.body);
        return json(error.status === 422 ? 422 : 502, {
          error: "Airtable rejected the Parent/Guardian record.",
          detail,
          status: error.status
        });
      }
      return json(502, {
        error: "Unable to resolve or create the Parent/Guardian record.",
        detail: error instanceof Error ? error.message : void 0
      });
    }
    if (!playerId && parentId && Array.isArray(players)) {
      playerId = matchPlayerByParent(players, parentId, payload.childName);
    }
    if (!playerId && parentId) {
      try {
        playerId = await createPlayerForConsent(payload, parentId, dateOfBirth, coachRecordId);
      } catch (error) {
        console.error("Player create-on-consent failed:", error);
        if (error instanceof AirtableHttpError) {
          const detail = extractAirtableErrorDetail(error.body);
          return json(error.status === 422 ? 422 : 502, {
            error: "Unable to create the Player record for this consent submission.",
            detail,
            status: error.status
          });
        }
        return json(502, {
          error: "Unable to create the Player record for this consent submission.",
          detail: error instanceof Error ? error.message : void 0
        });
      }
      if (!playerId) {
        return json(500, {
          error: "Unable to create the Player record for this consent submission."
        });
      }
    }
    if (playerId) fields.Player = [playerId];
    if (dateOfBirth && playerId) {
      try {
        await airtableUpdate(
          tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
          playerId,
          { "Date of Birth": dateOfBirth }
        );
      } catch (error) {
        console.error("Player Date of Birth update failed:", error);
      }
    }
    if (footballPathway && playerId) {
      try {
        await airtableUpdate(
          tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
          playerId,
          { "Football Pathway": footballPathway }
        );
      } catch (error) {
        console.error("Player Football Pathway update failed:", error);
      }
    }
    const submittedParentEmail = String(payload.parentEmail || "").trim();
    if (submittedParentEmail && playerId) {
      try {
        await airtableUpdate(
          tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
          playerId,
          { "Parent Email": submittedParentEmail }
        );
      } catch (error) {
        console.error("Player Parent Email update failed:", error);
      }
    }
  }
  try {
    const record = await airtableCreate(
      tableName("AIRTABLE_MEDIA_CONSENTS_TABLE", "Media Consents", TABLE_IDS.MEDIA_CONSENTS),
      fields,
      // typecast lets Airtable add new "Consent Type" choices on the fly. We
      // moved from grouped chips ("Media/photo/video") to purpose-level chips
      // ("Photos during sessions") and the multi-select field would otherwise
      // reject any label that isn't already in its option list.
      { typecast: true }
    );
    return json(200, {
      ok: true,
      id: record.id,
      demo: Boolean(record.demo),
      consentStatus,
      consentTypes,
      selectedPermissions: selectedMediaKeys,
      selectedInfoSharing: selectedInfoSharingKeys,
      linkedPlayer: Boolean(fields.Player),
      linkedParent: Boolean(fields["Parent/Guardian"])
    });
  } catch (error) {
    console.error("Media consent create failed:", error);
    if (error instanceof AirtableHttpError) {
      const detail = extractAirtableErrorDetail(error.body);
      return json(error.status === 422 ? 422 : 502, {
        error: "Airtable rejected the consent record.",
        detail,
        status: error.status
      });
    }
    return json(500, { error: "Unable to save consent record." });
  }
};
function playerNameOf(record) {
  const fields = record?.fields || {};
  return String(fields["Full Name"] || fields.Name || fields["Player Name"] || "").trim();
}
function playerGuardianIds(record) {
  const fields = record?.fields || {};
  const raw = fields["Parent/Guardian"] || fields.Parent || fields.Guardian;
  if (!Array.isArray(raw)) return [];
  return raw.filter((value) => typeof value === "string" && value.startsWith("rec"));
}
async function loadPlayers() {
  const records = await airtableList(
    tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
    { pageSize: "100" }
  );
  return records.map((record) => ({
    id: record.id,
    name: playerNameOf(record),
    guardianIds: playerGuardianIds(record)
  }));
}
function matchPlayerByName(players, childName) {
  if (!Array.isArray(players) || players.length === 0) return null;
  const trimmed = String(childName || "").trim().toLowerCase();
  if (!trimmed) return null;
  const exact = players.find((player) => player.name.toLowerCase() === trimmed);
  if (exact) return exact.id;
  const startsWith = players.filter(
    (player) => player.name.toLowerCase().startsWith(`${trimmed} `)
  );
  if (startsWith.length === 1) return startsWith[0].id;
  const firstToken = trimmed.split(/\s+/)[0];
  if (firstToken) {
    const firstNameMatches = players.filter((player) => {
      const candidateFirst = player.name.toLowerCase().split(/\s+/)[0];
      return candidateFirst && candidateFirst === firstToken;
    });
    if (firstNameMatches.length === 1) return firstNameMatches[0].id;
  }
  const contains = players.filter(
    (player) => player.name.toLowerCase().includes(trimmed)
  );
  if (contains.length === 1) return contains[0].id;
  return null;
}
function matchPlayerByParent(players, parentId, childName) {
  if (!Array.isArray(players) || !parentId) return null;
  const candidates = players.filter((player) => player.guardianIds.includes(parentId));
  if (candidates.length === 0) return null;
  const trimmed = String(childName || "").trim().toLowerCase();
  if (!trimmed) return null;
  const exact = candidates.find((player) => player.name.toLowerCase() === trimmed);
  if (exact) return exact.id;
  const startsWith = candidates.filter(
    (player) => player.name.toLowerCase().startsWith(`${trimmed} `)
  );
  if (startsWith.length === 1) return startsWith[0].id;
  const firstToken = trimmed.split(/\s+/)[0];
  if (firstToken) {
    const firstNameMatches = candidates.filter((player) => {
      const candidateFirst = player.name.toLowerCase().split(/\s+/)[0];
      return candidateFirst && candidateFirst === firstToken;
    });
    if (firstNameMatches.length === 1) return firstNameMatches[0].id;
  }
  if (candidates.length === 1) {
    const only = candidates[0];
    if (only.name.toLowerCase().includes(trimmed)) return only.id;
  }
  return null;
}
var PLAYER_NAME_FIELD_CANDIDATES = ["Full Name", "Name", "Player Name"];
var PLAYER_PARENT_FIELD_CANDIDATES = ["Parent/Guardian", "Parents/Guardians", "Parent", "Guardian"];
function isUnknownFieldError(error) {
  if (!(error instanceof AirtableHttpError)) return false;
  const body = String(error.body || "");
  return body.includes("UNKNOWN_FIELD_NAME") || body.includes("Unknown field name");
}
async function createPlayerForConsent(payload, parentId, dateOfBirth, coachRecordId) {
  const fullName = String(payload.childName || "").trim();
  if (!fullName) return null;
  const table = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  const footballPathway = normaliseFootballPathway(payload.footballPathway);
  let lastError = null;
  for (const nameField of PLAYER_NAME_FIELD_CANDIDATES) {
    const parentCandidates = parentId ? PLAYER_PARENT_FIELD_CANDIDATES : [null];
    for (const parentField of parentCandidates) {
      const playerFields = { [nameField]: fullName };
      if (dateOfBirth) playerFields["Date of Birth"] = dateOfBirth;
      if (footballPathway) playerFields["Football Pathway"] = footballPathway;
      if (parentField && parentId) playerFields[parentField] = [parentId];
      const trimmedParentEmail = String(payload.parentEmail || "").trim();
      if (trimmedParentEmail) playerFields["Parent Email"] = trimmedParentEmail;
      if (coachRecordId) playerFields.Coach = [coachRecordId];
      try {
        const created = await airtableCreate(table, playerFields, { typecast: true });
        if (created?.id) {
          if (lastError) {
            console.warn(
              `Player create succeeded on fallback fields nameField=${nameField} parentField=${parentField || "none"} after earlier rejections.`
            );
          }
          return created.id;
        }
      } catch (error) {
        lastError = error;
        if (isUnknownFieldError(error)) {
          console.warn(
            `Player create rejected unknown field \u2014 retrying with different schema. nameField=${nameField} parentField=${parentField || "none"}: ${error.message}`
          );
          continue;
        }
        throw error;
      }
    }
  }
  if (lastError) throw lastError;
  return null;
}
async function findParentId(email, name) {
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const trimmedName = String(name || "").trim().toLowerCase();
  if (!trimmedEmail && !trimmedName) return null;
  const records = await airtableList(
    tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS),
    { pageSize: "100" }
  );
  const byEmail = trimmedEmail ? records.find((record) => {
    const candidate = String(record?.fields?.Email || "").trim().toLowerCase();
    return candidate && candidate === trimmedEmail;
  }) : null;
  if (byEmail) return byEmail.id;
  if (!trimmedName) return null;
  const byName = records.find((record) => {
    const fields = record?.fields || {};
    const candidate = String(
      fields["Full Name"] || fields.Name || fields["Parent/Guardian Name"] || ""
    ).trim().toLowerCase();
    return candidate && candidate === trimmedName;
  });
  return byName?.id || null;
}
async function resolveOrCreateParent(payload, playerId) {
  const existing = await findParentId(payload.parentEmail, payload.parentName);
  if (existing) return existing;
  const trimmedName = String(payload.parentName || "").trim();
  if (!trimmedName) return null;
  const parentFields = { "Full Name": trimmedName };
  const email = String(payload.parentEmail || "").trim();
  if (email) parentFields.Email = email;
  const phone = String(payload.parentPhone || "").trim();
  if (phone) parentFields.Phone = phone;
  const relationship = normaliseRelationship(payload.relationship);
  if (relationship) parentFields["Relationship to Player"] = relationship;
  if (payload.parentalResponsibility) {
    parentFields["Parental Responsibility Confirmed"] = true;
  }
  if (playerId) parentFields.Players = [playerId];
  const created = await airtableCreate(
    tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS),
    parentFields
  );
  return created?.id || null;
}
function extractAirtableErrorDetail(body) {
  if (!body) return void 0;
  try {
    const parsed = JSON.parse(body);
    const err = parsed?.error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      return err.message || err.type || void 0;
    }
  } catch {
  }
  return void 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=media-consent.js.map
