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
  airtableGet,
  airtableList,
  hasAirtableConfig,
  json,
  listAnnouncementsForCoachIds,
  normaliseAttendance,
  normaliseCoach,
  normalisePlayer,
  normaliseSession,
  tableName,
} from "./_airtable.mjs";
import { normaliseEmail, requireParentSession, withRefreshedSessionCookie } from "./_parent-session.mjs";

const RECENT_SESSION_WINDOW_DAYS = 7;

function asDate(iso) {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Players are linked to a parent in two redundant ways:
//   1. "Parent Email" text field on the Player record (legacy, written by
//      coach-side flows and recent consent submissions)
//   2. "Parent/Guardian" linked-record field pointing at a Parents/Guardians
//      row whose Email field holds the same address
//
// Older consent submissions only populated path (2) — we now match either
// path so any child a parent is linked to in Airtable shows up in their
// portal regardless of which write succeeded. This also future-proofs us
// against schema drift between the consent form and the coach view.
async function loadPlayersForParent(parentEmail) {
  if (!hasAirtableConfig()) return [];
  const playersTable = tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
  const parentsTable = tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS);
  const [playerRecords, parentRecords] = await Promise.all([
    airtableList(playersTable, { pageSize: "100" }),
    airtableList(parentsTable, { pageSize: "100" }),
  ]);
  // Build the set of Parents/Guardians record IDs whose Email matches the
  // signed-in parent. We compare lower-cased and trimmed on both sides so
  // "Cobby7076@Gmail.com" still resolves.
  const matchingGuardianIds = new Set(
    parentRecords
      .filter((record) => {
        const email = String(record?.fields?.Email || "").trim().toLowerCase();
        return email && email === parentEmail;
      })
      .map((record) => record.id),
  );
  return playerRecords.map(normalisePlayer).filter((player) => {
    if (player.parentEmail === parentEmail) return true;
    if (Array.isArray(player.guardianIds)) {
      for (const id of player.guardianIds) {
        if (matchingGuardianIds.has(id)) return true;
      }
    }
    return false;
  });
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

async function buildParentCoachAnnouncements(players) {
  const coachIds = new Set();
  for (const p of players) {
    const ids = p.coachIds;
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (id && typeof id === "string") coachIds.add(id);
      }
    }
  }
  const uniqueCoachIds = [...coachIds];

  // Diagnostic: log exactly what we found so Netlify function logs show the
  // full chain when debugging a "no announcements" complaint.
  console.log(
    `[parent-data] buildParentCoachAnnouncements: ${players.length} player(s), ` +
    `coachIds=[${uniqueCoachIds.join(", ") || "none"}]`,
  );

  if (uniqueCoachIds.length === 0 || !hasAirtableConfig()) {
    console.log("[parent-data] Skipping announcements — no coach IDs on player records or Airtable not configured.");
    return [];
  }

  let rows;
  try {
    rows = await listAnnouncementsForCoachIds(uniqueCoachIds);
    console.log(`[parent-data] listAnnouncementsForCoachIds returned ${rows.length} row(s).`);
  } catch (error) {
    // Log the full error so Netlify function logs surface table-name
    // mismatches, token issues, or NOT_FOUND for the Announcements table.
    console.error("[parent-data] coach announcements fetch failed:", error?.message || error);
    return [];
  }

  const active = rows.filter((r) => r.active);
  console.log(`[parent-data] ${active.length} active announcement(s) after filtering.`);

  const coachesTable = tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);
  const coachMini = new Map();
  await Promise.all(
    uniqueCoachIds.map(async (cid) => {
      try {
        const rec = await airtableGet(coachesTable, cid);
        const c = normaliseCoach(rec);
        coachMini.set(cid, { name: c.name || "Coach", avatarUrl: c.avatarUrl ? String(c.avatarUrl) : "" });
      } catch {
        coachMini.set(cid, { name: "Your coach", avatarUrl: "" });
      }
    }),
  );

  return active.map((a) => {
    const cid = a.coachId || "";
    // Fall back: if the announcement's Coach link is missing, scan all coaches
    // we loaded for this parent — use the first one as the attribution.
    const fallbackCoach = coachMini.size > 0 ? coachMini.values().next().value : null;
    const mini = (cid && coachMini.get(cid)) || fallbackCoach;
    return {
      id: a.id,
      title: a.title,
      body: a.body,
      publishedAt: a.publishedAt || "",
      coachId: cid || (coachMini.size > 0 ? uniqueCoachIds[0] : ""),
      coachName: mini?.name || "Your coach",
      coachAvatarUrl: mini?.avatarUrl || "",
    };
  });
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
      return withRefreshedSessionCookie(
        json(200, {
          email: parentEmail,
          players: [],
          sessions: [],
          attendance: [],
          coachAnnouncements: [],
        }),
        parentEmail,
      );
    }

    const playerIds = players.map((player) => player.id);
    const [sessions, attendance, coachAnnouncements] = await Promise.all([
      loadRecentSessions(),
      loadAttendanceForPlayers(playerIds),
      buildParentCoachAnnouncements(players),
    ]);

    // Only return attendance/sessions that intersect this parent's children.
    const recentSessionIds = new Set(sessions.map((session) => session.id));
    const scopedAttendance = attendance.filter((row) => recentSessionIds.has(row.sessionId));

    // Sliding renewal: every successful parent-data fetch extends the
    // session cookie by another PARENT_SESSION_TTL_DAYS. As long as the
    // parent opens the portal at least once a year they stay signed in.
    return withRefreshedSessionCookie(
      json(200, {
        email: parentEmail,
        players,
        sessions,
        attendance: scopedAttendance,
        coachAnnouncements,
      }),
      parentEmail,
    );
  } catch (error) {
    console.error("[parent-data] Failed to load parent overview:", error);
    return json(500, { error: "Unable to load your family's information right now." });
  }
};
