// Web Push unsubscribe for the parent portal.
//
// POST /.netlify/functions/parent-push-unsubscribe
//   Body: { endpoint }
//   Auth: parent session cookie
//   Behaviour:
//     - Flips Active=false on the matching Push Subscriptions row instead
//       of deleting it. Keeping the row preserves the audit trail and lets
//       us tell when a parent re-subscribes from the same device.
//     - Verifies that the row's linked Parent matches the signed-in
//       parent's email so a malicious endpoint can't deactivate someone
//       else's subscription.
//     - Idempotent: returns 200 even if the endpoint isn't found, since
//       the SW also calls this on browser-side unsubscribe and we don't
//       want a stale state to surface as an error toast.
import {
  TABLE_IDS,
  airtableGet,
  airtableList,
  airtableUpdate,
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

async function findSubscriptionByEndpoint(endpoint) {
  const records = await airtableList(pushSubsTable(), { pageSize: "100" });
  return records.find((record) => String(record?.fields?.Endpoint || "") === endpoint) || null;
}

// Confirm the linked Parents/Guardians record's email matches the session
// email. Returns true on match, false otherwise. Hits Airtable for the
// linked record because the Push Subscriptions row only stores the id.
async function ownsSubscription(subscriptionRecord, sessionEmail) {
  const linked = subscriptionRecord?.fields?.Parent;
  if (!Array.isArray(linked) || linked.length === 0) return false;
  const parentId = linked[0];
  try {
    const parent = await airtableGet(parentsTable(), parentId);
    const candidate = normaliseEmail(parent?.fields?.Email);
    return Boolean(candidate) && candidate === sessionEmail;
  } catch (error) {
    console.error("[parent-push-unsubscribe] Parent lookup failed:", error);
    return false;
  }
}

export const handler = async (event) => {
  const method = (event.httpMethod || "POST").toUpperCase();
  if (method !== "POST") {
    return json(405, { error: `Method ${method} not allowed.` });
  }
  if (!hasAirtableConfig()) {
    return json(503, { error: "The portal is not available in demo mode." });
  }

  const gate = requireParentSession(event, json);
  if (gate.error) return gate.error;
  const parentEmail = normaliseEmail(gate.session.email);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const endpoint = String(body.endpoint || "").trim();
  if (!endpoint) {
    return json(400, { error: "endpoint is required." });
  }

  try {
    const existing = await findSubscriptionByEndpoint(endpoint);
    if (!existing) {
      // Nothing on file — treat as success so the SW can call this
      // unconditionally without surfacing 404s to the user.
      return json(200, { ok: true, found: false });
    }

    const owned = await ownsSubscription(existing, parentEmail);
    if (!owned) {
      // Don't leak whether the subscription exists for someone else.
      return json(200, { ok: true, found: false });
    }

    await airtableUpdate(pushSubsTable(), existing.id, {
      Active: false,
      "Last Used At": new Date().toISOString(),
    });
    return json(200, { ok: true, found: true });
  } catch (error) {
    console.error("[parent-push-unsubscribe] Update failed:", error);
    return json(500, { error: "We couldn't update your notification settings. Please try again." });
  }
};
