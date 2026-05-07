// List the signed-in parent's push subscriptions for the prefs UI.
//
// GET /.netlify/functions/parent-push-list
//   Auth: parent session cookie
//   Response: { subscriptions: [{ id, deviceLabel, userAgent, active,
//                                  prefs: { oneHourReminder, checkInOpen,
//                                  pickupSoon }, createdAt, lastUsedAt,
//                                  isThisDevice }] }
//
// We don't return endpoints, P256DH keys, or auth keys — those are
// server-side secrets even from the parent's own UI. The client only
// needs enough to identify each device and toggle prefs.
//
// "isThisDevice" is computed by the SPA after the response lands, by
// matching its own subscription endpoint against a hash of each row's
// endpoint. To support that we ship a SHA-256 of the endpoint instead
// of the raw value — same identity, no leak.
import crypto from "node:crypto";

import {
  TABLE_IDS,
  airtableGet,
  airtableList,
  hasAirtableConfig,
  json,
  tableName,
} from "./_airtable.mjs";
import { normaliseEmail, requireParentSession } from "./_parent-session.mjs";

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

async function findParentIdByEmail(email) {
  const target = normaliseEmail(email);
  if (!target) return null;
  const records = await airtableList(parentsTable(), { pageSize: "100" });
  const match = records.find((record) => {
    const candidate = normaliseEmail(record?.fields?.Email);
    return candidate && candidate === target;
  });
  return match?.id || null;
}

function hashEndpoint(endpoint) {
  return crypto.createHash("sha256").update(String(endpoint || "")).digest("hex");
}

export const handler = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();
  if (method !== "GET") {
    return json(405, { error: `Method ${method} not allowed.` });
  }
  if (!hasAirtableConfig()) {
    return json(503, { error: "The portal is not available in demo mode." });
  }

  const gate = requireParentSession(event, json);
  if (gate.error) return gate.error;
  const parentEmail = normaliseEmail(gate.session.email);

  try {
    const parentId = await findParentIdByEmail(parentEmail);
    if (!parentId) {
      return json(200, { subscriptions: [] });
    }

    const records = await airtableList(pushSubsTable(), { pageSize: "100" });
    const subscriptions = [];
    for (const record of records) {
      const fields = record?.fields || {};
      const linked = Array.isArray(fields.Parent) ? fields.Parent : [];
      if (!linked.includes(parentId)) continue;
      // Defensive double-check: confirm the Parent record's Email still
      // matches this session, so a stale link can't leak rows after a
      // parent's email is reassigned.
      try {
        const parent = await airtableGet(parentsTable(), parentId);
        if (normaliseEmail(parent?.fields?.Email) !== parentEmail) continue;
      } catch {
        continue;
      }
      subscriptions.push({
        id: record.id,
        deviceLabel: String(fields["Device Label"] || "Unknown device"),
        userAgent: String(fields["User Agent"] || ""),
        active: Boolean(fields.Active),
        prefs: {
          oneHourReminder: Boolean(fields["Pref One Hour Reminder"]),
          checkInOpen: Boolean(fields["Pref Check In Open"]),
          pickupSoon: Boolean(fields["Pref Pickup Soon"]),
          // Default-on read so legacy rows that pre-date the field still
          // surface this pref as enabled in the SPA.
          noShowCheckIn:
            fields["Pref No Show Check-In"] === undefined
              ? true
              : Boolean(fields["Pref No Show Check-In"]),
        },
        endpointHash: hashEndpoint(fields.Endpoint),
        createdAt: fields["Created At"] || null,
        lastUsedAt: fields["Last Used At"] || null,
        failureCount: Number(fields["Failure Count"] || 0),
      });
    }

    // Most recently used first so "this device" tends to land at the top.
    subscriptions.sort((a, b) => {
      const aTs = Date.parse(a.lastUsedAt || a.createdAt || 0) || 0;
      const bTs = Date.parse(b.lastUsedAt || b.createdAt || 0) || 0;
      return bTs - aTs;
    });

    return json(200, { subscriptions });
  } catch (error) {
    console.error("[parent-push-list] Load failed:", error);
    return json(500, { error: "We couldn't load your notification settings. Please try again." });
  }
};
