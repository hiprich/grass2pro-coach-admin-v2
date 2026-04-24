import { airtableCreate, json, tableName } from "./_airtable.mjs";

const required = ["childName", "parentName", "parentEmail"];

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const missing = required.filter((key) => !payload[key]);
  if (missing.length > 0 || !payload.parentalResponsibility || !payload.withdrawalProcessAcknowledged) {
    return json(400, {
      error: "Missing required consent fields.",
      missing,
    });
  }

  const permissions = payload.permissions || {};
  const selectedPermissions = Object.entries(permissions)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

  const consentState = selectedPermissions.length > 0 ? "Active" : "No media consent";

  const fields = {
    "Child Full Name": payload.childName,
    "Age Group": payload.ageGroup || "",
    "Parent/Guardian Name": payload.parentName,
    "Parent/Guardian Email": payload.parentEmail,
    "Parent/Guardian Phone": payload.parentPhone || "",
    Relationship: payload.relationship || "",
    "Photo Permission": Boolean(permissions.photoTraining),
    "Video Permission": Boolean(permissions.videoTraining),
    "Internal Report Permission": Boolean(permissions.internalReports),
    "Website Permission": Boolean(permissions.website),
    "Social Media Permission": Boolean(permissions.social),
    "Press Permission": Boolean(permissions.press),
    "Selected Permissions": selectedPermissions.join(", "),
    "Usage Details": payload.usageDetails || "",
    "Storage Duration": payload.storageDuration || "",
    "Withdrawal Process Acknowledged": Boolean(payload.withdrawalProcessAcknowledged),
    "Child Consulted": Boolean(payload.childConsulted),
    "Parental Responsibility Confirmed": Boolean(payload.parentalResponsibility),
    "Consent State": consentState,
    "Withdrawal State": "Not withdrawn",
    Notes: payload.notes || "",
    "Submitted At": new Date().toISOString(),
  };

  try {
    const record = await airtableCreate(tableName("AIRTABLE_MEDIA_CONSENTS_TABLE", "Media Consents"), fields);
    return json(200, {
      ok: true,
      id: record.id,
      demo: Boolean(record.demo),
      consentState,
      selectedPermissions,
    });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Unable to save consent record." });
  }
};
