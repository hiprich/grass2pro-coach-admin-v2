import {
  findSessionByScanToken,
  hasAirtableConfig,
  json,
} from "./_airtable.mjs";

// Public, token-only endpoint that the parent scan landing page calls to find
// out *which* session a scanned QR belongs to and whether the scan window is
// currently open.
//
// The token IS the credential. Anyone holding it can resolve session metadata
// — that's intentional, the QR is meant to be scanned by parents during the
// session and the metadata returned is harmless (coach name, team name, start
// and end times, current phase). No player names, no parent names, no record
// IDs that aren't already present in the URL.
//
// The Phase B parent landing page will use the response to render "You're
// scanning into [Coach] — [Team] at [Time]. Pick which child to check in."
// and then post to the existing /qr-checkins endpoint with the resolved
// sessionId.
//
// Response shape on success:
//   {
//     ok: true,
//     sessionId: "recXXXX",
//     coachName: "Hope Bouhe",
//     teamName: "Grass2Pro West U11",
//     ageGroup: "U11",
//     location: "Pitch 3, Hackney Marshes",
//     date: "2026-05-07",
//     startTime: "17:30",
//     endTime: "19:00",
//     phase: "arrival" | "departure" | "closed" | "upcoming",
//     phaseLabel: "Arrival check-in open",
//     fallbackCode: "DEMO-U11-WEST"
//   }
//
// Response shape on failure:
//   { ok: false, error: "..." } with HTTP 400/404
//
// We deliberately do NOT distinguish between "token doesn't exist" and "token
// matches a cancelled session" in the error message — both return a 404 with
// a generic message so a malicious scanner can't enumerate valid tokens.

// Mirror the exact phase windows used by the coach dashboard so behaviour is
// consistent on both sides of the wire. See src/App.tsx checkinPhase() for the
// canonical definition.
const SESSION_GRACE_MS = 60 * 60 * 1000;        // 1 hour after end time
const CHECKIN_OPEN_LEAD_MS = 30 * 60 * 1000;    // 30 min before start
const DEPARTURE_LEAD_MS = 15 * 60 * 1000;       // 15 min before end

const PHASE_LABEL = {
  arrival: "Arrival check-in open",
  departure: "Departure check-in open",
  upcoming: "Check-in not open yet",
  closed: "Session check-in closed",
};

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  const token = (event.queryStringParameters?.t || event.queryStringParameters?.token || "").trim();
  if (!token) {
    return json(400, { ok: false, error: "Missing scan token." });
  }
  // Token format guard. Our generator emits 32 chars of base64url. We accept
  // anything between 16 and 64 chars to leave room for future rotation, but we
  // reject obvious junk early so we never burn an Airtable call on it.
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    return json(404, { ok: false, error: "Invalid scan token." });
  }

  let session;
  try {
    session = await findSessionByScanToken(token);
  } catch (error) {
    console.error("Scan resolve lookup failed:", error);
    if (!hasAirtableConfig()) {
      return json(503, {
        ok: false,
        error: "Scan service not configured.",
      });
    }
    return json(502, { ok: false, error: "Unable to resolve scan token." });
  }

  if (!session) {
    // Generic 404 — see comment above re: not enumerating tokens.
    return json(404, { ok: false, error: "Scan token not recognised." });
  }

  // Refuse cancelled sessions: the coach has explicitly called the session off.
  // We treat this the same as "token not found" for safety.
  if (session.state === "cancelled") {
    return json(404, { ok: false, error: "Scan token not recognised." });
  }

  // Refuse rows where we cannot compute a phase. A session without start/end
  // times is a draft and should not be scannable yet.
  const startsAt = parseSessionDateTime(session.date, session.startTime);
  const endsAt = parseSessionDateTime(session.date, session.endTime);
  if (!startsAt || !endsAt) {
    return json(409, {
      ok: false,
      error: "Session times are not set yet — please ask the coach.",
    });
  }

  const phase = computePhase(startsAt, endsAt, new Date());

  // Coach + team labelling drives the parent-side header on the scan page.
  // We fall back to "Grass2Pro" when neither field is set so the parent never
  // sees an empty card title.
  const coachName = (session.coach || "").trim() || "Grass2Pro";
  const teamName = (session.team || "").trim();

  return json(200, {
    ok: true,
    sessionId: session.id,
    coachName,
    teamName,
    ageGroup: session.ageGroup || "",
    location: session.location || "",
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    phase,
    phaseLabel: PHASE_LABEL[phase],
    fallbackCode: session.qrFallbackCode || "",
  });
};

// Parse `${yyyy-mm-dd}T${HH:mm}` in the server's local timezone (UTC on
// Netlify, but the times are stored as wall-clock London times in Airtable).
// Returns null if either piece is missing or unparseable.
//
// Note: this matches the client-side helper exactly. On staging, Netlify
// functions run in UTC, but `new Date("2026-05-07T17:30:00")` is interpreted
// as local time of the host. That's intentional — Phase 2's scheduled fan-out
// uses Intl.DateTimeFormat with timeZone:"Europe/London" to compare wall-clock
// windows. Here we only need to compare relative offsets (now vs start, now
// vs end) within the same timezone, so we can use a naive parser.
function parseSessionDateTime(date, time) {
  if (!date || !/^\d{2}:\d{2}$/.test(time || "")) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computePhase(startsAt, endsAt, now) {
  const t = now.getTime();
  const arrivalOpens = startsAt.getTime() - CHECKIN_OPEN_LEAD_MS;
  const departureOpens = endsAt.getTime() - DEPARTURE_LEAD_MS;
  const departureCloses = endsAt.getTime() + SESSION_GRACE_MS;
  if (t < arrivalOpens) return "upcoming";
  if (t < departureOpens) return "arrival";
  if (t < departureCloses) return "departure";
  return "closed";
}
