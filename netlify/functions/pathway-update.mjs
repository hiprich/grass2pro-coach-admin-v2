import {
  TABLE_IDS,
  airtableUpdate,
  findPlayerByPathwayToken,
  hasAirtableConfig,
  json,
  tableName,
} from "./_airtable.mjs";

// Public pathway-update endpoint used by the parent-facing /pathway/<token>
// page. The link is minted by the coach in the dashboard (Players list \u2192
// "Send link to parent") and expires 7 days after issue. The endpoint is
// deliberately tiny: GET surfaces just enough context for the form to
// confirm to the parent that they are updating the right child, and PATCH
// writes the new pathway value. We do NOT return any sensitive parent
// contact details \u2014 the page only needs the child name to look credible.

const ALLOWED_PATHWAYS = new Set([
  "Grassroots Football",
  "Academy Football",
  "School Football",
  "Not Currently With a Team",
  "Other / Unsure",
]);

function pickPlayerSummary(record) {
  const fields = record.fields || {};
  return {
    childName:
      fields["Full Name"] || fields.Name || fields["Player Name"] || "",
    ageGroup: fields["Age Group"] || fields.AgeGroup || "",
    team: fields.Team || fields.Squad || "",
    currentPathway: fields["Football Pathway"] || "",
  };
}

export const handler = async (event) => {
  if (!hasAirtableConfig()) {
    return json(503, { error: "Airtable is not configured." });
  }

  const method = (event.httpMethod || "GET").toUpperCase();
  // Token comes from the URL path segment after the function name (Netlify
  // rewrites `/pathway/<token>` -> `/.netlify/functions/pathway-update?token=<token>`
  // via redirect rules) OR from a `token` query param. We accept both so
  // local dev (`netlify dev`) and the deployed redirect both work.
  const token =
    String(event.queryStringParameters?.token || "").trim() ||
    String((event.path || "").split("/").pop() || "").trim();

  if (!token) {
    return json(400, { error: "Missing token." });
  }

  try {
    const record = await findPlayerByPathwayToken(token);
    if (!record) {
      return json(404, {
        error: "This link has expired or is no longer valid.",
      });
    }

    if (method === "GET") {
      return json(200, pickPlayerSummary(record));
    }

    if (method === "PATCH" || method === "POST") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON body." });
      }
      const value = String(body.value || "").trim();
      if (!ALLOWED_PATHWAYS.has(value)) {
        return json(400, { error: "Please choose one of the listed options." });
      }

      const playersTable = tableName(
        "AIRTABLE_PLAYERS_TABLE",
        "Players",
        TABLE_IDS.PLAYERS,
      );
      // Submitting the pathway clears the token so the link can't be reused.
      // Expiry is set to a past timestamp as a belt-and-braces measure for
      // any cached lookups.
      await airtableUpdate(playersTable, record.id, {
        "Football Pathway": value,
        "Pathway Update Token": null,
        "Pathway Token Expires": new Date(0).toISOString(),
      });
      return json(200, { ok: true });
    }

    return json(405, { error: `Method ${method} not allowed.` });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Unable to update pathway." });
  }
};
