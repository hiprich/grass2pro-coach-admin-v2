// Coach squad announcements — list and publish to linked parents (Airtable).
//
//   GET  /api/coach-announcements
//   POST /api/coach-announcements { title, body }

import {
  createCoachAnnouncement,
  findCoachRecordByNormalisedEmail,
  hasAirtableConfig,
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
      return wrapCoachResponse(gate, json(200, { ok: true, announcements: [], demo: true }));
    }
    try {
      const coach = await findCoachRecordByNormalisedEmail(normaliseEmail(gate.sessionEmail));
      if (!coach?.id) {
        return wrapCoachResponse(gate, json(404, { error: "Coach profile not found." }));
      }
      const announcements = await listAnnouncementsForCoachIds([coach.id]);
      return wrapCoachResponse(gate, json(200, { ok: true, announcements }));
    } catch (error) {
      console.error("[coach-announcements] GET", error);
      const detail = String(error?.message || "");
      if (detail.includes("NOT_FOUND") || detail.includes("Could not find table")) {
        return wrapCoachResponse(
          gate,
          json(503, {
            error:
              "Announcements table is not set up in Airtable yet. Add a table named Announcements with Coach (link), Title, Body, Active, and Published At.",
          }),
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
        json(200, { ok: true, demo: true, announcement: { title, body: text } }),
      );
    }

    try {
      const coach = await findCoachRecordByNormalisedEmail(normaliseEmail(gate.sessionEmail));
      if (!coach?.id) {
        return wrapCoachResponse(gate, json(404, { error: "Coach profile not found." }));
      }
      const announcement = await createCoachAnnouncement({ coachId: coach.id, title, body: text });
      return wrapCoachResponse(gate, json(201, { ok: true, announcement }));
    } catch (error) {
      console.error("[coach-announcements] POST", error);
      const detail = String(error?.message || "");
      if (detail.includes("NOT_FOUND") || detail.includes("UNKNOWN_FIELD")) {
        return wrapCoachResponse(
          gate,
          json(503, {
            error:
              "Could not publish — check the Announcements table exists with Coach, Title, Body, Active, and Published At fields.",
          }),
        );
      }
      return wrapCoachResponse(gate, json(500, { error: "Could not publish announcement." }));
    }
  }

  return wrapCoachResponse(gate, json(405, { error: "Method not allowed." }));
};
