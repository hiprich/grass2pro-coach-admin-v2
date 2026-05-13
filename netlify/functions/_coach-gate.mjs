import { hasAirtableConfig, json } from "./_airtable.mjs";
import { requireCoachSession, withRefreshedCoachSessionCookie } from "./_coach-session.mjs";

/**
 * Attach sliding-renewal Set-Cookie on successful responses when the coach is
 * authenticated (sessionEmail set). No-op in demo mode (sessionEmail null).
 */
export function wrapCoachResponse(gate, response) {
  if (!gate || !gate.ok || gate.sessionEmail == null) return response;
  return withRefreshedCoachSessionCookie(response, gate.sessionEmail);
}

/**
 * Demo / no-Airtable deploys behave like today (open coach dashboard reads).
 * Once Airtable is configured every coach-scoped endpoint requires a coach
 * magic-link session cookie minted via coach-auth.mjs.
 */
export function gateCoachDashboard(event, jsonFn = json) {
  if (!hasAirtableConfig()) return { ok: true, sessionEmail: null };
  const auth = requireCoachSession(event, jsonFn);
  if (auth.error) return { ok: false, response: auth.error };
  return { ok: true, sessionEmail: auth.session.email };
}
