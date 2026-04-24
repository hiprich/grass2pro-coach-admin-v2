import { getCoachAndPlayers, json } from "./_airtable.mjs";

export const handler = async () => {
  try {
    const data = await getCoachAndPlayers();
    return json(200, data.coach);
  } catch (error) {
    console.error(error);
    return json(500, { error: "Unable to load coach record." });
  }
};
