import {
  buildSidebar,
  demoData,
  getCoachAndPlayers,
  getCoachDashboardDataForSessionEmail,
  hasAirtableConfig,
  json,
  listAttendance,
  listMediaConsents,
  listSessions,
  mergeMediaConsentsIntoPlayers,
} from "./_airtable.mjs";
import { gateCoachDashboard, wrapCoachResponse } from "./_coach-gate.mjs";

export const handler = async (event) => {
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  try {
    const base =
      gate.sessionEmail === null
        ? await getCoachAndPlayers()
        : await getCoachDashboardDataForSessionEmail(gate.sessionEmail);

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

    const players = mergeMediaConsentsIntoPlayers(base.players, mediaConsents);

    return wrapCoachResponse(
      gate,
      json(200, {
        ...base,
        players,
        sessions,
        attendance,
        sidebar: buildSidebar(players, {
          sessions: sessions.length,
          attendance: attendance.length,
        }),
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.error(error);
    if (!hasAirtableConfig()) {
      return wrapCoachResponse(
        gate,
        json(200, { ...demoData, warning: "Airtable unavailable; returned demo data." }),
      );
    }
    if (error?.code === "COACH_NOT_FOUND") {
      return json(403, { error: "Your session no longer matches a coach profile. Sign in again." });
    }
    return wrapCoachResponse(
      gate,
      json(200, { ...demoData, warning: "Airtable unavailable; returned demo data." }),
    );
  }
};
