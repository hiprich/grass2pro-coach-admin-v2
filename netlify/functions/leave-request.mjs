import {
  TABLE_IDS,
  airtableUpdate,
  findPlayerByPathwayToken,
  hasAirtableConfig,
  json,
  tableName,
} from "./_airtable.mjs";

// Public leave-request endpoint used by the parent-facing /leave/<token>
// page. The same token type as the pathway link is reused intentionally
// because it's a per-player handle, not a per-action one, so the parent
// only ever needs the one link from the coach.
//
// Parent submission is final: it moves the player to Status="Left"
// straight away and records the reason + timestamp. We also set the
// Leave Requested flag so the coach gets a heads-up on the dashboard
// Action needed card (purely informational - the player is already gone
// from active lists). The token is burned on submit so a link can't be
// replayed.

const ALLOWED_REASONS = new Set([
  "Moved area",
  "Joined another club",
  "Finished age group",
  "Parent request",
  "Other",
]);

export const handler = async (event) => {
  if (!hasAirtableConfig()) {
    return json(503, { error: "Airtable is not configured." });
  }

  const method = (event.httpMethod || "GET").toUpperCase();
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
      const fields = record.fields || {};
      return json(200, {
        childName:
          fields["Full Name"] || fields.Name || fields["Player Name"] || "",
        ageGroup: fields["Age Group"] || fields.AgeGroup || "",
        team: fields.Team || fields.Squad || "",
      });
    }

    if (method === "POST" || method === "PATCH") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON body." });
      }
      const reason = String(body.reason || "").trim();
      const notes = String(body.notes || "").trim();
      if (!ALLOWED_REASONS.has(reason)) {
        return json(400, { error: "Please choose one of the listed reasons." });
      }

      const playersTable = tableName(
        "AIRTABLE_PLAYERS_TABLE",
        "Players",
        TABLE_IDS.PLAYERS,
      );
      // Parent decision is final. Status flips to "Left" immediately and we
      // stamp the reason. The Leave Requested flag stays true so the coach
      // gets a visible notification on the dashboard until they acknowledge
      // it. Burn the token so the link can't be reused.
      await airtableUpdate(playersTable, record.id, {
        Status: "Left",
        "Leave Requested": true,
        "Leave Requested At": new Date().toISOString(),
        "Leave Reason": reason,
        "Leave Notes": notes || null,
        "Pathway Update Token": null,
        "Pathway Token Expires": new Date(0).toISOString(),
      });
      return json(200, { ok: true });
    }

    return json(405, { error: `Method ${method} not allowed.` });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Unable to record leave request." });
  }
};
