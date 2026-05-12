import {
  TABLE_IDS,
  airtableUpdate,
  getCoachAndPlayers,
  getCoachDashboardDataForSessionEmail,
  hasAirtableConfig,
  json,
  normalisePlayer,
  tableName,
} from "./_airtable.mjs";
import { gateCoachDashboard } from "./_coach-gate.mjs";

// Players API.
//
// GET  /api/players                 -> list of normalised players (unchanged)
// PATCH /api/players                -> coach-side mutations:
//   { id, action: "set-pathway", value: "<one of footballPathwayOptions>" }
//     Inline pathway edit on the Players list. Empty string clears the value.
//   { id, action: "mark-left", reason, notes }
//     Coach-initiated leaver (quiet fallback for edge cases like "parent
//     told me in person"). Sets Status = "Left", records the reason and
//     timestamp, and clears any outstanding leave-request flag so the row
//     stops showing on the Action needed card.
//   { id, action: "acknowledge-leave" }
//     Coach confirms they have seen a parent-initiated leave request. The
//     player is already Status = "Left" (set by the parent's submission);
//     this just clears the Leave Requested flag so the Action needed card
//     drops the row.
//   { id, action: "reinstate" }
//     Coach undoes a parent-initiated leave or erasure request. Sets Status
//     back to "Active" and clears every leave / erasure field so the row
//     looks untouched and the Action needed card drops it. Useful after a
//     test run or when a parent changes their mind.
//
// All mutations require Airtable to be configured \u2014 demo mode is read-only
// because the new fields don't exist on the demo dataset. The endpoint is
// deliberately coach-only (no token gate) because it lives behind the same
// Netlify protection as the rest of the dashboard.

const ALLOWED_LEAVE_REASONS = new Set([
  "Moved Area",
  "Joined Another Club",
  "Finished Age Group",
  "Parent Request",
  "Other",
]);

const ALLOWED_PATHWAYS = new Set([
  "Grassroots Football",
  "Academy Football",
  "School Football",
  "Not Currently With a Team",
  "Other / Unsure",
  "", // empty = clear
]);

function nowIso() {
  return new Date().toISOString();
}

async function handlePatch(event) {
  if (!hasAirtableConfig()) {
    return json(503, { error: "Airtable is not configured." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const id = String(body.id || "").trim();
  const action = String(body.action || "").trim();
  if (!id || !action) {
    return json(400, { error: "id and action are required." });
  }

  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);

  if (action === "set-pathway") {
    const value = String(body.value ?? "").trim();
    if (!ALLOWED_PATHWAYS.has(value)) {
      return json(400, { error: "Unsupported pathway value." });
    }
    // Airtable accepts empty string to clear a singleSelect. We pass the
    // string verbatim so the Overview's "Pathway not set" tile reflects the
    // change immediately on the next reload.
    const updated = await airtableUpdate(playersTable, id, {
      "Football Pathway": value || null,
    });
    return json(200, { player: normalisePlayer(updated) });
  }

  if (action === "mark-left") {
    const reasonRaw = String(body.reason || "").trim();
    if (!ALLOWED_LEAVE_REASONS.has(reasonRaw)) {
      return json(400, { error: "Unsupported leave reason." });
    }
    const notes = String(body.notes || "").trim();
    // Coach confirmation moves the player to Status="Left", stamps the
    // reason, and clears any outstanding parent-initiated leave request so
    // the row drops off the Action needed card. We deliberately do NOT
    // touch erasure flags here \u2014 erasure is always a separate, explicit
    // step.
    const updated = await airtableUpdate(playersTable, id, {
      Status: "Left",
      "Leave Reason": reasonRaw,
      "Leave Requested At": nowIso(),
      "Leave Notes": notes || null,
      "Leave Requested": false,
    });
    return json(200, { player: normalisePlayer(updated) });
  }

  if (action === "acknowledge-leave") {
    // Coach has seen the parent request on the Action needed card. The
    // parent's submission already moved the player to Status="Left"; this
    // simply turns the Leave Requested flag off so the row drops off the
    // notification card. Status, reason and timestamp are preserved as a
    // record.
    const updated = await airtableUpdate(playersTable, id, {
      "Leave Requested": false,
    });
    return json(200, { player: normalisePlayer(updated) });
  }

  if (action === "reinstate") {
    // Restore the player to active duty. Clears every leave + erasure field
    // and flips Status back to Active. Used to undo a parent's leave /
    // erasure submission (mind-changed, test run, etc.) without the coach
    // having to clear seven cells in Airtable by hand.
    const updated = await airtableUpdate(playersTable, id, {
      Status: "Active",
      "Leave Requested": false,
      "Leave Requested At": null,
      "Leave Reason": null,
      "Leave Notes": null,
      "Erasure Requested": false,
      "Erasure Requested At": null,
    });
    return json(200, { player: normalisePlayer(updated) });
  }

  return json(400, { error: `Unknown action: ${action}` });
}

export const handler = async (event) => {
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  const method = (event.httpMethod || "GET").toUpperCase();

  try {
    if (method === "GET") {
      const data =
        gate.sessionEmail === null
          ? await getCoachAndPlayers()
          : await getCoachDashboardDataForSessionEmail(gate.sessionEmail);
      return json(200, data.players);
    }
    if (method === "PATCH") {
      return await handlePatch(event);
    }
    return json(405, { error: `Method ${method} not allowed.` });
  } catch (error) {
    console.error(error);
    if (hasAirtableConfig() && error?.code === "COACH_NOT_FOUND") {
      return json(403, { error: "Coach record not found for this session." });
    }
    return json(500, { error: "Unable to update player record." });
  }
};
