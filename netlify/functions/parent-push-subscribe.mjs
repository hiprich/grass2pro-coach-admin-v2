// Web Push subscription registration for the parent portal.
//
// POST /.netlify/functions/parent-push-subscribe
//   Body: { endpoint, keys: { p256dh, auth }, deviceLabel?, userAgent?, reason? }
//   Auth: parent session cookie (same as /parent-actions)
//   Behaviour:
//     - Looks up the parent record by their session email.
//     - Upserts a row in the Push Subscriptions table keyed on `Endpoint`
//       (Web Push endpoints are globally unique per browser+device, so the
//       same parent re-signing in on the same device just refreshes the row
//       rather than spawning duplicates).
//     - On a fresh row, the three preference toggles default to ON.
//     - On an existing row, prefs are NOT overwritten — the parent may have
//       already turned one off in the prefs UI.
//
// Cookies + CORS: the SPA and the function share an origin, so we don't need
// CORS headers. SameSite=Lax on the session cookie is sufficient.
import {
  TABLE_IDS,
  airtableCreate,
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

// Find the Parents/Guardians record matching the signed-in parent's email.
// Returns the record id or null. We page through Airtable rather than using
// filterByFormula because the Email field is plain text and the formula
// engine's case sensitivity has bitten us before.
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

// Look up an existing Push Subscriptions row by endpoint. Endpoints are long
// (often 200+ chars) and contain `/` and `=` so we filterByFormula on a SHA
// would be safer — but the table is small (one row per parent device) and
// scanning is fine for now. We stop pagination once we find a match.
async function findSubscriptionByEndpoint(endpoint) {
  const records = await airtableList(pushSubsTable(), { pageSize: "100" });
  return records.find((record) => String(record?.fields?.Endpoint || "") === endpoint) || null;
}

function nowIso() {
  return new Date().toISOString();
}

// Truncate a long User-Agent string so the singleLineText column doesn't
// reject it. 500 is well below Airtable's per-cell limit and still leaves
// enough to identify the browser+OS combination.
function trimUserAgent(value) {
  const text = String(value || "").trim();
  if (text.length <= 500) return text;
  return text.slice(0, 500);
}

function trimDeviceLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "Unknown device";
  return text.length > 100 ? text.slice(0, 100) : text;
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
  const p256dh = String(body?.keys?.p256dh || "").trim();
  const auth = String(body?.keys?.auth || "").trim();
  if (!endpoint || !p256dh || !auth) {
    return json(400, { error: "endpoint and keys.{p256dh,auth} are required." });
  }

  // Sanity-check the endpoint is an https URL on a known push service. We
  // don't enforce a domain whitelist (Mozilla, Google, Apple, Microsoft and
  // a few others all serve push) but we do reject anything that isn't https.
  let parsedEndpoint;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    return json(400, { error: "endpoint must be a valid URL." });
  }
  if (parsedEndpoint.protocol !== "https:") {
    return json(400, { error: "endpoint must use https." });
  }

  let parentId;
  try {
    parentId = await findParentIdByEmail(parentEmail);
  } catch (error) {
    console.error("[parent-push-subscribe] Parent lookup failed:", error);
    return json(500, { error: "We couldn't load your account. Please try again." });
  }
  if (!parentId) {
    // The parent has a verified session but no Parents/Guardians row yet —
    // that's only possible during the magic-link grace window before their
    // first child is registered. Fail soft so the SPA can show a "set up
    // your account first" hint.
    return json(409, { error: "No parent record on file yet. Please contact your coach." });
  }

  const deviceLabel = trimDeviceLabel(body.deviceLabel);
  const userAgent = trimUserAgent(body.userAgent);

  try {
    const existing = await findSubscriptionByEndpoint(endpoint);
    if (existing) {
      // Refresh keys + parent link + Active flag, but leave prefs as-is so a
      // user who turned off "pickup soon" doesn't have it re-enabled by a
      // fresh sign-in.
      const updated = await airtableUpdate(pushSubsTable(), existing.id, {
        Parent: [parentId],
        "P256DH Key": p256dh,
        "Auth Key": auth,
        "User Agent": userAgent || existing.fields?.["User Agent"] || "",
        "Device Label": deviceLabel,
        Active: true,
        "Last Used At": nowIso(),
        "Failure Count": 0,
      });
      return json(200, {
        ok: true,
        subscriptionId: updated.id,
        refreshed: true,
      });
    }

    const created = await airtableCreate(pushSubsTable(), {
      "Device Label": deviceLabel,
      Parent: [parentId],
      Endpoint: endpoint,
      "P256DH Key": p256dh,
      "Auth Key": auth,
      "User Agent": userAgent,
      Active: true,
      // Default all three prefs ON for new subscriptions, per the locked spec.
      "Pref One Hour Reminder": true,
      "Pref Check In Open": true,
      "Pref Pickup Soon": true,
      "Created At": nowIso(),
      "Last Used At": nowIso(),
      "Failure Count": 0,
    });

    return json(201, {
      ok: true,
      subscriptionId: created.id,
      refreshed: false,
    });
  } catch (error) {
    console.error("[parent-push-subscribe] Save failed:", error);
    return json(500, { error: "We couldn't save your notification settings. Please try again." });
  }
};
