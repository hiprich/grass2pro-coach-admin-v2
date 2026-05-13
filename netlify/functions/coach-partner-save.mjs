// Persists Logo Studio partner config to the **signed-in coach's** Airtable row
// ("Partner Config"). Uses session cookie from coach magic-link; no admin code.

import {
  airtableUpdate,
  findCoachRecordByNormalisedEmail,
  hasAirtableConfig,
  json,
  TABLE_IDS,
  tableName,
} from "./_airtable.mjs";
import { gateCoachDashboard, wrapCoachResponse } from "./_coach-gate.mjs";
import {
  MAX_PARTNER_CONFIG_BYTES,
  sanitisePartnerPayload,
} from "./_partner-config-sanitize.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Request body must be valid JSON." });
  }

  const partner = body?.partner;
  const sanitised = sanitisePartnerPayload(partner);
  if (!sanitised) {
    return json(400, {
      error:
        "Partner config must include at least brandName (a non-empty string).",
    });
  }

  const serialised = JSON.stringify(sanitised);
  if (Buffer.byteLength(serialised, "utf8") > MAX_PARTNER_CONFIG_BYTES) {
    return json(413, {
      error: `Partner config exceeds ${MAX_PARTNER_CONFIG_BYTES} bytes.`,
    });
  }

  if (!hasAirtableConfig()) {
    return wrapCoachResponse(
      gate,
      json(200, {
        ok: true,
        demo: true,
        partner: sanitised,
        message:
          "Airtable not configured on this deploy; payload validated but not persisted.",
      }),
    );
  }

  if (!gate.sessionEmail) {
    return json(401, { error: "Coach sign-in required to save to your profile." });
  }

  const record = await findCoachRecordByNormalisedEmail(gate.sessionEmail);
  if (!record?.id) {
    return json(404, {
      error:
        "No coach profile found for this account. Make sure your email matches the Coaches table.",
    });
  }

  const table = tableName(
    "AIRTABLE_COACHES_TABLE",
    "Coaches",
    TABLE_IDS.COACHES,
  );

  try {
    const updated = await airtableUpdate(table, record.id, {
      "Partner Config": serialised,
    });
    return wrapCoachResponse(
      gate,
      json(200, {
        ok: true,
        recordId: updated.id,
        partner: sanitised,
      }),
    );
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("NOT_FOUND") || message.includes("not found")) {
      return json(404, {
        error: "Coach record not found in Airtable.",
      });
    }
    console.error("coach-partner-save Airtable patch failed:", error);
    return json(500, {
      error:
        "Could not save partner config to Airtable. Ensure the Coaches table has a 'Partner Config' long-text field.",
    });
  }
};
