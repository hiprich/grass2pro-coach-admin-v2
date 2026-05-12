import {
  listSessions,
  rescheduleSession,
  cancelSession,
  createSession,
  editSession,
  json,
  hasAirtableConfig,
} from "./_airtable.mjs";
import { gateCoachDashboard } from "./_coach-gate.mjs";

// Match yyyy-mm-dd dates and HH:mm times so we can hard-fail on bad input
// before we touch Airtable. Lenient enough to accept H:mm too (e.g. "9:30").
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

// Allow-list of cancellation reasons. Anything outside the list is treated as
// free-text "detail" so coaches can still type something custom without us
// silently dropping it.
const CANCEL_REASONS = new Set([
  "Bad weather",
  "Not enough players",
  "Emergency",
  "Unforeseen circumstances",
]);

// Pitch surface allow-list. Title Case to match Airtable singleSelect convention.
// Anything outside the list is rejected so the Airtable field stays clean.
const PITCH_TYPES = new Set(["Astro 4G", "Grass"]);

export const handler = async (event) => {
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  if (event.httpMethod === "GET") return handleList(event);
  if (event.httpMethod === "POST") return handleCreate(event);
  if (event.httpMethod === "PATCH") return handlePatch(event);
  if (event.httpMethod === "DELETE") return handleCancel(event);
  return json(405, { error: "Method not allowed." });
};

async function handleList(event) {
  const scope = event.queryStringParameters?.scope || "upcoming";
  if (!["upcoming", "past", "all"].includes(scope)) {
    return json(400, { error: "Invalid scope. Use upcoming, past or all." });
  }
  try {
    const sessions = await listSessions({ scope });
    return json(200, { sessions, scope, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Sessions list error:", error);
    if (!hasAirtableConfig()) {
      return json(200, {
        sessions: [],
        scope,
        warning: "Airtable not configured; returned empty list.",
        updatedAt: new Date().toISOString(),
      });
    }
    return json(502, { error: "Sessions lookup failed." });
  }
}

// POST /sessions with body { date, startTime?, endTime?, location?, sessionFee?, name?, ageGroup?, team?, coach? }
// Quick-five: only `date` is required. Everything else is optional and falls
// back to sensible defaults.
async function handleCreate(event) {
  const payload = safeParse(event.body) || {};
  const date = typeof payload.date === "string" ? payload.date.trim() : "";
  if (!date || !DATE_RE.test(date)) {
    return json(400, { error: "date must be in yyyy-mm-dd format." });
  }

  const startTime = trimString(payload.startTime);
  const endTime = trimString(payload.endTime);
  if (startTime && !TIME_RE.test(startTime)) {
    return json(400, { error: "startTime must be in HH:mm format." });
  }
  if (endTime && !TIME_RE.test(endTime)) {
    return json(400, { error: "endTime must be in HH:mm format." });
  }

  const sessionFee =
    payload.sessionFee === "" || payload.sessionFee === null || payload.sessionFee === undefined
      ? undefined
      : Number(payload.sessionFee);
  if (sessionFee !== undefined && (!Number.isFinite(sessionFee) || sessionFee < 0)) {
    return json(400, { error: "sessionFee must be a positive number." });
  }

  const rawPitchType = trimString(payload.pitchType);
  const pitchType = rawPitchType ? (PITCH_TYPES.has(rawPitchType) ? rawPitchType : null) : undefined;
  if (pitchType === null) {
    return json(400, { error: "pitchType must be one of: Astro 4G, Grass." });
  }

  if (!hasAirtableConfig()) {
    return json(200, {
      session: null,
      warning: "Airtable not configured; create was a no-op.",
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const session = await createSession({
      name: trimString(payload.name) || undefined,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      location: trimString(payload.location) || undefined,
      pitchType: pitchType || undefined,
      sessionFee,
      ageGroup: trimString(payload.ageGroup) || undefined,
      team: trimString(payload.team) || undefined,
      coach: trimString(payload.coach) || undefined,
    });
    return json(200, { session, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Sessions create error:", error);
    return json(502, {
      error: "Create session failed.",
      detail: error?.message || String(error),
    });
  }
}

// PATCH /sessions?id=recXXXX
//
// Two ops share this endpoint, discriminated by body.op:
//   - op="edit"        → full-row edit (all fields, audit only on significant
//                       changes — date/start/end/location/pitchType)
//   - op="reschedule"  → narrow reschedule (date/start/end/location only,
//                       always writes a [Rescheduled …] audit line)
//   - omitted          → defaults to reschedule for backwards compatibility
async function handlePatch(event) {
  const id = sessionIdFrom(event);
  if (!id) return json(400, { error: "Missing session id." });

  const payload = safeParse(event.body) || {};
  const op = typeof payload.op === "string" ? payload.op : "reschedule";
  if (op === "edit") return handleEdit(id, payload);
  if (op === "reschedule") return handleReschedule(id, payload);
  return json(400, { error: 'op must be "edit" or "reschedule".' });
}

async function handleReschedule(id, payload) {
  const date = trimString(payload.date);
  const startTime = trimString(payload.startTime);
  const endTime = trimString(payload.endTime);
  const location =
    typeof payload.location === "string" ? payload.location.trim() : undefined;
  const coach = trimString(payload.coach) || undefined;

  if (date && !DATE_RE.test(date)) {
    return json(400, { error: "date must be in yyyy-mm-dd format." });
  }
  if (startTime && !TIME_RE.test(startTime)) {
    return json(400, { error: "startTime must be in HH:mm format." });
  }
  if (endTime && !TIME_RE.test(endTime)) {
    return json(400, { error: "endTime must be in HH:mm format." });
  }

  if (!hasAirtableConfig()) {
    return json(200, {
      session: null,
      warning: "Airtable not configured; reschedule was a no-op.",
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const session = await rescheduleSession(id, {
      date: date || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      location,
      coach,
    });
    return json(200, { session, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Sessions reschedule error:", error);
    return json(502, { error: "Reschedule failed." });
  }
}

// Edit handler. Validates the same primitive shapes as create + reschedule
// (date/time/pitchType/fee allow-lists) and forwards everything to editSession,
// which decides what's an audit-worthy change vs a silent save.
async function handleEdit(id, payload) {
  const name = trimString(payload.name);
  const date = trimString(payload.date);
  const startTime = trimString(payload.startTime);
  const endTime = trimString(payload.endTime);
  const location =
    typeof payload.location === "string" ? payload.location.trim() : undefined;
  const ageGroup =
    typeof payload.ageGroup === "string" ? payload.ageGroup.trim() : undefined;
  const team = typeof payload.team === "string" ? payload.team.trim() : undefined;
  const coach = typeof payload.coach === "string" ? payload.coach.trim() : undefined;
  const notes = typeof payload.notes === "string" ? payload.notes : undefined;
  const coachActor = trimString(payload.coachActor) || undefined;

  if (date && !DATE_RE.test(date)) {
    return json(400, { error: "date must be in yyyy-mm-dd format." });
  }
  if (startTime && !TIME_RE.test(startTime)) {
    return json(400, { error: "startTime must be in HH:mm format." });
  }
  if (endTime && !TIME_RE.test(endTime)) {
    return json(400, { error: "endTime must be in HH:mm format." });
  }

  let sessionFee;
  if (
    payload.sessionFee !== "" &&
    payload.sessionFee !== null &&
    payload.sessionFee !== undefined
  ) {
    const parsed = Number(payload.sessionFee);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return json(400, { error: "sessionFee must be a positive number." });
    }
    sessionFee = parsed;
  }

  // Pitch type is allowed to be cleared (empty string) on edit — useful when
  // a coach picked the wrong surface and wants to wipe the field rather than
  // swap it. An explicit non-empty value must still match the allow-list.
  let pitchType;
  if (typeof payload.pitchType === "string") {
    const trimmed = payload.pitchType.trim();
    if (trimmed === "") {
      pitchType = "";
    } else if (PITCH_TYPES.has(trimmed)) {
      pitchType = trimmed;
    } else {
      return json(400, { error: "pitchType must be one of: Astro 4G, Grass." });
    }
  }

  if (!hasAirtableConfig()) {
    return json(200, {
      session: null,
      warning: "Airtable not configured; edit was a no-op.",
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const session = await editSession(id, {
      name: name || undefined,
      date: date || undefined,
      startTime: typeof payload.startTime === "string" ? startTime : undefined,
      endTime: typeof payload.endTime === "string" ? endTime : undefined,
      location,
      pitchType,
      sessionFee,
      ageGroup,
      team,
      coach,
      notes,
      coachActor,
    });
    return json(200, { session, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Sessions edit error:", error);
    return json(502, {
      error: "Edit session failed.",
      detail: error?.message || String(error),
    });
  }
}

// DELETE /sessions?id=recXXXX with body { reason, detail?, coach? }
// Cancel. We never hard-delete: we flip Status to Cancelled and write the
// reason into Session Notes so attendance/credits/payment history stays intact.
async function handleCancel(event) {
  const id = sessionIdFrom(event);
  if (!id) return json(400, { error: "Missing session id." });

  const payload = safeParse(event.body) || {};
  const rawReason = trimString(payload.reason);
  const reason = rawReason && CANCEL_REASONS.has(rawReason) ? rawReason : undefined;
  // Free-text custom reasons are still captured \u2014 just stored as detail.
  const detail =
    trimString(payload.detail) ||
    (rawReason && !reason ? rawReason : undefined);
  const coach = trimString(payload.coach) || undefined;

  if (!hasAirtableConfig()) {
    return json(200, {
      session: null,
      warning: "Airtable not configured; cancel was a no-op.",
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const session = await cancelSession(id, { reason, detail, coach });
    return json(200, { session, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Sessions cancel error:", error);
    return json(502, { error: "Cancel failed." });
  }
}

function sessionIdFrom(event) {
  return (
    event.queryStringParameters?.id ||
    safeParse(event.body)?.id ||
    null
  );
}

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeParse(body) {
  if (!body || typeof body !== "string") return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
