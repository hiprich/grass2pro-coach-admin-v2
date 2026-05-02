import {
  airtableCreate,
  findAttendance,
  hasAirtableConfig,
  json,
  normaliseAttendance,
  tableName,
} from "./_airtable.mjs";

// QR Check-ins endpoint.
//
// Creates a QR Check-ins record for an Arrival or Departure scan, after the
// frontend has already shown a confirmation screen and the user has explicitly
// chosen the scan type. Defensive guards are returned with HTTP 409 when the
// requested scan looks like a duplicate or out-of-order action; the frontend
// can re-submit with `forceConfirm: true` only after a coach explicitly
// overrides.
//
// Airtable automations downstream are responsible for writing arrival/departure
// times back onto the Attendance row when Confirmation Result = Confirmed and
// Attendance Record ID Text is non-empty. We therefore include the resolved
// Attendance Record ID Text in the QR record we create.

const VALID_SCAN_TYPES = new Set(["Arrival", "Departure"]);

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

  const {
    sessionId,
    playerId,
    parentId,
    scanType,
    confirmationResult,
    method,
    notes,
    paymentResult,
    scanTime,
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
  let existingAttendance = null;
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

  // Attendance Record ID Text — used by existing Airtable automations to
  // resolve which Attendance row to update. When no row exists yet (first-ever
  // arrival), automations should create one keyed off (Session, Player); we
  // pass the link IDs and a placeholder text so the automation can fall back.
  const attendanceRecordIdText = existing?.id || `pending:${sessionId}:${playerId}`;

  const fields = {
    Session: [sessionId],
    Player: [playerId],
    "Scan Type": scanType,
    "Scan Time": scanTime || new Date().toISOString(),
    Method: method || "QR",
    "Confirmation Result": "Confirmed",
    "Attendance Record ID Text": attendanceRecordIdText,
  };
  if (parentId) fields["Parent/Guardian"] = [parentId];
  if (existing?.id) fields.Attendance = [existing.id];
  if (paymentResult) fields["Payment Result"] = paymentResult;
  if (notes) fields.Notes = notes;

  try {
    const record = await airtableCreate(tableName("AIRTABLE_QR_CHECKINS_TABLE", "QR Check-ins"), fields);
    return json(200, {
      ok: true,
      id: record.id,
      scanType,
      sessionId,
      playerId,
      attendanceRecordIdText,
      existingAttendanceId: existing?.id || null,
      forceConfirm: Boolean(forceConfirm),
    });
  } catch (error) {
    console.error("QR check-in create failed:", error);
    return json(500, { error: "Unable to create QR check-in record." });
  }
};
