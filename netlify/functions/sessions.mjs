import { listSessions, json, hasAirtableConfig } from "./_airtable.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." });
  }
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
};
