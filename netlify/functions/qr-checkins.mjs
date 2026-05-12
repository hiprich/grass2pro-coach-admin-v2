import {
  AirtableHttpError,
  TABLE_IDS,
  airtableCreate,
  airtableUpdate,
  findAttendance,
  hasAirtableConfig,
  json,
  normaliseAttendance,
  tableName,
} from "./_airtable.mjs";
import { gateCoachDashboard } from "./_coach-gate.mjs";
import { readSessionFromEvent } from "./_parent-session.mjs";

// QR Check-ins endpoint.
//
// Creates a QR Check-ins record for an Arrival or Departure scan, after the
// frontend has already shown a confirmation screen and the user has explicitly
// chosen the scan type. Defensive guards are returned with HTTP 409 when the
// requested scan looks like a duplicate or out-of-order action; the frontend
// can re-submit with `forceConfirm: true` only after a coach explicitly
// overrides.
//
// We write the Attendance row directly server-side instead of relying on an
// Airtable automation: Arrival creates a new Attendance row (or updates an
// existing one's Arrival Time), Departure updates the existing row's Departure
// Time. The QR Check-ins record is then created as an audit trail and linked
// back to the Attendance row.

const CHECKIN_METHOD_BY_INPUT = {
  "Fallback Code": "Fallback Code",
  "QR Code": "QR Code",
};

const VALID_SCAN_TYPES = new Set(["Arrival", "Departure"]);

// Kit reminder window: when a parent scans their child OUT, we schedule a
// warm "check you haven't left anything behind" reminder for ~5 minutes
// later — just as the parent is likely walking back to the car. The fanout
// cron runs every 5 min with a ±5 min tolerance, so a 5-min target gives
// us a comfortable single-tick send window.
const KIT_REMINDER_DELAY_MIN = 5;
const KIND_KIT_REMINDER = "Kit Reminder";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  if (hasAirtableConfig()) {
    const coachGate = gateCoachDashboard(event, json);
    const parentSession = readSessionFromEvent(event);
    if (!coachGate.ok && !parentSession) {
      return coachGate.response;
    }
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const {
    sessionId,
    playerId,
    parentId,
    scanType,
    confirmationResult,
    method,
    notes,
    paymentResult,
    forceConfirm = false,
  } = payload || {};

  if (!sessionId || !playerId) {
    return json(400, { error: "sessionId and playerId are required." });
  }
  if (!VALID_SCAN_TYPES.has(scanType)) {
    return json(400, {
      error: "scanType must be 'Arrival' or 'Departure'.",
      received: scanType,
    });
  }
  if (confirmationResult !== "Confirmed") {
    return json(400, {
      error: "confirmationResult must be 'Confirmed'. Frontend must complete the explicit confirmation step before posting.",
      received: confirmationResult,
    });
  }

  // Demo mode: still return a useful shape so the UI can show success in
  // preview. We do not fabricate Airtable record IDs.
  if (!hasAirtableConfig()) {
    return json(200, {
      ok: true,
      demo: true,
      warning: "Airtable env vars not set; QR scan was not persisted.",
      scanType,
      sessionId,
      playerId,
    });
  }

  // Look up existing Attendance record for (session, player) and apply
  // duplicate / out-of-order safeguards.
  let existingAttendance;
  try {
    existingAttendance = await findAttendance(sessionId, playerId);
  } catch (error) {
    console.error("Attendance lookup failed:", error);
    return json(500, { error: "Unable to look up attendance record." });
  }

  const existing = existingAttendance ? normaliseAttendance(existingAttendance) : null;

  if (!forceConfirm && existing) {
    if (scanType === "Arrival" && existing.arrivalTime) {
      return json(409, {
        warning: "duplicate_arrival",
        message: "Arrival has already been recorded for this player on this session. Pass forceConfirm to override.",
        existing,
      });
    }
    if (scanType === "Departure" && existing.departureTime) {
      return json(409, {
        warning: "duplicate_departure",
        message: "Departure has already been recorded for this player on this session. Pass forceConfirm to override.",
        existing,
      });
    }
    if (scanType === "Departure" && !existing.arrivalTime) {
      return json(409, {
        warning: "departure_without_arrival",
        message: "No arrival has been recorded yet — confirm Arrival first, or pass forceConfirm to record Departure anyway.",
        existing,
      });
    }
  }

  if (!forceConfirm && !existing && scanType === "Departure") {
    return json(409, {
      warning: "departure_without_arrival",
      message: "No attendance record found yet — confirm Arrival first, or pass forceConfirm to record Departure anyway.",
      existing: null,
    });
  }

  // The QR Check-ins table has two computed fields that we MUST NOT send:
  //   - "Scan Time" is Airtable's createdTime, populated automatically.
  //   - "Attendance Record ID Text" is a formula, derived from the linked
  //     Attendance Record.
  // Sending them returns Airtable 422 INVALID_VALUE_FOR_COLUMN, which used to
  // surface as a generic "Unable to create QR check-in record" in the modal.
  // The downstream Airtable automation resolves the Attendance row from the
  // linked record (Attendance Record) or from (Session, Player) when no link
  // exists yet, so we only need to pass the link itself when known.
  const checkinMethod = CHECKIN_METHOD_BY_INPUT[method] || "QR Code";
  const nowIso = new Date().toISOString();
  const attendanceTable = tableName(
    "AIRTABLE_ATTENDANCE_TABLE",
    "Attendance",
    TABLE_IDS.ATTENDANCE,
  );

  // ---- Step 1: write Attendance row (create on Arrival if missing, else update). ----
  let attendanceId = existing?.id || null;
  try {
    if (scanType === "Arrival") {
      if (!attendanceId) {
        const attendanceFields = {
          Session: [sessionId],
          Player: [playerId],
          "Arrival Time": nowIso,
          "Attendance Status": "Present",
          "Confirmation Status": "Pending Parent Confirmation",
          "Check-in Method": checkinMethod,
        };
        if (parentId) attendanceFields["Parent/Guardian"] = [parentId];
        const created = await airtableCreate(attendanceTable, attendanceFields);
        attendanceId = created.id;
      } else {
        const updates = {
          "Arrival Time": nowIso,
          "Check-in Method": checkinMethod,
        };
        if (!existing.status) updates["Attendance Status"] = "Present";
        if (!existing.confirmationStatus) updates["Confirmation Status"] = "Pending Parent Confirmation";
        await airtableUpdate(attendanceTable, attendanceId, updates);
      }
    } else {
      // Departure
      if (attendanceId) {
        await airtableUpdate(attendanceTable, attendanceId, {
          "Departure Time": nowIso,
        });
      } else if (forceConfirm) {
        // forceConfirm Departure with no row: create a row with both times equal so
        // downstream views still consider it a complete attendance.
        const created = await airtableCreate(attendanceTable, {
          Session: [sessionId],
          Player: [playerId],
          "Arrival Time": nowIso,
          "Departure Time": nowIso,
          "Attendance Status": "Present",
          "Confirmation Status": "Pending Parent Confirmation",
          "Check-in Method": checkinMethod,
        });
        attendanceId = created.id;
      }
    }
  } catch (error) {
    console.error("Attendance write failed:", error);
    if (error instanceof AirtableHttpError) {
      const detail = extractAirtableErrorDetail(error.body);
      return json(error.status === 422 ? 422 : 502, {
        error: "Airtable rejected the attendance record.",
        detail,
        status: error.status,
      });
    }
    return json(500, { error: "Unable to write attendance record." });
  }

  // ---- Step 2: create QR Check-ins audit row. ----
  const fields = {
    Session: [sessionId],
    Player: [playerId],
    "Scan Type": scanType,
    Method: checkinMethod,
    "Confirmation Result": "Confirmed",
  };
  if (parentId) fields["Parent/Guardian"] = [parentId];
  if (attendanceId) fields["Attendance Record"] = [attendanceId];
  if (paymentResult) fields["Payment Result"] = paymentResult;
  if (notes) fields.Notes = notes;

  let kitReminderScheduled = false;
  try {
    const record = await airtableCreate(
      tableName("AIRTABLE_QR_CHECKINS_TABLE", "QR Check-ins", TABLE_IDS.QR_CHECKINS),
      fields,
    );

    // ---- Step 3: schedule kit reminder on Departure. ----
    // Best-effort: a failure here MUST NOT fail the scan response. The
    // parent's primary action (recording the scan-out) has already
    // succeeded, so we log + continue. The frontend uses the returned
    // `kitReminder` flag to show the warm in-app banner regardless of
    // whether the scheduled push row was written.
    if (scanType === "Departure" && parentId) {
      try {
        const sendAt = new Date(Date.now() + KIT_REMINDER_DELAY_MIN * 60_000);
        const dedupeKey = `kit-reminder:${sessionId}:${parentId}:${playerId}`;
        await airtableCreate(
          tableName(
            "AIRTABLE_NOTIFICATIONS_SENT_TABLE",
            "Notifications Sent",
            TABLE_IDS.NOTIFICATIONS_SENT,
          ),
          {
            "Dedupe Key": dedupeKey,
            Session: [sessionId],
            Parent: [parentId],
            Kind: KIND_KIT_REMINDER,
            Status: "Scheduled",
            "Scheduled For": sendAt.toISOString(),
          },
        );
        kitReminderScheduled = true;
      } catch (kitError) {
        console.warn("[qr-checkins] Kit reminder schedule failed:", kitError);
      }
    }

    return json(200, {
      ok: true,
      id: record.id,
      scanType,
      sessionId,
      playerId,
      attendanceId,
      existingAttendanceId: existing?.id || null,
      forceConfirm: Boolean(forceConfirm),
      // Frontend reads this to fire the warm in-app banner immediately on
      // a Departure scan, regardless of push subscription state. The push
      // 5 min later is the safety net.
      kitReminder: scanType === "Departure",
      kitReminderScheduled,
    });
  } catch (error) {
    console.error("QR check-in create failed:", error);
    if (error instanceof AirtableHttpError) {
      const detail = extractAirtableErrorDetail(error.body);
      return json(error.status === 422 ? 422 : 502, {
        error: "Airtable rejected the QR check-in record.",
        detail,
        status: error.status,
        attendanceId,
      });
    }
    return json(500, { error: "Unable to create QR check-in record.", attendanceId });
  }
};

// Airtable error responses are JSON like
//   {"error":{"type":"INVALID_VALUE_FOR_COLUMN","message":"Field 'Scan Time' cannot accept the provided value."}}
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
