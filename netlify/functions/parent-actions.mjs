// Mutations available to a signed-in parent on the /portal route.
//
// Every action verifies that the player being changed belongs to the
// signed-in parent (their email matches the player's "Parent Email"
// field) before any Airtable write happens. A mismatch returns 403,
// not 404, so a typo in the SPA can be distinguished from a malicious
// id swap during testing.
//
//   PATCH /api/parent-actions
//     { playerId, action: "set-consent", key, value }
//       Toggle a single media-consent flag on the player record. `key` is
//       one of the supported short names (see ALLOWED_CONSENT_KEYS) and
//       `value` is a boolean.
//     { playerId, action: "set-pathway", value }
//       Update the player's Football Pathway. Empty string clears it.
//     { playerId, action: "request-leave", reason, notes? }
//       Parent self-service leave. Sets Status = "Left" immediately and
//       flags Leave Requested so the coach Action Needed card surfaces it.
//     { playerId, action: "request-erasure" }
//       Parent self-service erasure request. Flags Erasure Requested with
//       a timestamp; the actual record deletion remains a coach decision.
import {
  TABLE_IDS,
  airtableList,
  airtableUpdate,
  hasAirtableConfig,
  json,
  normalisePlayer,
  tableName,
} from "./_airtable.mjs";
import { normaliseEmail, requireParentSession } from "./_parent-session.mjs";

// Map the SPA's short consent keys to the Airtable field names. Keeping
// this dictionary explicit means the SPA can never set an arbitrary field
// even if it tries — only the keys listed here are writable.
//
// Each value is an *ordered list of candidate field names*. Different
// generations of the Players base used different column names for the
// same idea (e.g. "Photo Consent" vs the older "Photo Permission"). We
// try each candidate in order and skip past `UNKNOWN_FIELD_NAME` so the
// portal works on any base that has at least one of the candidates.
const CONSENT_KEY_TO_FIELDS = {
  photo: ["Photo Consent", "Photo Permission"],
  video: ["Video Consent", "Video Permission"],
  matchPhoto: ["Match Photo Consent", "Match Photo Permission"],
  matchVideo: ["Match Video Consent", "Match Video Permission"],
  website: ["Website Consent", "Website Permission"],
  social: ["Social Consent", "Social Permission"],
  highlights: ["Highlights Consent", "Highlight Permission", "Highlights/Reels Use"],
  internalReports: ["Internal Reports Consent", "Internal Coaching Use"],
  press: ["Press Consent", "Press/Partner Use"],
  emergencyContact: ["Emergency Contact Consent", "Emergency Contact Sharing"],
  medicalInformation: [
    "Medical Information Consent",
    "Medical Information Sharing",
  ],
};

// True when an Airtable error body indicates we tried to write a field
// that doesn't exist on the table. This is the only kind of error we
// want to swallow + retry against the next candidate field name.
function isUnknownFieldError(error) {
  if (!error || typeof error.message !== "string") return false;
  return error.message.includes("UNKNOWN_FIELD_NAME");
}

// PATCH a single field on a player record, trying each candidate field
// name in turn until Airtable accepts one. Returns the updated record
// or rethrows the last error if every candidate failed.
async function airtableUpdateWithFieldFallback(table, recordId, candidates, value) {
  let lastError = null;
  for (const fieldName of candidates) {
    try {
      return await airtableUpdate(table, recordId, { [fieldName]: value });
    } catch (error) {
      lastError = error;
      if (!isUnknownFieldError(error)) throw error;
      console.warn(
        `[parent-actions] Field \"${fieldName}\" not found on ${table}; trying next candidate.`,
      );
    }
  }
  throw lastError || new Error("No matching consent field found on the Players table.");
}

const ALLOWED_PATHWAYS = new Set([
  "Grassroots Football",
  "Academy Football",
  "School Football",
  "Not Currently With a Team",
  "Other / Unsure",
  "",
]);

const ALLOWED_LEAVE_REASONS = new Set([
  "Moved Area",
  "Joined Another Club",
  "Finished Age Group",
  "Parent Request",
  "Other",
]);

function nowIso() {
  return new Date().toISOString();
}

// Pull the requested player record and confirm the parent owns it. Returns
// either { player } (a normalised Player object plus id) or { error } (a
// pre-built JSON response the caller should return verbatim).
async function loadOwnedPlayer({ playerId, parentEmail }) {
  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  // We list and filter rather than fetch by id directly so we hit the same
  // normalisation logic the rest of the app uses (Parent Email lower-cased,
  // etc.). The Players list is small for grassroots clubs so this is fine.
  const records = await airtableList(playersTable, { pageSize: "100" });
  const match = records.find((record) => record.id === playerId);
  if (!match) {
    return { error: json(404, { error: "Player not found." }) };
  }
  const normalised = normalisePlayer(match);
  if (normalised.parentEmail !== parentEmail) {
    return { error: json(403, { error: "You don't have permission to update this player." }) };
  }
  return { player: normalised, table: playersTable };
}

async function handleSetConsent({ playerId, body, parentEmail }) {
  const key = String(body.key || "").trim();
  if (!Object.prototype.hasOwnProperty.call(CONSENT_KEY_TO_FIELDS, key)) {
    return json(400, { error: "Unsupported consent key." });
  }
  if (typeof body.value !== "boolean") {
    return json(400, { error: "Consent value must be true or false." });
  }
  const owned = await loadOwnedPlayer({ playerId, parentEmail });
  if (owned.error) return owned.error;

  const candidates = CONSENT_KEY_TO_FIELDS[key];
  const updated = await airtableUpdateWithFieldFallback(
    owned.table,
    playerId,
    candidates,
    body.value,
  );
  return json(200, { player: normalisePlayer(updated) });
}

async function handleSetPathway({ playerId, body, parentEmail }) {
  const value = String(body.value ?? "").trim();
  if (!ALLOWED_PATHWAYS.has(value)) {
    return json(400, { error: "Unsupported pathway value." });
  }
  const owned = await loadOwnedPlayer({ playerId, parentEmail });
  if (owned.error) return owned.error;
  const updated = await airtableUpdate(owned.table, playerId, {
    "Football Pathway": value || null,
  });
  return json(200, { player: normalisePlayer(updated) });
}

async function handleRequestLeave({ playerId, body, parentEmail }) {
  const reason = String(body.reason || "").trim();
  if (!ALLOWED_LEAVE_REASONS.has(reason)) {
    return json(400, { error: "Please pick a leave reason." });
  }
  const notes = String(body.notes || "").trim();
  const owned = await loadOwnedPlayer({ playerId, parentEmail });
  if (owned.error) return owned.error;
  // Mirror the coach mark-left flow so coach-facing badges stay consistent.
  const updated = await airtableUpdate(owned.table, playerId, {
    Status: "Left",
    "Leave Requested": true,
    "Leave Requested At": nowIso(),
    "Leave Reason": reason,
    "Leave Notes": notes || null,
  });
  return json(200, { player: normalisePlayer(updated) });
}

async function handleRequestErasure({ playerId, parentEmail }) {
  const owned = await loadOwnedPlayer({ playerId, parentEmail });
  if (owned.error) return owned.error;
  const updated = await airtableUpdate(owned.table, playerId, {
    "Erasure Requested": true,
    "Erasure Requested At": nowIso(),
  });
  return json(200, { player: normalisePlayer(updated) });
}

export const handler = async (event) => {
  const method = (event.httpMethod || "PATCH").toUpperCase();
  if (method !== "PATCH") {
    return json(405, { error: `Method ${method} not allowed.` });
  }
  if (!hasAirtableConfig()) {
    return json(503, { error: "The portal is not available in demo mode." });
  }

  const gate = requireParentSession(event, json);
  if (gate.error) return gate.error;
  const parentEmail = normaliseEmail(gate.session.email);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const playerId = String(body.playerId || "").trim();
  const action = String(body.action || "").trim();
  if (!playerId || !action) {
    return json(400, { error: "playerId and action are required." });
  }

  try {
    if (action === "set-consent") return await handleSetConsent({ playerId, body, parentEmail });
    if (action === "set-pathway") return await handleSetPathway({ playerId, body, parentEmail });
    if (action === "request-leave") return await handleRequestLeave({ playerId, body, parentEmail });
    if (action === "request-erasure") return await handleRequestErasure({ playerId, parentEmail });
    return json(400, { error: `Unknown action: ${action}` });
  } catch (error) {
    console.error("[parent-actions] Update failed:", error);
    return json(500, { error: "We couldn't save that change. Please try again." });
  }
};
