import { gateCoachDashboard } from "./_coach-gate.mjs";
import { getCoachAndPlayers, getCoachDashboardDataForSessionEmail, hasAirtableConfig, json } from "./_airtable.mjs";

export const handler = async (event) => {
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  try {
    const data =
      gate.sessionEmail === null
        ? await getCoachAndPlayers()
        : await getCoachDashboardDataForSessionEmail(gate.sessionEmail);
    return json(200, data.coach);
  } catch (error) {
    console.error(error);
    if (hasAirtableConfig() && error?.code === "COACH_NOT_FOUND") {
      return json(403, { error: "Coach record not found for this session." });
    }
    return json(500, { error: "Unable to load coach record." });
  }
};
