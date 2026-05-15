// Coach squad announcements — list and publish to linked parents (Airtable).
//
//   GET  /api/coach-announcements
//   POST /api/coach-announcements { title, body }

import {
  COACH_ANNOUNCEMENTS_UNAVAILABLE,
  createCoachAnnouncement,
  findCoachRecordByNormalisedEmail,
  hasAirtableConfig,
  isAnnouncementsSetupError,
  json,
  listAnnouncementsForCoachIds,
} from "./_airtable.mjs";
import { gateCoachDashboard, wrapCoachResponse } from "./_coach-gate.mjs";
import { normaliseEmail } from "./_parent-session.mjs";

const MAX_TITLE = 120;
const MAX_BODY = 4000;

export const handler = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  if (method === "GET") {
    if (!hasAirtableConfig() || !gate.sessionEmail) {
      return wrapCoachResponse(
        gate,
        json(200, { ok: true, announcements: [], demo: true, available: true }),
      );
    }
    try {
      const coach = await findCoachRecordByNormalisedEmail(normaliseEmail(gate.sessionEmail));
      if (!coach?.id) {
        return wrapCoachResponse(gate, json(404, { error: "Coach profile not found." }));
      }
      const announcements = await listAnnouncementsForCoachIds([coach.id]);
      return wrapCoachResponse(gate, json(200, { ok: true, announcements, available: true }));
    } catch (error) {
      console.error("[coach-announcements] GET", error);
      if (isAnnouncementsSetupError(error)) {
        return wrapCoachResponse(
          gate,
          json(200, { ok: true, announcements: [], available: false }),
        );
      }
      return wrapCoachResponse(gate, json(500, { error: "Could not load announcements." }));
    }
  }

  if (method === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return wrapCoachResponse(gate, json(400, { error: "Invalid JSON." }));
    }

    const title = String(body.title || "").trim().slice(0, MAX_TITLE);
    const text = String(body.body || body.message || "").trim().slice(0, MAX_BODY);
    if (!title) {
      return wrapCoachResponse(gate, json(400, { error: "Add a short title for this announcement." }));
    }
    if (!text) {
      return wrapCoachResponse(gate, json(400, { error: "Add a message for parents." }));
    }

    if (!hasAirtableConfig() || !gate.sessionEmail) {
      return wrapCoachResponse(
        gate,
        json(200, {
          ok: true,
          demo: true,
          available: true,
          announcement: { title, body: text },
        }),
      );
    }

    try {
      const coach = await findCoachRecordByNormalisedEmail(normaliseEmail(gate.sessionEmail));
      if (!coach?.id) {
        return wrapCoachResponse(gate, json(404, { error: "Coach profile not found." }));
      }
      const announcement = await createCoachAnnouncement({ coachId: coach.id, title, body: text });
      return wrapCoachResponse(gate, json(201, { ok: true, announcement, available: true }));
    } catch (error) {
      console.error("[coach-announcements] POST", error);
      if (isAnnouncementsSetupError(error)) {
        return wrapCoachResponse(
          gate,
          json(503, { error: COACH_ANNOUNCEMENTS_UNAVAILABLE, available: false }),
        );
      }
      return wrapCoachResponse(gate, json(500, { error: "Could not publish announcement." }));
    }
  }

  return wrapCoachResponse(gate, json(405, { error: "Method not allowed." }));
};
