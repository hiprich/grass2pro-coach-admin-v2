// Lightweight probe so the SPA can tell whether a coach session cookie is
// present once Airtable is configured (otherwise local demo stays permissive).

import {
  findCoachRecordByNormalisedEmail,
  hasAirtableConfig,
  json,
  normaliseCoach,
} from "./_airtable.mjs";
import { gateCoachDashboard, wrapCoachResponse } from "./_coach-gate.mjs";

export const handler = async (event) => {
  if ((event.httpMethod || "GET").toUpperCase() !== "GET") {
    return json(405, { error: "Method not allowed." });
  }
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  const demo = !hasAirtableConfig();
  let loggedInAs = null;
  let partner = null;
  let sessionEmail = null;

  if (!demo && gate.sessionEmail) {
    sessionEmail = gate.sessionEmail;
    try {
      const record = await findCoachRecordByNormalisedEmail(gate.sessionEmail);
      const coach = record ? normaliseCoach(record) : null;
      partner = coach?.partner ?? null;
      const name = coach?.name && String(coach.name).trim();
      loggedInAs = name || gate.sessionEmail;
    } catch (e) {
      console.error("coach-auth-status coach lookup failed:", e);
      loggedInAs = gate.sessionEmail;
    }
  }

  return wrapCoachResponse(
    gate,
    json(200, {
      ok: true,
      demo,
      ...(sessionEmail ? { sessionEmail } : {}),
      ...(loggedInAs ? { loggedInAs } : {}),
      ...(partner ? { partner } : {}),
    }),
  );
};
