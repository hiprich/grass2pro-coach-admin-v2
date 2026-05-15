// POST /api/parent-registration-push
//
// After a coach landing registration, the browser may subscribe to Web Push
// without a parent-portal session. We verify the registration row + email,
// ensure a Parents/Guardians record exists, upsert the push subscription, and
// send an immediate confirmation push.

import {
  airtableCreate,
  airtableGet,
  airtableList,
  airtableUpdate,
  hasAirtableConfig,
  json,
  tableName,
  TABLE_IDS,
} from "./_airtable.mjs";
import { normaliseEmail } from "./_parent-session.mjs";
import {
  buildRegistrationPushPayload,
  hasWebPushConfig,
  sendPushToEndpoint,
  sendRegistrationPushToParent,
} from "./_parent-push-util.mjs";

const COACH_REGISTRATIONS_TABLE = "Coach Registrations";
const REGISTRATION_MAX_AGE_MS = 30 * 60 * 1000;

function pushSubsTable() {
  return tableName(
    "AIRTABLE_PUSH_SUBSCRIPTIONS_TABLE",
    "Push Subscriptions",
    TABLE_IDS.PUSH_SUBSCRIPTIONS,
  );
}

function parentsTable() {
  return tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS);
}

async function findSubscriptionByEndpoint(endpoint) {
  const records = await airtableList(pushSubsTable(), { pageSize: "100" });
  return records.find((record) => String(record?.fields?.Endpoint || "") === endpoint) || null;
}

async function resolveOrCreateParent({ parentName, parentEmail, parentPhone }) {
  const email = normaliseEmail(parentEmail);
  const records = await airtableList(parentsTable(), { pageSize: "100" });
  const existing = records.find((record) => normaliseEmail(record?.fields?.Email) === email);
  if (existing?.id) return existing.id;

  const name = String(parentName || "").trim();
  if (!name) return null;

  const fields = { "Full Name": name, Email: email };
  const phone = String(parentPhone || "").trim();
  if (phone) fields.Phone = phone;
  const created = await airtableCreate(parentsTable(), fields);
  return created?.id || null;
}

async function loadValidRegistration(registrationId, parentEmail) {
  const record = await airtableGet(COACH_REGISTRATIONS_TABLE, registrationId);
  const fields = record?.fields || {};
  const rowEmail = normaliseEmail(fields["Parent Email"]);
  if (!rowEmail || rowEmail !== normaliseEmail(parentEmail)) {
    return null;
  }
  const submittedAt = Date.parse(String(fields["Submitted At"] || ""));
  if (Number.isNaN(submittedAt) || Date.now() - submittedAt > REGISTRATION_MAX_AGE_MS) {
    return null;
  }
  return { fields };
}

function nowIso() {
  return new Date().toISOString();
}

function trimUserAgent(value) {
  const text = String(value || "").trim();
  return text.length <= 500 ? text : text.slice(0, 500);
}

function trimDeviceLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "Unknown device";
  return text.length > 100 ? text.slice(0, 100) : text;
}

export const handler = async (event) => {
  if ((event.httpMethod || "POST").toUpperCase() !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  if (!hasAirtableConfig()) {
    return json(503, { error: "Registration push is not available in demo mode." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const registrationId = String(body.registrationId || "").trim();
  const parentEmail = normaliseEmail(body.parentEmail);
  const parentName = String(body.parentName || "").trim();
  const parentPhone = String(body.parentPhone || "").trim();
  const endpoint = String(body.endpoint || "").trim();
  const p256dh = String(body?.keys?.p256dh || "").trim();
  const auth = String(body?.keys?.auth || "").trim();
  const coachName = String(body.coachName || "your coach").trim();
  const childName = String(body.childName || "your child").trim();
  const coachSlug = String(body.coachSlug || "").trim().toLowerCase();

  if (!registrationId || !parentEmail || !endpoint || !p256dh || !auth) {
    return json(400, { error: "registrationId, parentEmail, endpoint, and keys are required." });
  }

  let registration;
  try {
    registration = await loadValidRegistration(registrationId, parentEmail);
  } catch (error) {
    console.error("[parent-registration-push] registration lookup failed:", error);
    return json(500, { error: "Could not verify registration." });
  }
  if (!registration) {
    return json(403, { error: "Registration not found or expired." });
  }

  let parentId;
  try {
    parentId = await resolveOrCreateParent({
      parentName: parentName || registration.fields["Parent Name"],
      parentEmail,
      parentPhone: parentPhone || registration.fields["Parent Phone"],
    });
  } catch (error) {
    console.error("[parent-registration-push] parent resolve failed:", error);
    return json(500, { error: "Could not save your notification settings." });
  }
  if (!parentId) {
    return json(400, { error: "Parent name is required to enable notifications." });
  }

  const deviceLabel = trimDeviceLabel(body.deviceLabel);
  const userAgent = trimUserAgent(body.userAgent);

  try {
    const existing = await findSubscriptionByEndpoint(endpoint);
    if (existing) {
      await airtableUpdate(pushSubsTable(), existing.id, {
        Parent: [parentId],
        "P256DH Key": p256dh,
        "Auth Key": auth,
        "User Agent": userAgent || existing.fields?.["User Agent"] || "",
        "Device Label": deviceLabel,
        Active: true,
        "Last Used At": nowIso(),
        "Failure Count": 0,
      });
    } else {
      await airtableCreate(pushSubsTable(), {
        "Device Label": deviceLabel,
        Parent: [parentId],
        Endpoint: endpoint,
        "P256DH Key": p256dh,
        "Auth Key": auth,
        "User Agent": userAgent,
        Active: true,
        "Pref One Hour Reminder": true,
        "Pref Check In Open": true,
        "Pref Pickup Soon": true,
        "Pref No Show Check-In": true,
        "Created At": nowIso(),
        "Last Used At": nowIso(),
        "Failure Count": 0,
      });
    }
  } catch (error) {
    console.error("[parent-registration-push] subscription save failed:", error);
    return json(500, { error: "Could not save your notification settings." });
  }

  let pushSent = 0;
  if (hasWebPushConfig()) {
    try {
      const result = await sendRegistrationPushToParent({
        parentId,
        coachName,
        childName,
        coachSlug,
      });
      pushSent = result.sent;
      // Brand-new subscription: send immediately even if parent had no prior rows.
      if (pushSent === 0) {
        const payload = buildRegistrationPushPayload({ coachName, childName, coachSlug });
        await sendPushToEndpoint(endpoint, { p256dh, auth }, payload);
        pushSent = 1;
      }
    } catch (error) {
      console.warn("[parent-registration-push] immediate push failed:", error?.message || error);
    }
  }

  return json(200, { ok: true, pushSent: pushSent > 0 });
};
