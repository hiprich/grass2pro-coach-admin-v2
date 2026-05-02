import {
  buildSidebar,
  demoData,
  getCoachAndPlayers,
  json,
  listAttendance,
  listSessions,
} from "./_airtable.mjs";

export const handler = async () => {
  try {
    const base = await getCoachAndPlayers();

    // Pull live sessions and attendance alongside the coach/player data so the
    // dashboard can render a single coherent payload. Each lookup is wrapped
    // independently — if one Airtable table is unreachable we still return the
    // rest of the live payload rather than collapsing to demo data.
    const [sessions, attendance] = await Promise.all([
      listSessions({ scope: "all" }).catch((error) => {
        console.error("admin-data sessions lookup failed:", error);
        return [];
      }),
      listAttendance().catch((error) => {
        console.error("admin-data attendance lookup failed:", error);
        return [];
      }),
    ]);

    return json(200, {
      ...base,
      sessions,
      attendance,
      sidebar: buildSidebar(base.players, {
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
