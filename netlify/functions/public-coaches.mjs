// GET /api/public-coaches — parent-facing list of coaches (name, role,
// location, avatar URL, optional club/partner label). No email or phone.
//
// Airtable (Coaches table, optional fields):
//   - "Hide from directory" or "Directory hidden" (checkbox) — omit when true
//   - "Public Slug" | "URL Slug" | "Page Slug" — must match a static slug in
//     src/coachProfiles.ts for /c/:slug to resolve when record id is unknown
//   - Location / Venue / Area / City / Training location / Address — area line
//   - "Avatar Image" | Avatar | Photo — attachment
//   - "Partner Config" — same JSON as Logo Studio (brandName surfaced only)

import { json, listPublicCoachDirectoryRows } from "./_airtable.mjs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
};

export async function handler(event) {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return json(405, { ok: false, message: "Method not allowed" });
  }
  if (event.httpMethod === "HEAD") {
    return { statusCode: 200, headers: { ...CACHE_HEADERS } };
  }
  try {
    const coaches = await listPublicCoachDirectoryRows();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...CACHE_HEADERS,
      },
      body: JSON.stringify({ ok: true, coaches }),
    };
  } catch (e) {
    console.error("[public-coaches]", e);
    return json(500, { ok: false, message: "Could not load the coach directory." });
  }
}
