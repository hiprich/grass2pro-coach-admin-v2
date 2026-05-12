import { hasAirtableConfig, json } from "./_airtable.mjs";
import { requireCoachSession } from "./_coach-session.mjs";

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
