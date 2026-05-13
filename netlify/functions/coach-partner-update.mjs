// Persists a Logo Studio partner-lockup config to a Coaches row in Airtable.
//
// This is the v0 "save" side of the Logo Studio → coach landing pipeline.
// The Logo Studio at /admin/logo-studio currently outputs a JSON snippet
// that has to be hand-pasted into src/coachProfiles.ts before the change
// goes live. This endpoint replaces the paste step: the studio POSTs the
// JSON here, we patch the Coaches row, and a separate sync script
// (scripts/sync-partner-configs.mjs) overlays the new config into
// coachProfiles.ts at the next deploy.
//
// Auth posture (deliberately small):
//   - /admin/logo-studio has no per-coach auth yet (Phase G milestone),
//     so this endpoint is gated by a shared admin code from the env var
//     LOGO_STUDIO_ADMIN_CODE. The studio collects the code via an inline
//     form and remembers it in localStorage so Cobby doesn't re-type
//     it. Anyone without the code gets a 401.
//   - Target record is LOGO_STUDIO_COACH_RECORD_ID (defaults to Hope's
//     rect8JRrno85KaRNG). One coach per deploy until Phase G lands a
//     proper "save to my profile" tied to the signed-in coach.
//
// Field shape on the Coaches table:
//   "Partner Config" — Long text. Stores a JSON string of the
//   PartnerLogoConfig (matches src/partnerLogo.ts exactly). We persist
//   only the studio-relevant subset; partner.href is intentionally NOT
//   set here because the studio doesn't collect it — it stays whatever
//   coachProfiles.ts had before this row was last synced.
//
// Why JSON-as-text rather than separate Airtable fields?
//   The PartnerLogoConfig surface is wide (brandName, monogram, tagline,
//   accent, accentGradient stops, ink, wordmarkColor, taglineColor,
//   outlineColor, outlineWidth, style, shape, …) and the studio v1.3
//   already extends it. Spreading every field across the Coaches table
//   would force a schema migration every time we add a control. A single
//   "Partner Config" long-text field keeps the studio decoupled from
//   Airtable schema while still being human-inspectable in the Airtable
//   row view. Trade-off acknowledged: you can't filter coaches by, say,
//   accent colour in Airtable. That's fine — nobody needs to.

import {
  airtableUpdate,
  hasAirtableConfig,
  json,
  TABLE_IDS,
  tableName,
} from "./_airtable.mjs";
import {
  MAX_PARTNER_CONFIG_BYTES,
  sanitisePartnerPayload,
} from "./_partner-config-sanitize.mjs";

// Hope's record id is the safe default so a fresh deploy without the
// override env var still patches a real row instead of erroring. Phase G
// will replace this constant with the signed-in coach's record id from
// the session cookie.
const DEFAULT_COACH_RECORD_ID = "rect8JRrno85KaRNG";

export const handler = async (event) => {
  // Method gate first — the studio only ever POSTs here, and rejecting
  // GET/HEAD/OPTIONS up front means we don't waste body parsing or
  // Airtable round-trips on browser preflight probes that drift in.
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  // Admin code gate. Reading the env var inside the handler (rather than
  // at module top) means a missing env var produces a clear 503 at
  // request time instead of a silent "every code is wrong" misconfig.
  const expectedCode = process.env.LOGO_STUDIO_ADMIN_CODE;
  if (!expectedCode) {
    console.error(
      "coach-partner-update: LOGO_STUDIO_ADMIN_CODE env var is not set; refusing to save.",
    );
    return json(503, {
      error:
        "Save is not configured on this deploy. Set LOGO_STUDIO_ADMIN_CODE in Netlify env vars.",
    });
  }

  // Parse the body defensively — a truncated request, a HEAD probe, or a
  // mistyped Content-Type all show up here as JSON.parse errors.
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Request body must be valid JSON." });
  }

  const { adminCode, partner } = body || {};
  if (typeof adminCode !== "string" || adminCode !== expectedCode) {
    // Returning 401 (not 403) so the studio's UX can distinguish "you
    // typed the wrong code" from "the server isn't configured at all".
    return json(401, { error: "Invalid admin code." });
  }

  const sanitised = sanitisePartnerPayload(partner);
  if (!sanitised) {
    return json(400, {
      error: "Partner config must include at least brandName (a non-empty string).",
    });
  }

  // Size guard. Stringify first so we measure the post-sanitisation
  // payload — the one we'd actually persist — rather than the inbound
  // body which may contain keys we just dropped.
  const serialised = JSON.stringify(sanitised);
  if (Buffer.byteLength(serialised, "utf8") > MAX_PARTNER_CONFIG_BYTES) {
    return json(413, {
      error: `Partner config exceeds ${MAX_PARTNER_CONFIG_BYTES} bytes.`,
    });
  }

  // Resolve target record id. The env var is the override; the constant
  // above is the safe default (Hope) so a fresh deploy still works.
  const recordId =
    process.env.LOGO_STUDIO_COACH_RECORD_ID || DEFAULT_COACH_RECORD_ID;

  // When Airtable creds are missing (local dev, preview deploys without
  // the secret set), airtableUpdate's built-in demo-mode short-circuits
  // and returns a fake response. We surface that to the studio as a
  // 200 + demo flag so the UI can show "Saved (demo)" instead of
  // pretending it actually persisted. Same pattern as admin-data.mjs.
  if (!hasAirtableConfig()) {
    return json(200, {
      ok: true,
      demo: true,
      partner: sanitised,
      message:
        "Airtable not configured on this deploy; payload validated but not persisted.",
    });
  }

  const table = tableName(
    "AIRTABLE_COACHES_TABLE",
    "Coaches",
    TABLE_IDS.COACHES,
  );

  try {
    const updated = await airtableUpdate(table, recordId, {
      "Partner Config": serialised,
    });
    return json(200, {
      ok: true,
      recordId: updated.id,
      partner: sanitised,
    });
  } catch (error) {
    // Airtable's update failures usually fall into two buckets:
    //   - 404 "Record not found" — wrong LOGO_STUDIO_COACH_RECORD_ID,
    //     surface a 404 to the studio so the UI message can be specific.
    //   - 422 "Unknown field name: Partner Config" — the long-text
    //     field hasn't been created on the Coaches table yet. Surface
    //     as 500 with the underlying message so Cobby can read the
    //     hint in the function logs.
    const message = String(error?.message || "");
    if (message.includes("NOT_FOUND") || message.includes("not found")) {
      return json(404, {
        error: `Coach record ${recordId} not found in Airtable. Check LOGO_STUDIO_COACH_RECORD_ID.`,
      });
    }
    console.error("coach-partner-update Airtable patch failed:", error);
    return json(500, {
      error:
        "Could not save partner config to Airtable. Make sure the Coaches table has a 'Partner Config' long-text field.",
    });
  }
};
