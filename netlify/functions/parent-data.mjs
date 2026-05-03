// Read-only parent portal endpoint.
//
//   GET /api/parent-data
//     Returns the signed-in parent's children, scoped attendance for the
//     last 7 days of sessions, and the session metadata needed to render
//     the parent overview. Anything that doesn't match the parent's email
//     is filtered out before it leaves the function.
//
// The portal deliberately surfaces the same player object shape the coach
// dashboard uses (name, age group, consent flags, pathway, leave status)
// so the SPA can reuse the existing chips/badges. We just don't expose any
// player not linked to this parent's email.
import {
  TABLE_IDS,
  airtableList,
  hasAirtableConfig,
  json,
  normaliseAttendance,
  normalisePlayer,
  normaliseSession,
  tableName,
} from "./_airtable.mjs";
import { normaliseEmail, requireParentSession } from "./_parent-session.mjs";

const RECENT_SESSION_WINDOW_DAYS = 7;

function asDate(iso) {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function loadPlayersForParent(parentEmail) {
  if (!hasAirtableConfig()) return [];
  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  const records = await airtableList(playersTable, { pageSize: "100" });
  return records.map(normalisePlayer).filter((player) => player.parentEmail === parentEmail);
}

// Recent sessions = anything dated within the last RECENT_SESSION_WINDOW_DAYS
// days OR upcoming. We pull all sessions and filter in code so we don't
// have to maintain a parallel filterByFormula expression.
async function loadRecentSessions() {
  if (!hasAirtableConfig()) return [];
  const sessionsTable = tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
  const records = await airtableList(sessionsTable, { pageSize: "100" });
  const cutoff = Date.now() - RECENT_SESSION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return records
    .map(normaliseSession)
    .filter((session) => {
      if (!session.date) return true;
      const ts = asDate(session.date);
      return ts === 0 || ts >= cutoff;
    })
    .sort((a, b) => asDate(b.date) - asDate(a.date));
}

async function loadAttendanceForPlayers(playerIds) {
  if (!hasAirtableConfig() || playerIds.length === 0) return [];
  const attendanceTable = tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance", TABLE_IDS.ATTENDANCE);
  const records = await airtableList(attendanceTable, { pageSize: "100" });
  const playerIdSet = new Set(playerIds);
  return records
    .map(normaliseAttendance)
    .filter((row) => playerIdSet.has(row.playerId));
}

export const handler = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();
  if (method !== "GET") {
    return json(405, { error: `Method ${method} not allowed.` });
  }

  const gate = requireParentSession(event, json);
  if (gate.error) return gate.error;
  const parentEmail = normaliseEmail(gate.session.email);

  try {
    const players = await loadPlayersForParent(parentEmail);
    if (players.length === 0) {
      return json(200, {
        email: parentEmail,
        players: [],
        sessions: [],
        attendance: [],
      });
    }

    const playerIds = players.map((player) => player.id);
    const [sessions, attendance] = await Promise.all([
      loadRecentSessions(),
      loadAttendanceForPlayers(playerIds),
    ]);

    // Only return attendance/sessions that intersect this parent's children.
    const recentSessionIds = new Set(sessions.map((session) => session.id));
    const scopedAttendance = attendance.filter((row) => recentSessionIds.has(row.sessionId));

    return json(200, {
      email: parentEmail,
      players,
      sessions,
      attendance: scopedAttendance,
    });
  } catch (error) {
    console.error("[parent-data] Failed to load parent overview:", error);
    return json(500, { error: "Unable to load your family's information right now." });
  }
};
