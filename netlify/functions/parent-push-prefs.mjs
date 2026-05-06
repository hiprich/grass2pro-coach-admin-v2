// Update notification preferences for one of the signed-in parent's
// push subscriptions.
//
// PATCH /.netlify/functions/parent-push-prefs
//   Body: {
//     subscriptionId: string,         // Airtable record id
//     prefs?: { oneHourReminder?, checkInOpen?, pickupSoon? },
//     active?: boolean,               // master mute for this device
//     deviceLabel?: string,           // rename device
//   }
//   Auth: parent session cookie
//
// Ownership check: the row's linked Parent's Email must equal the session
// email. This protects against a parent guessing another household's
// subscription id.
import {
  TABLE_IDS,
  airtableGet,
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

async function ownsSubscription(subscriptionRecord, sessionEmail) {
  const linked = subscriptionRecord?.fields?.Parent;
  if (!Array.isArray(linked) || linked.length === 0) return false;
  const parentId = linked[0];
  try {
    const parent = await airtableGet(parentsTable(), parentId);
    const candidate = normaliseEmail(parent?.fields?.Email);
    return Boolean(candidate) && candidate === sessionEmail;
  } catch {
    return false;
  }
}

function trimDeviceLabel(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  return text.length > 100 ? text.slice(0, 100) : text;
}

export const handler = async (event) => {
  const method = (event.httpMethod || "PATCH").toUpperCase();
  if (method !== "PATCH") {
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

  const subscriptionId = String(body.subscriptionId || "").trim();
  if (!subscriptionId) {
    return json(400, { error: "subscriptionId is required." });
  }

  // Build the field patch from only the keys the caller actually supplied,
  // so a partial PATCH (just toggling oneHourReminder, say) doesn't wipe
  // the others.
  const fieldPatch = {};
  if (body.prefs && typeof body.prefs === "object") {
    if (typeof body.prefs.oneHourReminder === "boolean") {
      fieldPatch["Pref One Hour Reminder"] = body.prefs.oneHourReminder;
    }
    if (typeof body.prefs.checkInOpen === "boolean") {
      fieldPatch["Pref Check In Open"] = body.prefs.checkInOpen;
    }
    if (typeof body.prefs.pickupSoon === "boolean") {
      fieldPatch["Pref Pickup Soon"] = body.prefs.pickupSoon;
    }
  }
  if (typeof body.active === "boolean") {
    fieldPatch.Active = body.active;
  }
  const newLabel = trimDeviceLabel(body.deviceLabel);
  if (newLabel) {
    fieldPatch["Device Label"] = newLabel;
  }

  if (Object.keys(fieldPatch).length === 0) {
    return json(400, { error: "No supported fields supplied." });
  }

  try {
    let existing;
    try {
      existing = await airtableGet(pushSubsTable(), subscriptionId);
    } catch (error) {
      console.error("[parent-push-prefs] Lookup failed:", error);
      return json(404, { error: "Subscription not found." });
    }

    const owned = await ownsSubscription(existing, parentEmail);
    if (!owned) {
      // 404 not 403 so we don't leak which ids exist for other parents.
      return json(404, { error: "Subscription not found." });
    }

    const updated = await airtableUpdate(pushSubsTable(), subscriptionId, fieldPatch);
    const fields = updated.fields || {};
    return json(200, {
      ok: true,
      subscription: {
        id: updated.id,
        deviceLabel: String(fields["Device Label"] || ""),
        active: Boolean(fields.Active),
        prefs: {
          oneHourReminder: Boolean(fields["Pref One Hour Reminder"]),
          checkInOpen: Boolean(fields["Pref Check In Open"]),
          pickupSoon: Boolean(fields["Pref Pickup Soon"]),
        },
      },
    });
  } catch (error) {
    console.error("[parent-push-prefs] Update failed:", error);
    return json(500, { error: "We couldn't update your notification settings. Please try again." });
  }
};
