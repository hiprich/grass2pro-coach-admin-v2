var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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

// netlify/functions/_airtable.mjs
var airtable_exports = {};
__export(airtable_exports, {
  AirtableHttpError: () => AirtableHttpError,
  TABLE_IDS: () => TABLE_IDS,
  airtableCreate: () => airtableCreate,
  airtableGet: () => airtableGet,
  airtableList: () => airtableList,
  airtableUpdate: () => airtableUpdate,
  buildScanUrl: () => buildScanUrl,
  buildSidebar: () => buildSidebar,
  cancelSession: () => cancelSession,
  createCoachAnnouncement: () => createCoachAnnouncement,
  createSession: () => createSession,
  demoData: () => demoData,
  editSession: () => editSession,
  findAttendance: () => findAttendance,
  findCoachBySetupTokenHash: () => findCoachBySetupTokenHash,
  findCoachRecordByNormalisedEmail: () => findCoachRecordByNormalisedEmail,
  findSessionByScanToken: () => findSessionByScanToken,
  generateScanToken: () => generateScanToken,
  getCoachAndPlayers: () => getCoachAndPlayers,
  getCoachDashboardDataForSessionEmail: () => getCoachDashboardDataForSessionEmail,
  hasAirtableConfig: () => hasAirtableConfig,
  indexLatestMediaConsents: () => indexLatestMediaConsents,
  json: () => json,
  listAnnouncementsForCoachIds: () => listAnnouncementsForCoachIds,
  listAttendance: () => listAttendance,
  listMediaConsents: () => listMediaConsents,
  listPublicCoachDirectoryRows: () => listPublicCoachDirectoryRows,
  listSessions: () => listSessions,
  mergeMediaConsentsIntoPlayers: () => mergeMediaConsentsIntoPlayers,
  normaliseAnnouncement: () => normaliseAnnouncement,
  normaliseAttendance: () => normaliseAttendance,
  normaliseCoach: () => normaliseCoach,
  normalisePlayer: () => normalisePlayer,
  normalisePublicDirectoryCoach: () => normalisePublicDirectoryCoach,
  normaliseSession: () => normaliseSession,
  playerBelongsToCoach: () => playerBelongsToCoach,
  rescheduleSession: () => rescheduleSession,
  resolveCoachRecordIdFromSlug: () => resolveCoachRecordIdFromSlug,
  storeCoachSetupTokenHash: () => storeCoachSetupTokenHash,
  tableName: () => tableName
});
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
function firstAttachmentUrl(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value[0]?.url || value[0]?.thumbnails?.large?.url || "";
  }
  if (typeof value === "string") return value;
  return "";
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
function parsePartnerConfig(raw) {
  if (raw === void 0 || raw === null) return null;
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
function normaliseCoach(record) {
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
    partner: parsePartnerConfig(fields["Partner Config"])
  };
}
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
    ...monogram ? { monogram } : {},
    ...tagline ? { tagline } : {}
  };
}
function normalisePublicDirectoryCoach(record) {
  if (!record) return null;
  const fields = record?.fields || {};
  if (isHiddenFromPublicCoachDirectory(fields)) return null;
  const name = stringValue(fields["Full Name"] || fields.Name || fields["Coach Name"], "Grass2Pro Coach");
  const role = stringValue(fields.Role || fields.Title, "Coach admin");
  const credential = stringValue(fields.Qualification || fields.Credential || fields.Qualifications, "");
  const location = stringValue(
    fields.Location || fields.Venue || fields.Area || fields.City || fields["Training location"] || fields.Address,
    ""
  ).trim();
  const avatarUrl = firstAttachmentUrl(fields["Avatar Image"] || fields.Avatar || fields.Photo);
  const rawHint = stringValue(fields["Public Slug"] || fields["URL Slug"] || fields["Page Slug"] || fields.Slug, "").trim().toLowerCase();
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
    partner
  };
}
async function listPublicCoachDirectoryRows() {
  if (!hasAirtableConfig()) {
    const demo = normalisePublicDirectoryCoach({
      id: "rect8JRrno85KaRNG",
      fields: {
        "Full Name": "Hope Bouhe",
        Role: "FA Talent ID Level 2 Scout",
        Qualification: "FA Talent ID Level 2",
        Location: "Colindale Football Centre, Great Strand, NW9 5PE"
      }
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
  out.sort((a, b) => a.name.localeCompare(b.name, void 0, { sensitivity: "base" }));
  return out;
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
function playerBelongsToCoach(player, coachRecordId, { legacyUnassignedVisible = false } = {}) {
  const ids = Array.isArray(player?.coachIds) ? player.coachIds : [];
  if (!coachRecordId) return false;
  if (ids.length === 0) return legacyUnassignedVisible;
  return ids.includes(coachRecordId);
}
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
function announcementsTable() {
  return tableName("AIRTABLE_ANNOUNCEMENTS_TABLE", "Coach Announcements", TABLE_IDS.ANNOUNCEMENTS);
}
function normaliseAnnouncement(record) {
  const fields = record?.fields || {};
  const coachIds = recordIdArray(fields.Coach || fields["Lead Coach"]);
  return {
    id: record?.id || "",
    coachId: coachIds[0] || "",
    coachIds,
    title: stringValue(fields.Title || fields.Headline, "").trim(),
    body: stringValue(fields.Body || fields.Message || fields.Content, "").trim(),
    publishedAt: stringValue(fields["Published At"] || fields["Created At"] || fields.Created, ""),
    active: fields.Active === void 0 ? true : boolValue(fields.Active)
  };
}
async function listAnnouncementsForCoachIds(coachIds) {
  const wanted = new Set((coachIds || []).filter(Boolean));
  if (wanted.size === 0) return [];
  if (!hasAirtableConfig()) return [];
  try {
    const records = await airtableList(announcementsTable(), { pageSize: 100, maxRecords: 200 });
    const out = [];
    for (const rec of records) {
      const row = normaliseAnnouncement(rec);
      if (!row.active) continue;
      const matches = row.coachIds.some((id) => wanted.has(id)) || row.coachId && wanted.has(row.coachId);
      if (!matches) continue;
      if (!row.title && !row.body) continue;
      out.push(row);
    }
    out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    return out;
  } catch (error) {
    if (String(error?.message || "").includes("NOT_FOUND")) return [];
    throw error;
  }
}
async function createCoachAnnouncement({ coachId, title, body }) {
  const table = announcementsTable();
  const fields = {
    Coach: [coachId],
    Title: title,
    Body: body,
    Active: true,
    "Published At": (/* @__PURE__ */ new Date()).toISOString()
  };
  const created = await airtableCreate(table, fields, { typecast: true });
  return normaliseAnnouncement(created);
}
async function findCoachBySetupTokenHash(tokenHash) {
  if (!hasAirtableConfig() || !tokenHash) return null;
  const table = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  const records = await airtableList(table, { pageSize: 100, maxRecords: 200 });
  return records.find((rec) => {
    const stored = String(rec?.fields?.["Setup Token Hash"] || rec?.fields?.["Asset Token Hash"] || "").trim().toLowerCase();
    return stored && stored === String(tokenHash).trim().toLowerCase();
  }) || null;
}
async function storeCoachSetupTokenHash(coachRecordId, tokenHash) {
  const table = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  return airtableUpdate(table, coachRecordId, { "Setup Token Hash": tokenHash });
}
function buildSidebar(players, counts = {}) {
  const needsAction = players.filter((player) => player.consentStatus === "red" || player.consentStatus === "grey").length;
  return [
    { id: "overview", label: "Overview", count: players.length, icon: "home" },
    { id: "players", label: "Players", count: players.length, icon: "users" },
    { id: "sessions", label: "Sessions", count: counts.sessions ?? 0, icon: "calendar" },
    { id: "attendance", label: "Attendance", count: counts.attendance ?? 0, icon: "clipboard" },
    { id: "safeguarding", label: "Safeguarding", count: needsAction, icon: "shield" },
    { id: "payments", label: "Payments", count: counts.payments ?? 0, icon: "pound" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" }
  ];
}
async function getCoachAndPlayers() {
  if (!hasAirtableConfig()) return demoData;
  const coachParams = { maxRecords: "1" };
  if (process.env.AIRTABLE_COACH_FILTER) coachParams.filterByFormula = process.env.AIRTABLE_COACH_FILTER;
  const [coachRecords, playerRecords] = await Promise.all([
    airtableList(tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES), coachParams),
    airtableList(tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS), { pageSize: "100" })
  ]);
  const coach = normaliseCoach(coachRecords[0]);
  const players = playerRecords.map(normalisePlayer);
  return {
    coach,
    players,
    sidebar: buildSidebar(players),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function findCoachRecordByNormalisedEmail(normalisedEmail) {
  if (!hasAirtableConfig()) return null;
  const coachesTable = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  const formula = `LOWER(TRIM({Email}))='${escapeFormulaString(normalisedEmail)}'`;
  const records = await airtableList(coachesTable, {
    filterByFormula: formula,
    maxRecords: "1"
  });
  return records[0] || null;
}
async function getCoachDashboardDataForSessionEmail(normalisedEmail) {
  if (!hasAirtableConfig()) return demoData;
  const coachRecord = await findCoachRecordByNormalisedEmail(normalisedEmail);
  if (!coachRecord) {
    const err = new Error("coach_not_found");
    err.code = "COACH_NOT_FOUND";
    throw err;
  }
  const coach = normaliseCoach(coachRecord);
  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  const coachesTable = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  const [playerRecords, coachRecords] = await Promise.all([
    airtableList(playersTable, { pageSize: "100" }),
    airtableList(coachesTable, { pageSize: 100, maxRecords: 50 })
  ]);
  const legacyUnassigned = coachRecords.length <= 1;
  const players = playerRecords.map(normalisePlayer).filter((player) => playerBelongsToCoach(player, coachRecord.id, { legacyUnassigned }));
  return {
    coach,
    players,
    sidebar: buildSidebar(players),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
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
async function listAttendance({ sessionId } = {}) {
  const table = tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance", TABLE_IDS.ATTENDANCE);
  if (!hasAirtableConfig()) return demoAttendance();
  const params = { pageSize: "100" };
  if (sessionId) {
    params.filterByFormula = `SEARCH('${escapeFormulaString(sessionId)}', ARRAYJOIN({Session}))`;
  }
  const records = await airtableList(table, params);
  return records.map(normaliseAttendance);
}
async function listMediaConsents() {
  const table = tableName("AIRTABLE_MEDIA_CONSENTS_TABLE", "Media Consents", TABLE_IDS.MEDIA_CONSENTS);
  if (!hasAirtableConfig()) return [];
  const params = { pageSize: "100" };
  const records = await airtableList(table, params);
  return records;
}
function mediaConsentTimestamp(record) {
  const fields = record?.fields || {};
  const raw = fields["Submitted At"] || fields["Submission Date"] || fields["Date Submitted"] || fields["Created"] || record?.createdTime || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
function consentTypeChips(record) {
  const raw = record?.fields?.["Consent Type"];
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => String(value || "").toLowerCase().trim()).filter(Boolean);
}
function chipImpliesPhoto(chips) {
  return chips.some((chip) => {
    if (chip.includes("match")) return false;
    return chip === "photos during sessions" || chip === "photos during training" || chip.includes("session photo") || chip.includes("training photo") || chip.includes("media/") || chip === "media" || chip.includes("image") || // Bare "photo" / "photos" chips predate the match split — treat them
    // as session-only photo grants.
    chip === "photo" || chip === "photos";
  });
}
function chipImpliesMatchPhoto(chips) {
  return chips.some(
    (chip) => chip === "photos during matches" || chip === "match photos" || chip.includes("match photo") || chip.includes("photos during match") || chip.includes("photos at match") || chip.includes("matchday photo") || chip.includes("match-day photo")
  );
}
function chipImpliesVideo(chips) {
  return chips.some((chip) => {
    if (chip.includes("during match") || chip.includes("match video") || chip === "match videos") {
      return false;
    }
    return chip === "video for coaching review" || chip.includes("coaching review") || chip.includes("media/") || chip === "media" || // Bare "video" / "videos" chips predate the match split — treat them
    // as coaching-review-only video grants.
    chip === "video" || chip === "videos";
  });
}
function chipImpliesMatchVideo(chips) {
  return chips.some(
    (chip) => chip === "video during matches" || chip === "match video" || chip === "match videos" || chip.includes("match video") || chip.includes("video during match") || chip.includes("video at match") || chip.includes("matchday video") || chip.includes("match-day video")
  );
}
function chipImpliesWebsite(chips) {
  return chips.some(
    (chip) => chip.includes("website") || chip.includes("club website") || chip.includes("club site")
  );
}
function chipImpliesSocial(chips) {
  return chips.some((chip) => chip.includes("social"));
}
function chipImpliesHighlights(chips) {
  return chips.some((chip) => chip.includes("highlight") || chip.includes("reel"));
}
function permissionsFromMediaConsent(record) {
  const fields = record?.fields || {};
  const chips = consentTypeChips(record);
  return {
    photoConsent: boolValue(fields["Photo Permission"]) || chipImpliesPhoto(chips),
    videoConsent: boolValue(fields["Video Permission"]) || chipImpliesVideo(chips),
    matchPhotoConsent: boolValue(fields["Match Photo Permission"]) || chipImpliesMatchPhoto(chips),
    matchVideoConsent: boolValue(fields["Match Video Permission"]) || chipImpliesMatchVideo(chips),
    websiteConsent: boolValue(fields["Website Use"]) || chipImpliesWebsite(chips),
    socialConsent: boolValue(fields["Social Media Use"]) || chipImpliesSocial(chips),
    highlightsConsent: boolValue(fields["Highlights/Reels Use"]) || chipImpliesHighlights(chips),
    internalReportsConsent: boolValue(fields["Internal Coaching Use"]) || chips.some(
      (chip) => chip.includes("match report") || chip.includes("internal") || chip.includes("progress report") || chip.includes("coaching review")
    ),
    pressConsent: boolValue(fields["Press/Partner Use"]) || chips.some((chip) => chip.includes("press") || chip.includes("partner")),
    // Information-sharing grants live on the same row as the media chips. They
    // are independent of media consent status but the dashboard still needs to
    // surface them so coaches can see exactly what each parent agreed to.
    emergencyContactConsent: boolValue(fields["Emergency Contact Sharing"]) || chips.some((chip) => chip.includes("emergency contact")),
    medicalInformationConsent: boolValue(fields["Medical Information Sharing"]) || chips.some((chip) => chip.includes("medical"))
  };
}
function consentStatusFromMediaConsent(record) {
  const fields = record?.fields || {};
  if (boolValue(fields["Withdrawal Requested"])) return "red";
  const withdrawalDate = stringValue(fields["Withdrawal Date"]);
  if (withdrawalDate) return "red";
  const explicit = stringValue(fields["Consent Status"]).toLowerCase();
  if (explicit.includes("withdraw")) return "red";
  const perms = permissionsFromMediaConsent(record);
  const flags = [
    perms.photoConsent,
    perms.videoConsent,
    perms.matchPhotoConsent,
    perms.matchVideoConsent,
    perms.websiteConsent,
    perms.socialConsent,
    perms.internalReportsConsent,
    perms.pressConsent
  ];
  const granted = flags.filter(Boolean).length;
  const allGranted = granted === flags.length;
  if (explicit === "active" && allGranted) return "green";
  if (allGranted) return "green";
  if (granted > 0) return "amber";
  if (explicit === "limited") return "amber";
  if (explicit.includes("needs review") || explicit.includes("not")) return "grey";
  return "grey";
}
function consentRecordChildName(record) {
  const fields = record?.fields || {};
  const label = stringValue(fields["Consent Record"]);
  if (label) {
    const head = label.split(" - ")[0];
    if (head) return head.trim().toLowerCase();
  }
  const direct = stringValue(fields["Child Name"] || fields.Child || fields["Player Name"]);
  return direct ? direct.trim().toLowerCase() : "";
}
function indexLatestMediaConsents(records) {
  const byPlayerId = /* @__PURE__ */ new Map();
  const byGuardianId = /* @__PURE__ */ new Map();
  const byChildName = /* @__PURE__ */ new Map();
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
      for (const guardianId of guardianLinks) upsert(byGuardianId, guardianId, record, ts);
    }
    upsert(byChildName, consentRecordChildName(record), record, ts);
  }
  return { byPlayerId, byGuardianId, byChildName };
}
function resolveMediaConsentEntry(player, players, indexes) {
  const candidates = [];
  const direct = indexes.byPlayerId.get(player.id);
  if (direct) candidates.push(direct);
  const guardianIds = Array.isArray(player.guardianIds) ? player.guardianIds : recordIdArray(player.guardianIds || player.guardianName);
  for (const guardianId of guardianIds) {
    const playersForGuardian = players.filter(
      (other) => Array.isArray(other.guardianIds) && other.guardianIds.includes(guardianId)
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
function mergeMediaConsentsIntoPlayers(players, consentRecords) {
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
      medicalInformationConsent: perms.medicalInformationConsent
    };
  });
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
      coachNotes: "Demo attendance \u2014 Airtable env vars not set.",
      checkInMethod: "QR",
      confirmationStatus: "Confirmed",
      paymentStatus: "Paid",
      attendanceRecordIdText: "att_demo_01"
    }
  ];
}
var AIRTABLE_API, json, demoData, TABLE_IDS, AirtableHttpError, COACH_SLUG_TO_RECORD_ID;
var init_airtable = __esm({
  "netlify/functions/_airtable.mjs"() {
    AIRTABLE_API = "https://api.airtable.com/v0";
    json = (statusCode, body) => ({
      statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(body)
    });
    demoData = {
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
    TABLE_IDS = {
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
    AirtableHttpError = class extends Error {
      constructor(message, { status, body, table } = {}) {
        super(message);
        this.name = "AirtableHttpError";
        this.status = status;
        this.body = body;
        this.table = table;
      }
    };
    COACH_SLUG_TO_RECORD_ID = {
      hope: "rect8JRrno85KaRNG",
      "hope-bouhe": "rect8JRrno85KaRNG",
      cobby: "recmp3FJkW3A9yyvm",
      "cobby-jones": "recmp3FJkW3A9yyvm"
    };
  }
});

// netlify/functions/coach-register.mjs
var coach_register_exports = {};
__export(coach_register_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(coach_register_exports);
init_airtable();
var RESEND_ENDPOINT = "https://api.resend.com/emails";
var COACH_REGISTRATIONS_TABLE = "Coach Registrations";
var HOPE_COACH = {
  name: "Hope Bouhe",
  airtableRecordId: "rect8JRrno85KaRNG",
  email: process.env.HOPE_EMAIL || process.env.G2P_LEADS_EMAIL || "leads@grass2pro.com"
};
var COBBY_COACH = {
  name: "Cobby Jones",
  airtableRecordId: "recmp3FJkW3A9yyvm",
  email: process.env.COBBY_EMAIL || process.env.G2P_LEADS_EMAIL || "leads@grass2pro.com"
};
var COACH_DIRECTORY = {
  hope: HOPE_COACH,
  "hope-bouhe": HOPE_COACH,
  cobby: COBBY_COACH,
  "cobby-jones": COBBY_COACH
};
async function resolveCoachForRegistration(coachSlug) {
  const fromDirectory = COACH_DIRECTORY[coachSlug];
  if (fromDirectory) return fromDirectory;
  const recordId = await resolveCoachRecordIdFromSlug(coachSlug);
  if (!recordId) return null;
  if (!hasAirtableConfig()) {
    return {
      name: coachSlug,
      airtableRecordId: recordId,
      email: process.env.G2P_LEADS_EMAIL || "leads@grass2pro.com"
    };
  }
  try {
    const table = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
    const record = await airtableGet(table, recordId);
    const row = normaliseCoach(record);
    const email = (row.email && row.email.includes("@") ? row.email : null) || (coachSlug.startsWith("hope") ? process.env.HOPE_EMAIL : null) || (coachSlug.startsWith("cobby") ? process.env.COBBY_EMAIL : null) || process.env.G2P_LEADS_EMAIL || "leads@grass2pro.com";
    return {
      name: row.name || "Grass2Pro Coach",
      airtableRecordId: recordId,
      email: String(email).trim().toLowerCase()
    };
  } catch (error) {
    console.warn("[coach-register] Could not load coach from Airtable:", error);
    return {
      name: coachSlug,
      airtableRecordId: recordId,
      email: process.env.G2P_LEADS_EMAIL || "leads@grass2pro.com"
    };
  }
}
var json2 = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});
var VALID_AGE_GROUPS = /* @__PURE__ */ new Set(["U7", "U8", "U9", "U10", "U11", "U12"]);
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function clean(value, max = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function buildCoachEmailHtml({ coachName, parentName, parentEmail, parentPhone, childName, ageGroup, message, source }) {
  const safe = {
    coach: escapeHtml(coachName),
    parentName: escapeHtml(parentName),
    parentEmail: escapeHtml(parentEmail),
    parentPhone: escapeHtml(parentPhone || "\u2014"),
    childName: escapeHtml(childName),
    age: escapeHtml(ageGroup),
    message: escapeHtml(message || "\u2014"),
    source: escapeHtml(source || "direct")
  };
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background:#0b0d0a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#f3f5ee;">
    <div style="max-width:560px; margin:0 auto; padding:32px 20px;">
      <div style="background:#11140e; border:2px solid #c9e970; border-radius:18px; padding:28px;">
        <div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#c9e970; font-weight:800; margin-bottom:6px;">New registration \xB7 Grass2Pro</div>
        <h1 style="font-size:22px; line-height:1.25; margin:0 0 18px; color:#ffffff;">${safe.parentName} wants to register ${safe.childName} (${safe.age}) with ${safe.coach}.</h1>

        <table role="presentation" style="width:100%; border-collapse:collapse; margin:18px 0;">
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Parent</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; font-weight:600; text-align:right;">${safe.parentName}</td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Email</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; text-align:right;"><a href="mailto:${safe.parentEmail}" style="color:#c9e970; text-decoration:none;">${safe.parentEmail}</a></td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Phone</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; text-align:right;">${safe.parentPhone}</td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Child</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; font-weight:600; text-align:right;">${safe.childName}</td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Age group</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; text-align:right;">${safe.age}</td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Source</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; text-align:right;">${safe.source}</td></tr>
        </table>

        <div style="background:#0b0d0a; border:1px solid #2a2f24; border-radius:12px; padding:16px; margin:12px 0 20px; color:#d6d9cf; font-size:14px; line-height:1.55; white-space:pre-wrap;">${safe.message}</div>

        <a href="mailto:${safe.parentEmail}" style="display:inline-block; background:#c9e970; color:#1a2110; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; font-size:13px;">Reply to ${safe.parentName}</a>
        <p style="margin:18px 0 0; font-size:12px; color:#6b7066;">This enquiry was also saved in Airtable \u2192 Coach Registrations. Mark it Contacted once you've replied.</p>
      </div>
    </div>
  </body>
</html>`;
}
function buildCoachEmailText({ coachName, parentName, parentEmail, parentPhone, childName, ageGroup, message, source }) {
  return [
    `New registration enquiry \u2014 Grass2Pro`,
    ``,
    `${parentName} wants to register ${childName} (${ageGroup}) with ${coachName}.`,
    ``,
    `Parent:    ${parentName}`,
    `Email:     ${parentEmail}`,
    `Phone:     ${parentPhone || "\u2014"}`,
    `Child:     ${childName}`,
    `Age group: ${ageGroup}`,
    `Source:    ${source || "direct"}`,
    ``,
    `Message:`,
    message || "\u2014",
    ``,
    `This enquiry has been logged in Airtable \u2192 Coach Registrations. Reply directly to the parent to get them onto the pitch.`
  ].join("\n");
}
async function sendCoachEmail(coachName, coachEmail, payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[coach-register] RESEND_API_KEY not set; skipping coach notification email", payload);
    return { ok: false, reason: "mailer-not-configured" };
  }
  const sender = process.env.EMAIL_FROM || "Grass2Pro <noreply@grass2pro.com>";
  const subject = `New registration: ${payload.parentName} \u2192 ${payload.childName} (${payload.ageGroup})`;
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sender,
        to: [coachEmail],
        // BCC the leads inbox so we always have a backup copy regardless of
        // whether the coach has set up filtering — also gives us a paper trail
        // for spam debugging.
        bcc: process.env.G2P_LEADS_EMAIL ? [process.env.G2P_LEADS_EMAIL] : void 0,
        reply_to: payload.parentEmail,
        subject,
        text: buildCoachEmailText({ coachName, ...payload }),
        html: buildCoachEmailHtml({ coachName, ...payload })
      })
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("[coach-register] Resend rejected:", response.status, body);
      return { ok: false, reason: "send-rejected" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[coach-register] Resend request failed:", error);
    return { ok: false, reason: "send-failed" };
  }
}
async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json2(405, { error: "Method not allowed" });
  }
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json2(400, { error: "Invalid JSON" });
  }
  if (typeof body.company === "string" && body.company.trim() !== "") {
    console.warn("[coach-register] honeypot tripped, dropping submission", { coachSlug: body.coachSlug });
    return json2(200, { ok: true, dropped: true });
  }
  const coachSlug = clean(body.coachSlug, 40).toLowerCase();
  const coach = await resolveCoachForRegistration(coachSlug);
  if (!coach) {
    return json2(404, { error: "Unknown coach" });
  }
  const parentName = clean(body.parentName, 120);
  const parentEmail = clean(body.parentEmail, 200).toLowerCase();
  const parentPhone = clean(body.parentPhone, 40);
  const childName = clean(body.childName, 120);
  const ageGroup = clean(body.ageGroup, 8);
  const message = clean(body.message, 1500);
  const source = clean(body.source, 60) || "direct";
  if (!parentName) return json2(400, { error: "Parent name is required." });
  if (!parentEmail || !EMAIL_REGEX.test(parentEmail)) return json2(400, { error: "A valid email is required." });
  if (!childName) return json2(400, { error: "Child's name is required." });
  if (!ageGroup || !VALID_AGE_GROUPS.has(ageGroup)) return json2(400, { error: "Pick an age group between U7 and U12." });
  const fields = {
    "Parent Name": parentName,
    "Parent Email": parentEmail,
    "Parent Phone": parentPhone,
    "Child Name": childName,
    "Child Age Group": ageGroup,
    "Coach Slug": coachSlug,
    "Message": message,
    "Submitted At": (/* @__PURE__ */ new Date()).toISOString(),
    "Status": "New",
    "Source": source
  };
  if (coach.airtableRecordId) {
    fields["Coach"] = [coach.airtableRecordId];
  }
  let airtableResult;
  try {
    airtableResult = await airtableCreate(COACH_REGISTRATIONS_TABLE, fields);
  } catch (error) {
    console.error("[coach-register] Airtable write failed:", error);
    return json2(500, { error: "We couldn't save your enquiry. Please try again or message the coach on WhatsApp." });
  }
  const emailResult = await sendCoachEmail(coach.name, coach.email, {
    parentName,
    parentEmail,
    parentPhone,
    childName,
    ageGroup,
    message,
    source
  });
  if (emailResult.ok && airtableResult?.id) {
    try {
      const { airtableUpdate: airtableUpdate2 } = await Promise.resolve().then(() => (init_airtable(), airtable_exports));
      await airtableUpdate2(COACH_REGISTRATIONS_TABLE, airtableResult.id, { "Coach Notified": true });
    } catch (error) {
      console.warn("[coach-register] could not flip Coach Notified:", error?.message || error);
    }
  }
  return json2(200, {
    ok: true,
    coach: coach.name,
    notified: emailResult.ok
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=coach-register.js.map
