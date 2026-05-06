import {
  listSessions,
  rescheduleSession,
  json,
  hasAirtableConfig,
} from "./_airtable.mjs";

// Match yyyy-mm-dd dates and HH:mm times so we can hard-fail on bad input
// before we touch Airtable. Lenient enough to accept H:mm too (e.g. "9:30").
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

export const handler = async (event) => {
  if (event.httpMethod === "GET") {
    return handleList(event);
  }
  if (event.httpMethod === "PATCH") {
    return handlePatch(event);
  }
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
    console.error("Sessions endpoint error:", error);
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

// PATCH /sessions?id=recXXXX with body { date, startTime, endTime, location, coach? }
// All body fields are optional; we only update the ones present and write an
// audit line into Session Notes whenever something actually changed.
async function handlePatch(event) {
  // The session id can come from either the query string or the body. Query
  // string is friendlier for a fetch caller, body is friendlier for a curl
  // test. We accept both.
  const id =
    event.queryStringParameters?.id ||
    safeParse(event.body)?.id ||
    null;
  if (!id) return json(400, { error: "Missing session id." });

  const payload = safeParse(event.body) || {};
  const date = typeof payload.date === "string" ? payload.date.trim() : undefined;
  const startTime =
    typeof payload.startTime === "string" ? payload.startTime.trim() : undefined;
  const endTime =
    typeof payload.endTime === "string" ? payload.endTime.trim() : undefined;
  const location =
    typeof payload.location === "string" ? payload.location.trim() : undefined;
  const coach =
    typeof payload.coach === "string" ? payload.coach.trim() : undefined;

  // Reject obviously malformed inputs early so Airtable doesn't reject the
  // PATCH with a less helpful error message.
  if (date !== undefined && date && !DATE_RE.test(date)) {
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
      date,
      startTime,
      endTime,
      location,
      coach,
    });
    return json(200, {
      session,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sessions reschedule error:", error);
    return json(502, { error: "Reschedule failed." });
  }
}

function safeParse(body) {
  if (!body || typeof body !== "string") return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
