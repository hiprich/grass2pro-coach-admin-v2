import { demoData, getCoachAndPlayers, json } from "./_airtable.mjs";

export const handler = async () => {
  try {
    const data = await getCoachAndPlayers();
    return json(200, data);
  } catch (error) {
    console.error(error);
    return json(200, { ...demoData, warning: "Airtable unavailable; returned demo data." });
  }
};
