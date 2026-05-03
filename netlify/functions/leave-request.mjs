import {
  TABLE_IDS,
  airtableUpdate,
  findPlayerByPathwayToken,
  hasAirtableConfig,
  json,
  tableName,
} from "./_airtable.mjs";

// Public leave-request endpoint used by the parent-facing /leave/<token>
// page. The same token type as the pathway link is reused intentionally \u2014
// it's a per-player handle, not a per-action one, so the coach only ever
// has one link to share with a parent. The parent flagging "We'd like to
// move on" sets the Leave Requested checkbox and notes; it never moves the
// player to "Left" automatically. The coach reviews the request in the
// Action needed card and confirms via the Mark-as-Left modal.

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
      // Flag only \u2014 the coach is responsible for actually marking the
      // player as Left. We also burn the token so the link stops working
      // once the parent has used it.
      await airtableUpdate(playersTable, record.id, {
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
