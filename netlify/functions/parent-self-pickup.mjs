// Parent-side "Confirm pickup" endpoint (Phase A4).
//
// Triggered when a parent taps the Pickup Confirm Reminder / Final push
// notification (or the matching strip in the /portal UI). Closes their
// child's attendance row by stamping Departure Time, which:
//   - Removes the chip from the coach's OnPitchCard.
//   - Stops the scheduled-push-fanout from sending further pickup-confirm
//     nags for this (session, parent) tuple, because the requireOpen filter
//     no longer matches the child.
//
//   POST /api/parent-self-pickup
//     { playerId, sessionId }
//
// The endpoint:
//   - Requires a valid g2p_parent_session cookie. The cookie's email must
//     match the player's "Parent Email" field, otherwise we 403 \u2014 same
//     ownership rule used by parent-actions.
//   - Looks up the attendance row for (sessionId, playerId).
//   - Refuses (409) if there's no arrival recorded yet, or if a departure
//     is already set.
//   - Writes Departure Time = now() and appends an audit line to Coach
//     Notes so the coach can see this was a parent self-pickup, not a
//     coach mark-collected.
//   - Returns the freshly normalised attendance row.
import {
  TABLE_IDS,
  airtableList,
  airtableUpdate,
  findAttendance,
  hasAirtableConfig,
  json,
  normaliseAttendance,
  normalisePlayer,
  tableName,
} from "./_airtable.mjs";
import { normaliseEmail, requireParentSession } from "./_parent-session.mjs";

function attendanceTable() {
  return tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance", TABLE_IDS.ATTENDANCE);
}

function playersTable() {
  return tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
}

function appendAuditLine(existingNotes, line) {
  const prior = String(existingNotes || "").trim();
  if (!prior) return line;
  return `${prior}\n${line}`;
}

// Confirm the signed-in parent owns this player. Same shape as the
// loadOwnedPlayer helper in parent-actions.mjs \u2014 we list and filter rather
// than fetch by id so we hit the canonical normaliser.
async function loadOwnedPlayer({ playerId, parentEmail }) {
  const records = await airtableList(playersTable(), { pageSize: "100" });
  const match = records.find((record) => record.id === playerId);
  if (!match) {
    return { error: json(404, { error: "Player not found." }) };
  }
  const normalised = normalisePlayer(match);
  if (normalised.parentEmail !== parentEmail) {
    return {
      error: json(403, {
        error: "You don't have permission to confirm pickup for this player.",
      }),
    };
  }
  return { player: normalised };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
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

  const playerId = String(body?.playerId || "").trim();
  const sessionId = String(body?.sessionId || "").trim();
  if (!playerId || !sessionId) {
    return json(400, { error: "playerId and sessionId are required." });
  }

  // Ownership check first \u2014 a 403 here is more useful than a 409 from the
  // attendance lookup if someone passes a player they don't own.
  let ownership;
  try {
    ownership = await loadOwnedPlayer({ playerId, parentEmail });
  } catch (error) {
    console.error("[parent-self-pickup] Player lookup failed:", error);
    return json(502, { error: "Unable to verify player ownership." });
  }
  if (ownership.error) return ownership.error;

  let existing;
  try {
    existing = await findAttendance(sessionId, playerId);
  } catch (error) {
    console.error("[parent-self-pickup] Attendance lookup failed:", error);
    return json(502, { error: "Unable to look up attendance record." });
  }
  if (!existing) {
    return json(404, {
      error: "No attendance record found for this player and session.",
    });
  }
  const normalised = normaliseAttendance(existing);
  if (!normalised.arrivalTime) {
    return json(409, {
      warning: "no_arrival",
      message: "Your child hasn't been checked in yet \u2014 ask the coach to confirm arrival first.",
      existing: normalised,
    });
  }
  if (normalised.departureTime) {
    return json(409, {
      warning: "duplicate_departure",
      message: "Pickup has already been confirmed for this session.",
      existing: normalised,
    });
  }

  const nowIso = new Date().toISOString();
  const auditLine = `[${nowIso}] Parent self-confirmed pickup (${parentEmail}).`;
  const nextNotes = appendAuditLine(existing.fields?.["Coach Notes"], auditLine);

  let updated;
  try {
    updated = await airtableUpdate(attendanceTable(), existing.id, {
      "Departure Time": nowIso,
      "Coach Notes": nextNotes,
    });
  } catch (error) {
    console.error("[parent-self-pickup] Update failed:", error);
    return json(502, { error: "Airtable rejected the self-pickup update." });
  }

  return json(200, {
    ok: true,
    attendance: normaliseAttendance(updated),
  });
};
