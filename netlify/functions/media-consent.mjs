import {
  AirtableHttpError,
  TABLE_IDS,
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

// Permission keys submitted by the UI mapped to their Airtable checkbox field
// names. The order/membership of this map is what defines "all permissions"
// for the Consent Status computation — see UI_PERMISSION_KEYS below.
const PERMISSION_FIELD_MAP = {
  photoTraining: "Photo Permission",
  videoTraining: "Video Permission",
  internalReports: "Internal Coaching Use",
  website: "Website Use",
  social: "Social Media Use",
  press: "Press/Partner Use",
};

// The set of permission keys exposed in the frontend consent form. Consent
// Status is "Active" only when every one of these is ticked. The Airtable
// schema also has a "Highlights/Reels Use" checkbox, but there is no
// corresponding UI control today — including it here would make "Active"
// unreachable from the form.
const UI_PERMISSION_KEYS = Object.keys(PERMISSION_FIELD_MAP);

const PERMISSION_TYPE_MAP = {
  photoTraining: "Media/photo/video",
  videoTraining: "Media/photo/video",
  internalReports: "Match reports",
  website: "Website/social media",
  social: "Website/social media",
};

// "Relationship to Player" in the Parents/Guardians table is a singleSelect
// with a fixed choice list. Whatever the parent typed in the form must be
// mapped to one of these choices or omitted, otherwise Airtable rejects the
// create with INVALID_MULTIPLE_CHOICE_OPTIONS. "Parent" is the form default
// but is not a valid choice — fall through to "Other".
const PARENT_RELATIONSHIP_CHOICES = ["Mother", "Father", "Guardian", "Carer", "Other"];

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
  const selectedKeys = UI_PERMISSION_KEYS.filter((key) => Boolean(permissions[key]));

  // Consent Status is a singleSelect with a fixed choice list. "Active" means
  // every permission the UI exposed was granted; "Limited" means a partial
  // grant; "Needs Review" maps the no-consent case to a valid choice rather
  // than inventing a new option that Airtable would reject.
  const consentStatus =
    selectedKeys.length === 0
      ? "Needs Review"
      : selectedKeys.length < UI_PERMISSION_KEYS.length
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

  // Linked-record resolution. We resolve the player by child name and the
  // parent by email (then name) so the visible "Parent/Guardian" and "Player"
  // columns in Airtable reflect the submission. When no Parents/Guardians row
  // matches we create one from the submitted details — without it the
  // Parent's Email lookup column would stay blank even though the parent
  // typed their email into the form.
  //
  // Player lookup failures are tolerated (the consent row remains useful as
  // a standalone audit record and the child name is captured in the evidence
  // text). Parent resolve/create failures are NOT swallowed: an unlinked
  // consent record was the original bug — we'd rather refuse the submission
  // and surface the Airtable error to the parent than silently save a row
  // with no Parent/Guardian and no Parent's Email lookup.
  let playerId = null;
  if (hasAirtableConfig()) {
    try {
      playerId = await findPlayerId(payload.childName);
      if (playerId) fields.Player = [playerId];
    } catch (error) {
      console.error("Player lookup failed:", error);
    }
    try {
      const parentId = await resolveOrCreateParent(payload, playerId);
      if (parentId) {
        fields["Parent/Guardian"] = [parentId];
      } else {
        return json(500, {
          error: "Unable to resolve or create the Parent/Guardian record for this consent.",
        });
      }
    } catch (error) {
      console.error("Parent/Guardian resolve-or-create failed:", error);
      if (error instanceof AirtableHttpError) {
        const detail = extractAirtableErrorDetail(error.body);
        return json(error.status === 422 ? 422 : 502, {
          error: "Airtable rejected the Parent/Guardian record.",
          detail,
          status: error.status,
        });
      }
      return json(502, {
        error: "Unable to resolve or create the Parent/Guardian record.",
        detail: error instanceof Error ? error.message : undefined,
      });
    }
  }

  try {
    const record = await airtableCreate(
      tableName("AIRTABLE_MEDIA_CONSENTS_TABLE", "Media Consents", TABLE_IDS.MEDIA_CONSENTS),
      fields,
    );
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
  const records = await airtableList(
    tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
    { pageSize: "100" },
  );
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
  const records = await airtableList(
    tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS),
    { pageSize: "100" },
  );
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

// Resolve an existing Parent/Guardian by email (preferred) or name, and only
// create a new row when neither matches. Email is the natural unique key — we
// always check it first so re-submissions for the same household don't create
// duplicates. The created row writes ONLY the schema fields supplied by the
// form, so Airtable computed columns are left untouched.
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
    parentFields,
  );
  return created?.id || null;
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
