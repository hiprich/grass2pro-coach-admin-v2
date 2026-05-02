import {
  buildSidebar,
  demoData,
  getCoachAndPlayers,
  json,
  listAttendance,
  listMediaConsents,
  listSessions,
  mergeMediaConsentsIntoPlayers,
} from "./_airtable.mjs";

export const handler = async () => {
  try {
    const base = await getCoachAndPlayers();

    // Pull live sessions, attendance and the latest Media Consents alongside
    // the coach/player data so the dashboard can render a single coherent
    // payload. Each lookup is wrapped independently — if one Airtable table
    // is unreachable we still return the rest of the live payload rather
    // than collapsing to demo data.
    const [sessions, attendance, mediaConsents] = await Promise.all([
      listSessions({ scope: "all" }).catch((error) => {
        console.error("admin-data sessions lookup failed:", error);
        return [];
      }),
      listAttendance().catch((error) => {
        console.error("admin-data attendance lookup failed:", error);
        return [];
      }),
      listMediaConsents().catch((error) => {
        console.error("admin-data media consents lookup failed:", error);
        return [];
      }),
    ]);

    // The Media Consents form is the source of truth for what permissions a
    // parent has actually granted. Overlay the latest matching row onto each
    // player so the Overview mini-cards and the Players page reflect what
    // was just submitted, without waiting for someone to mirror those flags
    // onto the Players table by hand.
    const players = mergeMediaConsentsIntoPlayers(base.players, mediaConsents);

    return json(200, {
      ...base,
      players,
      sessions,
      attendance,
      sidebar: buildSidebar(players, {
        sessions: sessions.length,
        attendance: attendance.length,
      }),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return json(200, { ...demoData, warning: "Airtable unavailable; returned demo data." });
  }
};
