// Signed-in coach account settings (Airtable Coaches row).
//
//   GET  /api/coach-profile
//   PATCH /api/coach-profile { name?, email?, phone?, location?, bio?, role?, credential?, publicSlug? }
//   POST /api/coach-profile { action: "upload-avatar", imageBase64, contentType? }

import {
  airtableGet,
  airtableUpdate,
  coachLocationFromFields,
  coachSlugFromFields,
  findCoachRecordByNormalisedEmail,
  findCoachRecordByPublicSlug,
  hasAirtableConfig,
  json,
  normaliseCoach,
  TABLE_IDS,
  tableName,
} from "./_airtable.mjs";
import { gateCoachDashboard, wrapCoachResponse } from "./_coach-gate.mjs";
import { isValidEmail, normaliseEmail } from "./_parent-session.mjs";

const COACHES_TABLE = () =>
  tableName("AIRTABLE_COACHES_TABLE", "Coaches", TABLE_IDS.COACHES);

const BIO_FIELD_CANDIDATES = ["Bio", "Profile Bio", "About", "Description"];
const AVATAR_FIELD_CANDIDATES = ["Avatar Image", "Avatar", "Photo"];
const SLUG_FIELD_CANDIDATES = ["Public Slug", "URL Slug", "Page Slug", "Slug"];
const LOCATION_FIELD_CANDIDATES = [
  "Location",
  "Venue",
  "Area",
  "City",
  "Training location",
  "Address",
];
const NAME_FIELD_CANDIDATES = ["Full Name", "Name", "Coach Name"];

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function pickExistingField(fields, candidates, fallback) {
  for (const name of candidates) {
    if (fields[name] !== undefined) return name;
  }
  return fallback;
}

function profileFromRecord(record, sessionEmail) {
  const fields = record?.fields || {};
  const coach = normaliseCoach(record);
  const publicSlug = coachSlugFromFields(fields);
  return {
    id: coach.id,
    name: coach.name,
    email: coach.email || sessionEmail || "",
    signInEmail: sessionEmail || coach.email || "",
    phone: coach.phone || "",
    location: coachLocationFromFields(fields),
    bio: coach.bio,
    role: coach.role,
    credential: coach.credential,
    avatarUrl: coach.avatarUrl || "",
    publicSlug,
    publicPagePath: publicSlug ? `/c/${publicSlug}` : null,
    emailChangePending: false,
  };
}

async function uploadAvatarToAirtable(recordId, fieldName, buffer, contentType, filename) {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const token = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
  if (!baseId || !token) {
    throw new Error("Airtable is not configured.");
  }
  const encodedField = encodeURIComponent(fieldName);
  const url = `https://content.airtable.com/v0/${baseId}/${recordId}/${encodedField}/uploadAttachment`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contentType,
      filename,
      file: Buffer.from(buffer).toString("base64"),
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Avatar upload failed: ${body}`);
  }
  return response.json();
}

function parseImagePayload(body) {
  const raw = String(body.imageBase64 || body.image || "").trim();
  if (!raw) return null;
  const dataUrlMatch = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(raw);
  if (dataUrlMatch) {
    return {
      contentType: dataUrlMatch[1].toLowerCase(),
      base64: dataUrlMatch[2],
    };
  }
  const contentType = String(body.contentType || "image/jpeg").toLowerCase();
  return { contentType, base64: raw };
}

async function emailOwnedByOtherCoach(email, coachRecordId) {
  const existing = await findCoachRecordByNormalisedEmail(email);
  return Boolean(existing?.id && existing.id !== coachRecordId);
}

export const handler = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();
  const gate = gateCoachDashboard(event, json);
  if (!gate.ok) return gate.response;

  if (!hasAirtableConfig() || !gate.sessionEmail) {
    if (method === "GET") {
      return wrapCoachResponse(
        gate,
        json(200, {
          ok: true,
          demo: true,
          profile: {
            name: "Demo coach",
            email: gate.sessionEmail || "coach@grass2pro.com",
            signInEmail: gate.sessionEmail || "",
            phone: "",
            location: "",
            bio: "",
            role: "Coach",
            credential: "",
            avatarUrl: "",
            publicSlug: "",
            publicPagePath: null,
          },
        }),
      );
    }
    return wrapCoachResponse(
      gate,
      json(200, { ok: true, demo: true, message: "Account changes are not persisted in demo mode." }),
    );
  }

  const sessionEmail = normaliseEmail(gate.sessionEmail);
  const coachRecord = await findCoachRecordByNormalisedEmail(sessionEmail);
  if (!coachRecord?.id) {
    return wrapCoachResponse(gate, json(404, { error: "Coach profile not found for this account." }));
  }

  const fields = coachRecord.fields || {};

  if (method === "GET") {
    return wrapCoachResponse(
      gate,
      json(200, { ok: true, profile: profileFromRecord(coachRecord, sessionEmail) }),
    );
  }

  if (method === "PATCH") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return wrapCoachResponse(gate, json(400, { error: "Invalid JSON." }));
    }

    const patch = {};
    let emailChanged = false;

    if (typeof body.name === "string") {
      const name = body.name.trim().slice(0, 120);
      if (!name) {
        return wrapCoachResponse(gate, json(400, { error: "Name is required." }));
      }
      patch[pickExistingField(fields, NAME_FIELD_CANDIDATES, "Full Name")] = name;
    }

    if (typeof body.email === "string") {
      const email = normaliseEmail(body.email);
      if (!isValidEmail(email)) {
        return wrapCoachResponse(gate, json(400, { error: "Enter a valid email address." }));
      }
      if (await emailOwnedByOtherCoach(email, coachRecord.id)) {
        return wrapCoachResponse(
          gate,
          json(409, { error: "That email is already used by another coach profile." }),
        );
      }
      if (email !== sessionEmail) {
        emailChanged = true;
      }
      patch.Email = email;
    }

    if (typeof body.phone === "string") {
      patch.Phone = body.phone.trim().slice(0, 40);
    }

    if (typeof body.location === "string") {
      const location = body.location.trim().slice(0, 300);
      patch[pickExistingField(fields, LOCATION_FIELD_CANDIDATES, "Location")] = location;
    }

    if (typeof body.bio === "string") {
      patch[pickExistingField(fields, BIO_FIELD_CANDIDATES, "Bio")] = body.bio.trim().slice(0, 4000);
    }

    if (typeof body.role === "string") {
      const role = body.role.trim().slice(0, 200);
      if (role) patch.Role = role;
    }

    if (typeof body.credential === "string") {
      const credential = body.credential.trim().slice(0, 300);
      const key = pickExistingField(
        fields,
        ["Qualification", "Credential", "Qualifications"],
        "Qualification",
      );
      if (credential) patch[key] = credential;
    }

    if (typeof body.publicSlug === "string") {
      const slug = body.publicSlug.trim().toLowerCase();
      if (slug && !SLUG_PATTERN.test(slug)) {
        return wrapCoachResponse(
          gate,
          json(400, { error: "Public page slug must be lowercase letters, numbers, and hyphens only." }),
        );
      }
      if (slug) {
        const taken = await findCoachRecordByPublicSlug(slug);
        if (taken?.id && taken.id !== coachRecord.id) {
          return wrapCoachResponse(gate, json(409, { error: "That public page slug is already in use." }));
        }
      }
      patch[pickExistingField(fields, SLUG_FIELD_CANDIDATES, "Public Slug")] = slug || "";
    }

    if (Object.keys(patch).length === 0) {
      return wrapCoachResponse(gate, json(400, { error: "Nothing to update." }));
    }

    try {
      const updated = await airtableUpdate(COACHES_TABLE(), coachRecord.id, patch);
      const profile = profileFromRecord(updated, sessionEmail);
      return wrapCoachResponse(
        gate,
        json(200, {
          ok: true,
          profile: {
            ...profile,
            emailChangePending: emailChanged,
          },
          emailChanged,
          message: emailChanged
            ? "Email updated in Airtable. Sign out and request a new magic link at the new address before your next visit."
            : "Account saved.",
        }),
      );
    } catch (error) {
      console.error("[coach-profile] PATCH", error);
      return wrapCoachResponse(gate, json(500, { error: "Could not save account settings." }));
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
    if (action !== "upload-avatar") {
      return wrapCoachResponse(gate, json(400, { error: "Unknown action." }));
    }

    const parsed = parseImagePayload(body);
    if (!parsed?.base64) {
      return wrapCoachResponse(gate, json(400, { error: "imageBase64 is required." }));
    }

    let contentType = parsed.contentType;
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      contentType = "image/jpeg";
    }

    let buffer;
    try {
      buffer = Buffer.from(parsed.base64, "base64");
    } catch {
      return wrapCoachResponse(gate, json(400, { error: "Invalid image data." }));
    }

    if (buffer.length < 1024) {
      return wrapCoachResponse(gate, json(400, { error: "Image is too small." }));
    }
    if (buffer.length > MAX_AVATAR_BYTES) {
      return wrapCoachResponse(gate, json(400, { error: "Image must be under 2 MB." }));
    }

    const avatarField = pickExistingField(fields, AVATAR_FIELD_CANDIDATES, "Avatar Image");
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

    try {
      await uploadAvatarToAirtable(
        coachRecord.id,
        avatarField,
        buffer,
        contentType,
        `avatar.${ext}`,
      );
      const refreshed = await airtableGet(COACHES_TABLE(), coachRecord.id);
      return wrapCoachResponse(
        gate,
        json(200, {
          ok: true,
          profile: profileFromRecord(refreshed, sessionEmail),
          message: "Photo uploaded. Your public page uses this avatar when the slug matches your Coaches row.",
        }),
      );
    } catch (error) {
      console.error("[coach-profile] upload-avatar", error);
      return wrapCoachResponse(
        gate,
        json(502, {
          error: "Could not upload photo. Ensure the Coaches table has an Avatar Image attachment field.",
          detail: error instanceof Error ? error.message : undefined,
        }),
      );
    }
  }

  return wrapCoachResponse(gate, json(405, { error: "Method not allowed." }));
};
