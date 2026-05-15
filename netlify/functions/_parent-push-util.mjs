// Shared Web Push helpers for immediate (non-scheduled) parent notifications.

import webpush from "web-push";
import {
  airtableList,
  airtableUpdate,
  hasAirtableConfig,
  tableName,
  TABLE_IDS,
} from "./_airtable.mjs";
import { normaliseEmail } from "./_parent-session.mjs";

export const KIND_REGISTRATION = "Registration Confirmation";

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

export function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@grass2pro.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID env vars not configured.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function hasWebPushConfig() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function findParentIdByEmail(email) {
  const target = normaliseEmail(email);
  if (!target || !hasAirtableConfig()) return null;
  const records = await airtableList(parentsTable(), { pageSize: "100" });
  const match = records.find((record) => {
    const candidate = normaliseEmail(record?.fields?.Email);
    return candidate && candidate === target;
  });
  return match?.id || null;
}

export async function findActiveSubscriptionsForParent(parentId) {
  if (!parentId) return [];
  const records = await airtableList(pushSubsTable(), { pageSize: "100" });
  return records.filter((record) => {
    const fields = record?.fields || {};
    if (!fields.Active) return false;
    const links = Array.isArray(fields.Parent) ? fields.Parent : [];
    return links.includes(parentId);
  });
}

export function buildRegistrationPushPayload({ coachName, childName, coachSlug }) {
  const coachFirst = coachName.split(/\s+/)[0] || coachName;
  return JSON.stringify({
    title: "Registration received",
    body: `We've sent ${childName}'s details to ${coachFirst}. They'll be in touch soon.`,
    tag: `registration-${coachSlug || "coach"}`,
    url: "/portal",
    data: { kind: KIND_REGISTRATION, coachSlug: coachSlug || "" },
  });
}

async function sendOne(subscriptionRecord, payload) {
  const fields = subscriptionRecord.fields || {};
  const pushSub = {
    endpoint: String(fields.Endpoint || ""),
    keys: {
      p256dh: String(fields["P256DH Key"] || ""),
      auth: String(fields["Auth Key"] || ""),
    },
  };
  return webpush.sendNotification(pushSub, payload);
}

/** Send registration confirmation push to every active device for this parent. */
export async function sendRegistrationPushToParent({ parentId, coachName, childName, coachSlug }) {
  if (!hasWebPushConfig() || !parentId) {
    return { sent: 0, attempted: 0, skipped: true };
  }

  configureWebPush();
  const subscriptions = await findActiveSubscriptionsForParent(parentId);
  if (subscriptions.length === 0) {
    return { sent: 0, attempted: 0, skipped: false };
  }

  const payload = buildRegistrationPushPayload({ coachName, childName, coachSlug });
  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await sendOne(sub, payload);
      sent += 1;
    } catch (error) {
      const httpStatus = Number(error?.statusCode || 0);
      console.warn("[parent-push-util] registration push failed:", httpStatus, error?.message || error);
      if (httpStatus === 404 || httpStatus === 410) {
        try {
          await airtableUpdate(pushSubsTable(), sub.id, {
            Active: false,
            "Failure Count": Number(sub.fields?.["Failure Count"] || 0) + 1,
          });
        } catch (deactivateError) {
          console.warn("[parent-push-util] deactivate subscription failed:", deactivateError);
        }
      }
    }
  }
  return { sent, attempted: subscriptions.length, skipped: false };
}
