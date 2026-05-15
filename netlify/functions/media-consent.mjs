import {
  AirtableHttpError,
  TABLE_IDS,
  airtableCreate,
  airtableList,
  airtableUpdate,
  hasAirtableConfig,
  json,
  tableName,
} from "./_airtable.mjs";

// Media consent submission endpoint.
//
// Writes a record into the Airtable "Media Consents" table using ONLY the
// actual schema fields. Computed fields (createdTime, formula, lookup) are
// deliberately omitted so Airtable does not reject the create with
// INVALID_VALUE_FOR_COLUMN. The primary "Consent Record" singleLineText field
// is populated app-side with a human-readable label so the row has a
// recognisable title in linked-record pickers and grid views.
//
// The frontend submits free-text child and parent details rather than Airtable
// record IDs. We try to resolve those names/emails to existing rows in the
// linked Players / Parents/Guardians tables and only attach the linked fields
// when an exact match is found. When no match is found, the consent record is
// still saved as a standalone audit record — the signer details, evidence
// text, IP, device and user-agent are captured so the row remains usable.

const required = ["childName", "parentName", "parentEmail"];

// Mirrors the client-side checks in src/App.tsx so a determined caller hitting
// the API directly cannot bypass the contact-detail validation. We only refuse
// submissions for the obvious typo cases (malformed email, implausible phone)
// — anything else falls through to Airtable as it does today.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed);
}

function isValidPhone(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return true; // phone is optional
  const digits = trimmed.replace(/\D+/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  return /^[+()\-.\s\d]+$/.test(trimmed);
}

// Normalise a player date of birth into the YYYY-MM-DD form Airtable's date
// field accepts. Returns null when the value is empty, malformed or in the
// future — a missing DOB is allowed at the API layer (the consent record is
// still saved); a malformed DOB is refused so we never write garbage to the
// Players table.
function normaliseDateOfBirth(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  if (parsed.getTime() > todayUtc.getTime()) return null;
  return trimmed;
}

// Permission keys submitted by the UI mapped to their Airtable checkbox field
// names. The order/membership of this map is what defines "all permissions"
// for the Consent Status computation — see UI_PERMISSION_KEYS below.
//
// Match-only permissions (photoMatch, videoMatch) are intentionally absent:
// the Airtable schema does not yet have dedicated `Match Photo Permission` /
// `Match Video Permission` checkbox fields. Including them here would make
// the create call fail with UNKNOWN_FIELD_NAME. They are persisted via the
// purpose-level Consent Type chips below instead, which is enough for the
// dashboard to render the new match-specific cards because the chip parser
// in _airtable.mjs reads those labels back out.
const PERMISSION_FIELD_MAP = {
  photoTraining: "Photo Permission",
  videoTraining: "Video Permission",
  internalReports: "Internal Coaching Use",
  website: "Website Use",
  social: "Social Media Use",
  press: "Press/Partner Use",
};

// The set of permission keys whose grant/no-grant ratio drives Consent Status.
// "Active" means every one of these is ticked AND every match-specific chip
// permission is granted; "Limited" means a partial grant; see consentStatus
// computation below.
const UI_PERMISSION_KEYS = Object.keys(PERMISSION_FIELD_MAP);

// Permission keys submitted by the UI mapped to the exact purpose-level
// "Consent Type" multipleSelects label written into Airtable. These are the
// labels parents see on the form (see permissionOptions in src/App.tsx), so
// the chips in Airtable match what was actually agreed to rather than the
// older grouped headings ("Media/photo/video", "Match reports"). The match-
// specific keys live ONLY in this map — they have no checkbox column today.
const PERMISSION_TYPE_MAP = {
  photoTraining: "Photos during sessions",
  photoMatch: "Photos during matches",
  videoTraining: "Video for coaching review",
  videoMatch: "Video during matches",
  internalReports: "Parent progress reports",
  website: "Club website",
  social: "Social media",
  press: "Press/partner use",
};

// Permission keys that exist only as Consent Type chips (no Airtable checkbox
// field). They still count as media permissions for status computation and
// are written into the chip list on submit.
const CHIP_ONLY_PERMISSION_KEYS = ["photoMatch", "videoMatch"];

// Full list of UI media permission keys — checkbox-backed plus chip-only.
// "Active" requires every one of these to be granted.
const ALL_MEDIA_PERMISSION_KEYS = [...UI_PERMISSION_KEYS, ...CHIP_ONLY_PERMISSION_KEYS];

// Information-sharing permissions submitted by the UI mapped to their exact
// Airtable "Consent Type" multipleSelects choice labels. These are recorded on
// the Media Consents row alongside media-derived consent types but do NOT feed
// into the Active/Limited/Needs Review media Consent Status — they are an
// independent, parallel grant that exists in the same audit record.
const INFO_SHARING_TYPE_MAP = {
  emergencyContact: "Emergency contact sharing",
  medicalInformation: "Medical information sharing",
};

// "Relationship to Player" in the Parents/Guardians table is a singleSelect
// with a fixed choice list. Whatever the parent typed in the form must be
// mapped to one of these choices or omitted, otherwise Airtable rejects the
// create with INVALID_MULTIPLE_CHOICE_OPTIONS. "Parent" is the form default
// but is not a valid choice — fall through to "Other".
const PARENT_RELATIONSHIP_CHOICES = ["Mother", "Father", "Guardian", "Carer", "Other"];

// "Football Pathway" on the Players table is a singleSelect with a fixed
// choice list. Whatever the form sends must be one of these or it gets
// dropped — we'd rather skip the field on a malformed value than have
// Airtable reject the whole consent submission with
// INVALID_MULTIPLE_CHOICE_OPTIONS. The labels are matched case-insensitively
// because the registration form sends pretty-cased values ("Grassroots
// Football") that match Airtable exactly today, but the safety net keeps
// older clients submitting lower-case values working too.
const FOOTBALL_PATHWAY_CHOICES = [
  "Grassroots Football",
  "Academy Football",
  "School Football",
  "Not Currently With a Team",
  "Other / Unsure",
];

function normaliseFootballPathway(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const match = FOOTBALL_PATHWAY_CHOICES.find((choice) => choice.toLowerCase() === lower);
  return match || "";
}

// Format a timestamp as "DD/MM/YYYY HH:mm" in Europe/London. Intl handles BST
// vs GMT automatically, so the label always reflects the wall-clock time the
// parent saw when they submitted. Falls back to a UTC ISO-style render only if
// the runtime lacks Intl support — keeping the field non-empty is the priority.
function formatLondonTimestamp(date) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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
    // Fall through to UTC fallback below.
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

  if (!isValidEmail(payload.parentEmail)) {
    return json(400, {
      error: "Parent email is not a valid email address.",
      field: "parentEmail",
    });
  }
  if (!isValidPhone(payload.parentPhone)) {
    return json(400, {
      error: "Parent phone number must contain 10-15 digits and only common phone formatting.",
      field: "parentPhone",
    });
  }

  // childDateOfBirth is optional at the API layer (older clients may not send
  // it) but if it is present it must parse cleanly — otherwise we'd silently
  // PATCH the Player record with a bad value and corrupt the Age Group
  // formula. The UI requires DOB; this guards direct API callers.
  const dateOfBirth = normaliseDateOfBirth(payload.childDateOfBirth);
  if (payload.childDateOfBirth && !dateOfBirth) {
    return json(400, {
      error: "Player date of birth must be a valid past date in YYYY-MM-DD format.",
      field: "childDateOfBirth",
    });
  }

  // Football Pathway is optional — a parent may not yet know which bucket the
  // child falls into. We only forward it when it matches one of the known
  // singleSelect choices so Airtable doesn't reject the create.
  const footballPathway = normaliseFootballPathway(payload.footballPathway);

  const permissions = payload.permissions || {};
  const selectedMediaKeys = ALL_MEDIA_PERMISSION_KEYS.filter((key) => Boolean(permissions[key]));

  const infoSharing = payload.infoSharing || {};
  const selectedInfoSharingKeys = Object.keys(INFO_SHARING_TYPE_MAP).filter(
    (key) => Boolean(infoSharing[key]),
  );

  // Consent Status is a singleSelect with a fixed choice list. "Active" means
  // every media permission the UI exposed was granted (including the new
  // match chips); "Limited" means a partial grant — including the case where
  // session-only permissions are granted but match-only chips aren't, which
  // is exactly what parents now have the option to express. "Needs Review"
  // maps the no-consent case to a valid choice rather than inventing a new
  // option that Airtable would reject.
  const consentStatus =
    selectedMediaKeys.length === 0
      ? "Needs Review"
      : selectedMediaKeys.length < ALL_MEDIA_PERMISSION_KEYS.length
        ? "Limited"
        : "Active";

  const consentTypes = Array.from(
    new Set(
      [
        ...selectedMediaKeys.map((key) => PERMISSION_TYPE_MAP[key]),
        ...selectedInfoSharingKeys.map((key) => INFO_SHARING_TYPE_MAP[key]),
      ].filter(Boolean),
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

  // Build the primary "Consent Record" label app-side. Airtable's primary
  // field is singleLineText (not a formula) so it stays empty unless we write
  // it on create — which makes linked-record pickers and grid views unusable.
  // The label uses the submitted human names even when we resolve the row to
  // existing Player/Parent records, so the title matches what the parent
  // actually typed on the form.
  const submittedAt = new Date();
  const consentRecordLabel = buildConsentRecordLabel(
    payload.childName,
    payload.parentName,
    submittedAt,
  );

  // Build a human-readable evidence summary so the consent row remains useful
  // even if we cannot resolve the linked Player / Parent records.
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
    `Information sharing: ${
      selectedInfoSharingKeys.length > 0
        ? selectedInfoSharingKeys.map((key) => INFO_SHARING_TYPE_MAP[key]).join(", ")
        : "none"
    }`,
    payload.usageDetails ? `Usage details: ${payload.usageDetails}` : null,
    payload.storageDuration ? `Storage duration: ${payload.storageDuration}` : null,
  ].filter(Boolean);

  const fields = {
    "Consent Record": consentRecordLabel,
    "Consent Status": consentStatus,
    "Submitted At": submittedAt.toISOString(),
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
  // Parent resolve/create failures are NOT swallowed: an unlinked consent
  // record was the original bug — we'd rather refuse the submission and
  // surface the Airtable error to the parent than silently save a row with
  // no Parent/Guardian and no Parent's Email lookup. Player lookup is best
  // effort: we try exact name, then a fuzzy match against the player roster,
  // and finally fall back to the player(s) attached to the resolved parent —
  // but if all of those fail we still write the consent row so the audit
  // trail is preserved (the child name lives in the evidence text and the
  // primary Consent Record label).
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

    // Parent-fallback player resolution. If the child name didn't match any
    // player exactly or fuzzily, look at the players already linked to the
    // resolved Parent/Guardian and pick the one whose name overlaps the
    // submitted child name. This rescues submissions where the parent typed
    // only a first name (e.g. "Leonce") but the Players table holds the full
    // name ("Leonce Boateng"). A name overlap is REQUIRED — we never link a
    // single linked player unconditionally, otherwise a sibling submission
    // (e.g. "Malique" under a parent who already has "Leonce Boateng") would
    // be silently mis-linked to the wrong child.
    if (!playerId && parentId && Array.isArray(players)) {
      playerId = matchPlayerByParent(players, parentId, payload.childName);
    }

    // If we still have no Player after exact/fuzzy/parent-fallback matching,
    // the submitted child is genuinely new for this household. Create a
    // Player row from the submitted details and link it to the resolved
    // Parent/Guardian so the consent record points at the right child rather
    // than reusing a sibling.
    //
    // Player creation failures are NOT swallowed any more. The earlier
    // implementation logged-and-continued, which produced the exact bug
    // we're fixing: a Media Consent row with the Player link blank and no
    // matching Players record in Airtable. If we cannot create the Player
    // here we surface the Airtable error to the caller so the parent sees a
    // clear failure instead of a "successful" consent that points at no one.
    if (!playerId && parentId) {
      try {
        playerId = await createPlayerForConsent(payload, parentId, dateOfBirth);
      } catch (error) {
        console.error("Player create-on-consent failed:", error);
        if (error instanceof AirtableHttpError) {
          const detail = extractAirtableErrorDetail(error.body);
          return json(error.status === 422 ? 422 : 502, {
            error: "Unable to create the Player record for this consent submission.",
            detail,
            status: error.status,
          });
        }
        return json(502, {
          error: "Unable to create the Player record for this consent submission.",
          detail: error instanceof Error ? error.message : undefined,
        });
      }
      if (!playerId) {
        // createPlayerForConsent returns null only when the submitted child
        // name is blank — but the request validator above already requires
        // childName, so reaching this branch means something else went wrong
        // that we'd rather surface than hide.
        return json(500, {
          error: "Unable to create the Player record for this consent submission.",
        });
      }
    }

    if (playerId) fields.Player = [playerId];

    // Best-effort write of the player's Date of Birth into the Players table
    // so the Age Group formula can pick it up. We do this only when we
    // confidently resolved the consent submission to a Player record — the
    // parent-facing form is the only place we collect DOB, so updating the
    // matched Player here means it's stored once at the player profile level
    // rather than being repeated on every consent record. Failures are logged
    // but never block the consent submission, since the consent record itself
    // is the audit document the parent expects to be saved.
    if (dateOfBirth && playerId) {
      try {
        await airtableUpdate(
          tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
          playerId,
          { "Date of Birth": dateOfBirth },
        );
      } catch (error) {
        console.error("Player Date of Birth update failed:", error);
      }
    }

    // Best-effort write of the Football Pathway into the Players table. We
    // run this even when the child name resolved to an existing player so a
    // re-submission can correct or update the pathway as the child moves
    // (e.g. grassroots → academy). Failures are logged but never block the
    // consent submission — the Football Pathway field is non-critical for
    // safeguarding, and the consent record itself is the audit document the
    // parent expects to be saved.
    if (footballPathway && playerId) {
      try {
        await airtableUpdate(
          tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
          playerId,
          { "Football Pathway": footballPathway },
        );
      } catch (error) {
        console.error("Player Football Pathway update failed:", error);
      }
    }

    // Best-effort backfill of Parent Email on the Player row. Older Player
    // records (created before we wrote this field on consent) are missing it,
    // which causes the parent portal's fast-path filter to skip them. Writing
    // it here on every consent submission heals those rows and keeps freshly
    // created ones consistent with the rest of the dataset. Failures are
    // logged but never block the consent submission.
    const submittedParentEmail = String(payload.parentEmail || "").trim();
    if (submittedParentEmail && playerId) {
      try {
        await airtableUpdate(
          tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS),
          playerId,
          { "Parent Email": submittedParentEmail },
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
      { typecast: true },
    );
    // Mirror grants onto the linked Players row so coaches who browse the
    // Players grid in Airtable see the same partial/full consent the dashboard
    // derives from Media Consents. The audit row remains the source of truth;
    // this is a best-effort sync for visibility in the player profile table.
    if (playerId && hasAirtableConfig() && !record.demo) {
      try {
        await syncPlayerConsentFromSubmission(playerId, permissions, infoSharing, consentStatus);
      } catch (error) {
        console.warn("[media-consent] Player consent checkbox sync failed:", error?.message || error);
      }
    }

    return json(200, {
      ok: true,
      id: record.id,
      demo: Boolean(record.demo),
      consentStatus,
      consentTypes,
      selectedPermissions: selectedMediaKeys,
      selectedInfoSharing: selectedInfoSharingKeys,
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

// Players-table columns coaches expect in the Airtable grid (tried in order).
const PLAYER_CONSENT_FIELD_SYNC = [
  { key: "photoTraining", candidates: ["Photo Consent", "Photo Permission"] },
  { key: "videoTraining", candidates: ["Video Consent", "Video Permission"] },
  { key: "photoMatch", candidates: ["Match Photo Consent", "Match Photo Permission"] },
  { key: "videoMatch", candidates: ["Match Video Consent", "Match Video Permission"] },
  { key: "website", candidates: ["Website Consent", "Website Permission", "Website Use"] },
  { key: "social", candidates: ["Social Consent", "Social Permission", "Social Media Use"] },
  { key: "internalReports", candidates: ["Internal Reports Consent", "Internal Coaching Use"] },
  { key: "press", candidates: ["Press Consent", "Press/Partner Use"] },
];

const PLAYER_INFO_SHARING_FIELD_SYNC = [
  { key: "emergencyContact", candidates: ["Emergency Contact Consent", "Emergency Contact Sharing"] },
  { key: "medicalInformation", candidates: ["Medical Information Consent", "Medical Information Sharing"] },
];

async function updatePlayerFieldWithFallback(table, recordId, candidates, value) {
  let lastError = null;
  for (const fieldName of candidates) {
    try {
      await airtableUpdate(table, recordId, { [fieldName]: value });
      return;
    } catch (error) {
      lastError = error;
      if (!isUnknownFieldError(error)) throw error;
    }
  }
  if (lastError) throw lastError;
}

async function syncPlayerConsentFromSubmission(playerId, permissions, infoSharing, consentStatus) {
  const table = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  for (const { key, candidates } of PLAYER_CONSENT_FIELD_SYNC) {
    await updatePlayerFieldWithFallback(table, playerId, candidates, Boolean(permissions[key]));
  }
  for (const { key, candidates } of PLAYER_INFO_SHARING_FIELD_SYNC) {
    await updatePlayerFieldWithFallback(table, playerId, candidates, Boolean(infoSharing[key]));
  }
  if (consentStatus) {
    await updatePlayerFieldWithFallback(table, playerId, ["Consent Status", "Media Consent Status"], consentStatus);
  }
}

function playerNameOf(record) {
  const fields = record?.fields || {};
  return String(fields["Full Name"] || fields.Name || fields["Player Name"] || "")
    .trim();
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
    { pageSize: "100" },
  );
  return records.map((record) => ({
    id: record.id,
    name: playerNameOf(record),
    guardianIds: playerGuardianIds(record),
  }));
}

// Resolve the submitted child name to a player record id. We try strict
// equality first, then fall back to forgiving matches so submissions that
// shorten the name ("Leonce" vs "Leonce Boateng") still link to the right
// player. To avoid linking the wrong player when several share a first name,
// fuzzy matches are only accepted when exactly one candidate matches.
function matchPlayerByName(players, childName) {
  if (!Array.isArray(players) || players.length === 0) return null;
  const trimmed = String(childName || "").trim().toLowerCase();
  if (!trimmed) return null;

  const exact = players.find((player) => player.name.toLowerCase() === trimmed);
  if (exact) return exact.id;

  const startsWith = players.filter((player) =>
    player.name.toLowerCase().startsWith(`${trimmed} `),
  );
  if (startsWith.length === 1) return startsWith[0].id;

  // First-token (first name) overlap as a last resort — only accepted when
  // unambiguous so siblings sharing a surname don't get cross-linked.
  const firstToken = trimmed.split(/\s+/)[0];
  if (firstToken) {
    const firstNameMatches = players.filter((player) => {
      const candidateFirst = player.name.toLowerCase().split(/\s+/)[0];
      return candidateFirst && candidateFirst === firstToken;
    });
    if (firstNameMatches.length === 1) return firstNameMatches[0].id;
  }

  // Substring containment, again only when unique.
  const contains = players.filter((player) =>
    player.name.toLowerCase().includes(trimmed),
  );
  if (contains.length === 1) return contains[0].id;

  return null;
}

// Fall back to the player(s) already linked to the resolved Parent/Guardian.
// A name overlap with the submitted child name is REQUIRED: we never trust
// the parent link alone, because a household submitting consent for a new
// sibling (e.g. "Malique") under the same parent that already has "Leonce
// Boateng" must NOT have the consent record linked to Leonce. Accepts an
// exact normalised name match, a startsWith match (e.g. "Leonce" vs
// "Leonce Boateng"), an unambiguous first-token overlap, or — only when the
// candidate set is a single player — a substring containment.
function matchPlayerByParent(players, parentId, childName) {
  if (!Array.isArray(players) || !parentId) return null;
  const candidates = players.filter((player) => player.guardianIds.includes(parentId));
  if (candidates.length === 0) return null;

  const trimmed = String(childName || "").trim().toLowerCase();
  if (!trimmed) return null;

  const exact = candidates.find((player) => player.name.toLowerCase() === trimmed);
  if (exact) return exact.id;

  const startsWith = candidates.filter((player) =>
    player.name.toLowerCase().startsWith(`${trimmed} `),
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

// Create a Players row for a submitted child that could not be matched to
// any existing Player (by name or via the resolved Parent/Guardian's links).
//
// The Players table primary field name and the Parent/Guardian linked-record
// field name vary between Airtable bases — the read normaliser already falls
// through "Full Name | Name | Player Name" and "Parent/Guardian | Parent |
// Guardian", so the writer must do the same or it ends up failing with
// UNKNOWN_FIELD_NAME and the consent gets saved with a blank Player. We
// retry the create with the next candidate name on UNKNOWN_FIELD_NAME and
// surface any other error so the caller can return a useful HTTP response
// instead of silently dropping the new player.
//
// `typecast: true` is applied so unknown singleSelect/multipleSelects values
// (e.g. an Age Group choice the formula derives) are tolerated. typecast does
// NOT bypass UNKNOWN_FIELD_NAME for missing columns — only choice values —
// which is why the per-field fallbacks below exist.
//
// Returns the new record id, or null if creation could not be attempted
// (e.g. blank child name). Throws on the final Airtable error if every
// candidate field set is rejected.
const PLAYER_NAME_FIELD_CANDIDATES = ["Full Name", "Name", "Player Name"];
const PLAYER_PARENT_FIELD_CANDIDATES = ["Parent/Guardian", "Parents/Guardians", "Parent", "Guardian"];

function isUnknownFieldError(error) {
  if (!(error instanceof AirtableHttpError)) return false;
  const body = String(error.body || "");
  return body.includes("UNKNOWN_FIELD_NAME") || body.includes("Unknown field name");
}

async function createPlayerForConsent(payload, parentId, dateOfBirth) {
  const fullName = String(payload.childName || "").trim();
  if (!fullName) return null;
  const table = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  const footballPathway = normaliseFootballPathway(payload.footballPathway);

  let lastError = null;
  for (const nameField of PLAYER_NAME_FIELD_CANDIDATES) {
    // Pair each candidate name field with each candidate parent-link field so
    // a base whose primary field is "Player Name" and whose link field is
    // "Parents/Guardians" still creates the row instead of silently failing.
    // When parentId is missing we only try once per name field.
    const parentCandidates = parentId ? PLAYER_PARENT_FIELD_CANDIDATES : [null];
    for (const parentField of parentCandidates) {
      const playerFields = { [nameField]: fullName };
      if (dateOfBirth) playerFields["Date of Birth"] = dateOfBirth;
      if (footballPathway) playerFields["Football Pathway"] = footballPathway;
      if (parentField && parentId) playerFields[parentField] = [parentId];
      // Write the Parent Email text field directly on the Player record so
      // the parent portal's email-based filter (parent-data.mjs) finds this
      // child immediately. Without this, the portal had to fall back to the
      // linked-record join path — which still works but means a portal
      // refresh has to load the full Parents/Guardians table to resolve the
      // child. Writing both keeps the fast path fast.
      const trimmedParentEmail = String(payload.parentEmail || "").trim();
      if (trimmedParentEmail) playerFields["Parent Email"] = trimmedParentEmail;

      try {
        const created = await airtableCreate(table, playerFields, { typecast: true });
        if (created?.id) {
          if (lastError) {
            // Useful for the Netlify function logs when the schema diverges
            // from the canonical "Full Name" / "Parent/Guardian" naming.
            console.warn(
              `Player create succeeded on fallback fields nameField=${nameField} parentField=${parentField || "none"} after earlier rejections.`,
            );
          }
          return created.id;
        }
      } catch (error) {
        lastError = error;
        if (isUnknownFieldError(error)) {
          console.warn(
            `Player create rejected unknown field — retrying with different schema. nameField=${nameField} parentField=${parentField || "none"}: ${error.message}`,
          );
          continue;
        }
        // Anything other than UNKNOWN_FIELD_NAME is a real Airtable rejection
        // (validation, choice options, permissions). Stop fallback iteration
        // and let the caller surface the error — retrying with another field
        // name will only mask the underlying problem.
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
