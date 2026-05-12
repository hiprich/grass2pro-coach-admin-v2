// Coach-side "Mark collected" endpoint (Phase A4).
//
// When a child is still showing on the OnPitchCard 30+ minutes after the
// session ends, the card flips to amber and the coach gets a per-chip "Mark
// collected" button. Tapping it hits this endpoint, which closes out the
// attendance row so the child no longer counts as on the pitch and the
// scheduled-push-fanout stops sending pickup-confirm nags to that parent.
//
//   POST /api/coach-mark-collected
//     { sessionId, playerId }
//
// The endpoint:
//   - Looks up the attendance row for (sessionId, playerId).
//   - Refuses (409) if there's no arrival recorded yet, or if a departure is
//     already set, so a double-tap doesn't blat over a parent self-pickup.
//   - Writes Departure Time = now() and appends an audit line to Coach Notes
//     so the lifecycle is auditable later.
//   - Returns the freshly normalised attendance row so the SPA can splice it
//     into local state without a full /attendance refresh.
//
// Requires the coach magic-link session cookie minted via coach-auth.mjs once
// Airtable secrets are wired (otherwise falls back to the historic open demo path).
import { gateCoachDashboard } from "./_coach-gate.mjs";
import {
  TABLE_IDS,
  airtableUpdate,
  findAttendance,
  hasAirtableConfig,
  json,
  normaliseAttendance,
  tableName,
} from "./_airtable.mjs";

function attendanceTable() {
  return tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance", TABLE_IDS.ATTENDANCE);
}

// Append a one-line audit entry to Coach Notes. Mirrors the Reschedule /
// Cancel / Edit audit-line pattern used elsewhere so the format stays
// consistent across coach-driven mutations.
function appendAuditLine(existingNotes, line) {
  const prior = String(existingNotes || "").trim();
  if (!prior) return line;
  return `${prior}\n${line}`;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const sessionId = String(payload?.sessionId || "").trim();
  const playerId = String(payload?.playerId || "").trim();
  if (!sessionId || !playerId) {
    return json(400, { error: "sessionId and playerId are required." });
  }

  if (!hasAirtableConfig()) {
    return json(503, {
      error: "Mark-collected is not available in demo mode.",
    });
  }

  let existing;
  try {
    existing = await findAttendance(sessionId, playerId);
  } catch (error) {
    console.error("[coach-mark-collected] Attendance lookup failed:", error);
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
      message: "This player hasn't been checked in yet \u2014 mark them present first.",
      existing: normalised,
    });
  }
  if (normalised.departureTime) {
    return json(409, {
      warning: "duplicate_departure",
      message: "Departure has already been recorded for this player.",
      existing: normalised,
    });
  }

  const nowIso = new Date().toISOString();
  const auditLine = `[${nowIso}] Coach marked collected (forgotten-departure backup).`;
  const nextNotes = appendAuditLine(existing.fields?.["Coach Notes"], auditLine);

  let updated;
  try {
    updated = await airtableUpdate(attendanceTable(), existing.id, {
      "Departure Time": nowIso,
      "Coach Notes": nextNotes,
      // The Attendance check-in method is "Coach Manual Entry" for any
      // coach-driven write \u2014 mirrors how the dashboard already records
      // manual check-ins in Phase 1.5.
      "Check-in Method": "Coach Manual Entry",
    });
  } catch (error) {
    console.error("[coach-mark-collected] Update failed:", error);
    return json(502, { error: "Airtable rejected the mark-collected update." });
  }

  return json(200, {
    ok: true,
    attendance: normaliseAttendance(updated),
  });
};
