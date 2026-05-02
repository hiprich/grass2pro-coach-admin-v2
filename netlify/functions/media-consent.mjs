import {
  AirtableHttpError,
  airtableCreate,
  airtableList,
  hasAirtableConfig,
  json,
  tableName,
} from "./_airtable.mjs";

// Media consent submission endpoint.
//
// Writes a record into the Airtable "Media Consents" table using ONLY the
// actual schema fields. Computed fields (createdTime, formula, lookup) and the
// primary "Consent Record" field are deliberately omitted so Airtable does not
// reject the create with INVALID_VALUE_FOR_COLUMN.
//
// The frontend submits free-text child and parent details rather than Airtable
// record IDs. We try to resolve those names/emails to existing rows in the
// linked Players / Parents/Guardians tables and only attach the linked fields
// when an exact match is found. When no match is found, the consent record is
// still saved as a standalone audit record — the signer details, evidence
// text, IP, device and user-agent are captured so the row remains usable.

const required = ["childName", "parentName", "parentEmail"];

const PERMISSION_FIELD_MAP = {
  photoTraining: "Photo Permission",
  videoTraining: "Video Permission",
  internalReports: "Internal Coaching Use",
  website: "Website Use",
  social: "Social Media Use",
  highlights: "Highlights/Reels Use",
  press: "Press/Partner Use",
};

const ALL_PERMISSION_FIELDS = Object.values(PERMISSION_FIELD_MAP);

const PERMISSION_TYPE_MAP = {
  photoTraining: "Media/photo/video",
  videoTraining: "Media/photo/video",
  internalReports: "Match reports",
  website: "Website/social media",
  social: "Website/social media",
  highlights: "Website/social media",
};

export const handler = async (event) => {
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
      missing,
    });
  }

  const permissions = payload.permissions || {};
  const selectedKeys = Object.entries(permissions)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

  // Consent Status is a singleSelect with a fixed choice list. Map our internal
  // "no permissions selected" case to "Needs Review" rather than inventing a
  // new option that Airtable would reject.
  const consentStatus =
    selectedKeys.length === 0
      ? "Needs Review"
      : selectedKeys.length < ALL_PERMISSION_FIELDS.length
        ? "Limited"
        : "Active";

  const consentTypes = Array.from(
    new Set(
      selectedKeys
        .map((key) => PERMISSION_TYPE_MAP[key])
        .filter(Boolean),
    ),
  );

  // Permission booleans — set every checkbox so the row reflects exactly what
  // the parent saw, not just the ticked ones (Airtable defaults missing
  // checkboxes to false on create, but being explicit makes the audit trail
  // unambiguous).
  const permissionFields = {};
  for (const [key, fieldName] of Object.entries(PERMISSION_FIELD_MAP)) {
    permissionFields[fieldName] = Boolean(permissions[key]);
  }

  // Capture audit context from the request. Netlify proxies set
  // x-nf-client-connection-ip and forward the original user-agent.
  const headers = event.headers || {};
  const submittedIp =
    headers["x-nf-client-connection-ip"] ||
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["client-ip"] ||
    "";
  const submittedUserAgent = headers["user-agent"] || "";

  // Build a human-readable evidence summary so the consent row remains useful
  // even if we cannot resolve the linked Player / Parent records.
  const evidenceLines = [
    `Child: ${payload.childName}`,
    payload.ageGroup ? `Age group: ${payload.ageGroup}` : null,
    `Parent/Guardian: ${payload.parentName} <${payload.parentEmail}>`,
    payload.parentPhone ? `Phone: ${payload.parentPhone}` : null,
    payload.relationship ? `Relationship: ${payload.relationship}` : null,
    `Selected permissions: ${selectedKeys.length > 0 ? selectedKeys.join(", ") : "none"}`,
    payload.usageDetails ? `Usage details: ${payload.usageDetails}` : null,
    payload.storageDuration ? `Storage duration: ${payload.storageDuration}` : null,
  ].filter(Boolean);

  const fields = {
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
    Notes: payload.notes || "",
  };

  if (consentTypes.length > 0) {
    fields["Consent Type"] = consentTypes;
  }
  if (submittedIp) fields["Submitted IP Address"] = submittedIp;
  if (submittedUserAgent) {
    fields["Submitted User Agent"] = submittedUserAgent;
    fields["Submitted Device"] = submittedUserAgent;
  }

  // Best-effort linked-record resolution. We never invent record IDs; if we
  // cannot find an exact match the linked field stays unset and the consent
  // record is saved as a standalone audit row.
  if (hasAirtableConfig()) {
    try {
      const playerId = await findPlayerId(payload.childName);
      if (playerId) fields.Player = [playerId];
    } catch (error) {
      console.error("Player lookup failed:", error);
    }
    try {
      const parentId = await findParentId(payload.parentEmail, payload.parentName);
      if (parentId) fields["Parent/Guardian"] = [parentId];
    } catch (error) {
      console.error("Parent/Guardian lookup failed:", error);
    }
  }

  try {
    const record = await airtableCreate(tableName("AIRTABLE_MEDIA_CONSENTS_TABLE", "Media Consents"), fields);
    return json(200, {
      ok: true,
      id: record.id,
      demo: Boolean(record.demo),
      consentStatus,
      consentTypes,
      selectedPermissions: selectedKeys,
      linkedPlayer: Boolean(fields.Player),
      linkedParent: Boolean(fields["Parent/Guardian"]),
    });
  } catch (error) {
    console.error("Media consent create failed:", error);
    if (error instanceof AirtableHttpError) {
      const detail = extractAirtableErrorDetail(error.body);
      return json(error.status === 422 ? 422 : 502, {
        error: "Airtable rejected the consent record.",
        detail,
        status: error.status,
      });
    }
    return json(500, { error: "Unable to save consent record." });
  }
};

async function findPlayerId(name) {
  if (!name) return null;
  const trimmed = String(name).trim().toLowerCase();
  if (!trimmed) return null;
  const records = await airtableList(tableName("AIRTABLE_PLAYERS_TABLE", "Players"), { pageSize: "100" });
  const match = records.find((record) => {
    const fields = record?.fields || {};
    const candidate = String(fields["Full Name"] || fields.Name || fields["Player Name"] || "").trim().toLowerCase();
    return candidate && candidate === trimmed;
  });
  return match?.id || null;
}

async function findParentId(email, name) {
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const trimmedName = String(name || "").trim().toLowerCase();
  if (!trimmedEmail && !trimmedName) return null;
  const records = await airtableList(tableName("AIRTABLE_PARENTS_TABLE", "Parents"), { pageSize: "100" });
  const byEmail = trimmedEmail
    ? records.find((record) => {
        const candidate = String(record?.fields?.Email || "").trim().toLowerCase();
        return candidate && candidate === trimmedEmail;
      })
    : null;
  if (byEmail) return byEmail.id;
  if (!trimmedName) return null;
  const byName = records.find((record) => {
    const fields = record?.fields || {};
    const candidate = String(
      fields["Full Name"] || fields.Name || fields["Parent/Guardian Name"] || "",
    )
      .trim()
      .toLowerCase();
    return candidate && candidate === trimmedName;
  });
  return byName?.id || null;
}

// Airtable error responses are JSON like
//   {"error":{"type":"INVALID_VALUE_FOR_COLUMN","message":"Field 'Foo' cannot accept the provided value."}}
// We only want to surface the human-readable message, never the raw body.
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
