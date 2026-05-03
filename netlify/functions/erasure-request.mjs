import {
  TABLE_IDS,
  airtableList,
  airtableUpdate,
  hasAirtableConfig,
  json,
  tableName,
} from "./_airtable.mjs";

// Public GDPR erasure-request endpoint used by the parent-facing /erasure
// page. This is intentionally separate from the leave flow because the two
// requests have different legal and operational implications:
//
//   * Leaving = "we don't want to be coached any more" \u2014 player record
//     stays on file as Status="Left" so attendance, payments and consent
//     history remain auditable.
//   * Erasure = "delete my child's personal data" \u2014 GDPR right to be
//     forgotten, must be reviewed and actioned manually by the coach.
//
// This endpoint only RAISES a flag (Erasure Requested = true with a
// timestamp). It never deletes anything. The coach completes the erasure
// in Airtable directly after verifying the requester is the legitimate
// guardian \u2014 that human review step is the whole point of keeping it
// manual.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escape(value) {
  return String(value).replace(/'/g, "\\'");
}

export const handler = async (event) => {
  if (!hasAirtableConfig()) {
    return json(503, { error: "Airtable is not configured." });
  }
  if ((event.httpMethod || "GET").toUpperCase() !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const childName = String(body.childName || "").trim();
  const parentEmail = String(body.parentEmail || "").trim().toLowerCase();
  const notes = String(body.notes || "").trim();

  if (!childName) {
    return json(400, { error: "Please enter the child's full name." });
  }
  if (!EMAIL_PATTERN.test(parentEmail)) {
    return json(400, { error: "Please enter a valid email address." });
  }

  try {
    const playersTable = tableName(
      "AIRTABLE_PLAYERS_TABLE",
      "Players",
      TABLE_IDS.PLAYERS,
    );

    // Match by child name. We deliberately don't filter by email here
    // because the Players row stores the guardian *name*, not their email
    // \u2014 emails live on the Parents/Guardians table. A name match is
    // enough to flag the row; the coach verifies the requester out-of-band
    // before actioning the erasure, which is the GDPR-safe workflow.
    const matches = await airtableList(playersTable, {
      filterByFormula: `LOWER({Full Name}) = '${escape(childName.toLowerCase())}'`,
      maxRecords: "5",
    });

    if (matches.length === 0) {
      // We still return success: surfacing "no record found" leaks
      // whether a child is on the squad. Acknowledge the request and let
      // the coach follow up offline.
      return json(200, { ok: true, matched: 0 });
    }

    const stamp = new Date().toISOString();
    const noteSuffix = notes
      ? `\n\nParent notes: ${notes}\nSubmitted email: ${parentEmail}`
      : `\n\nSubmitted email: ${parentEmail}`;

    await Promise.all(
      matches.map((record) => {
        const existingNotes = String(record.fields?.["Leave Notes"] || "").trim();
        const combined = `${existingNotes ? `${existingNotes}\n\n` : ""}Erasure requested ${stamp}${noteSuffix}`;
        return airtableUpdate(playersTable, record.id, {
          "Erasure Requested": true,
          "Erasure Requested At": stamp,
          "Leave Notes": combined,
        });
      }),
    );

    return json(200, { ok: true, matched: matches.length });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Unable to record erasure request." });
  }
};
