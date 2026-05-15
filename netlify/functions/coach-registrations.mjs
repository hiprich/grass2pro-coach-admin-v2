// Coach landing-page enquiries: list and accept-and-invite to full /register.
//
//   GET  /api/coach-registrations — registrations linked to signed-in coach
//   POST /api/coach-registrations { action: "accept-invite", registrationId }
//        — email parent a parent-portal sign-in link; Status → "Invited"

import {
  airtableGet,
  airtableUpdate,
  findCoachRecordByNormalisedEmail,
  hasAirtableConfig,
  json,
  listCoachRegistrationsForCoach,
  normaliseCoach,
  normaliseCoachRegistration,
} from "./_airtable.mjs";
import { gateCoachDashboard, wrapCoachResponse } from "./_coach-gate.mjs";
import { sendRegistrationInviteEmail } from "./_registration-invite-mailer.mjs";
import { normaliseEmail } from "./_parent-session.mjs";

const COACH_REGISTRATIONS_TABLE = "Coach Registrations";

function registrationBelongsToCoach(fields, coachRecordId) {
  const coachLink = fields?.Coach;
  const ids = Array.isArray(coachLink) ? coachLink : coachLink ? [coachLink] : [];
  return ids.includes(coachRecordId);
}

export const handler = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  if (method === "GET") {
    if (!hasAirtableConfig() || !gate.sessionEmail) {
      return wrapCoachResponse(gate, json(200, { ok: true, registrations: [], demo: true }));
    }
    try {
      const coach = await findCoachRecordByNormalisedEmail(normaliseEmail(gate.sessionEmail));
      if (!coach?.id) {
        return wrapCoachResponse(gate, json(404, { error: "Coach profile not found." }));
      }
      const registrations = await listCoachRegistrationsForCoach(coach.id);
      return wrapCoachResponse(gate, json(200, { ok: true, registrations }));
    } catch (error) {
      console.error("[coach-registrations] GET", error);
      return wrapCoachResponse(gate, json(500, { error: "Could not load registrations." }));
    }
  }

  if (method === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return wrapCoachResponse(gate, json(400, { error: "Invalid JSON." }));
    }

    const action = String(body.action || "").trim();
    if (action !== "accept-invite") {
      return wrapCoachResponse(gate, json(400, { error: "Unknown action." }));
    }

    const registrationId = String(body.registrationId || "").trim();
    if (!registrationId) {
      return wrapCoachResponse(gate, json(400, { error: "registrationId is required." }));
    }

    if (!hasAirtableConfig() || !gate.sessionEmail) {
      return wrapCoachResponse(
        gate,
        json(200, { ok: true, demo: true, registration: { id: registrationId, status: "Invited" } }),
      );
    }

    try {
      const coachRecord = await findCoachRecordByNormalisedEmail(normaliseEmail(gate.sessionEmail));
      if (!coachRecord?.id) {
        return wrapCoachResponse(gate, json(404, { error: "Coach profile not found." }));
      }

      const record = await airtableGet(COACH_REGISTRATIONS_TABLE, registrationId);
      const fields = record?.fields || {};
      if (!registrationBelongsToCoach(fields, coachRecord.id)) {
        return wrapCoachResponse(gate, json(403, { error: "This enquiry is not linked to your coach profile." }));
      }

      const registration = normaliseCoachRegistration(record);
      const status = String(registration.status || "New");
      if (status !== "New" && status !== "Invited") {
        return wrapCoachResponse(
          gate,
          json(409, { error: `Cannot invite — status is already "${status}".` }),
        );
      }

      const coachName = normaliseCoach(coachRecord).name || "Your coach";
      const parentEmail = normaliseEmail(registration.parentEmail);
      if (!parentEmail) {
        return wrapCoachResponse(gate, json(400, { error: "Registration is missing a parent email." }));
      }

      const mailResult = await sendRegistrationInviteEmail({
        to: parentEmail,
        parentName: registration.parentName,
        coachName,
        childName: registration.childName,
        coachSlug: registration.coachSlug,
      });

      if (!mailResult.ok) {
        return wrapCoachResponse(
          gate,
          json(502, {
            error: "Could not send the invite email. Try again or contact the parent directly.",
            reason: mailResult.reason,
            portalUrl: mailResult.portalUrl,
          }),
        );
      }

      await airtableUpdate(COACH_REGISTRATIONS_TABLE, registrationId, { Status: "Invited" });

      return wrapCoachResponse(
        gate,
        json(200, {
          ok: true,
          registration: { ...registration, status: "Invited" },
          portalUrl: mailResult.portalUrl,
        }),
      );
    } catch (error) {
      console.error("[coach-registrations] POST", error);
      return wrapCoachResponse(gate, json(500, { error: "Could not send invite." }));
    }
  }

  return wrapCoachResponse(gate, json(405, { error: "Method not allowed." }));
};
