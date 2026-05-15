// GET /api/public-coach-profile?slug=cobby-jones&recordId=rec…
// Public Airtable-backed overrides for /c/:slug landing pages (bio, avatar, location).

import {
  airtableGet,
  coachPublicLandingOverrides,
  findCoachRecordByPublicSlug,
  hasAirtableConfig,
  json,
  TABLE_IDS,
  tableName,
} from "./_airtable.mjs";

const COACHES_TABLE = () =>
  tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);

async function findCoachRecordForLanding({ slug, recordId }) {
  if (!hasAirtableConfig()) return null;
  if (recordId) {
    try {
      return await airtableGet(COACHES_TABLE(), recordId);
    } catch {
      return null;
    }
  }
  return findCoachRecordByPublicSlug(slug);
}

export const handler = async (event) => {
  if ((event.httpMethod || "GET").toUpperCase() !== "GET") {
    return json(405, { error: "Method not allowed." });
  }

  const slug = String(event.queryStringParameters?.slug || "").trim().toLowerCase();
  const recordId = String(event.queryStringParameters?.recordId || "").trim();
  if (!slug && !recordId) {
    return json(400, { error: "slug or recordId is required." });
  }

  if (!hasAirtableConfig()) {
    return json(200, { ok: true, overrides: null });
  }

  try {
    const record = await findCoachRecordForLanding({ slug, recordId });
    const overrides = coachPublicLandingOverrides(record);
    return json(200, { ok: true, overrides, recordId: record?.id || null });
  } catch (error) {
    console.error("[public-coach-profile]", error);
    return json(200, { ok: true, overrides: null });
  }
};
