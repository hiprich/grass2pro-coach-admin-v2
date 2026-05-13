// Lightweight probe so the SPA can tell whether a coach session cookie is
// present once Airtable is configured (otherwise local demo stays permissive).

import { hasAirtableConfig, json } from "./_airtable.mjs";
import { gateCoachDashboard, wrapCoachResponse } from "./_coach-gate.mjs";

export const handler = async (event) => {
  if ((event.httpMethod || "GET").toUpperCase() !== "GET") {
    return json(405, { error: "Method not allowed." });
  }
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;
  return wrapCoachResponse(
    gate,
    json(200, {
      ok: true,
      demo: !hasAirtableConfig(),
    }),
  );
};
