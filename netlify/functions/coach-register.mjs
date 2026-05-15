// POST /api/coach-register
//
// Inbound registration enquiry from a public coach landing page (e.g. /c/hope).
// A parent fills out the form, taps "Register with Hope", and this function:
//   1. Validates the payload (required fields + length caps + email shape)
//   2. Writes a row to the "Coach Registrations" Airtable table, linking it
//      back to the Coaches table when we have a recordId for the slug
//   3. Sends Hope (or whichever coach owns the slug) an email via Resend with
//      the parent's details so he can reply directly without opening Airtable
//
// The email send is best-effort: even if Resend fails (or RESEND_API_KEY is
// unset locally), the Airtable row still lands so no enquiry is ever lost.
// We return 200 on the Airtable write so the parent always sees success and
// the failure is logged for the coach to chase up later.

import { airtableCreate } from "./_airtable.mjs";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const COACH_REGISTRATIONS_TABLE = "Coach Registrations";

// Coach metadata for routing the email + linking the Airtable record back to
// the matching Coach row. Mirrors src/coachProfiles.ts but kept local to the
// function so the .mjs bundle doesn't reach into the React app source. Keep
// these in sync when adding new coaches (every `slug` in coachProfiles.ts).
const HOPE_COACH = {
  name: "Hope Bouhe",
  airtableRecordId: "rect8JRrno85KaRNG",
  email: process.env.HOPE_EMAIL || process.env.G2P_LEADS_EMAIL || "leads@grass2pro.com",
};

const COBBY_COACH = {
  name: "Cobby Jones",
  airtableRecordId: "recmp3FJkW3A9yyvm",
  email: process.env.COBBY_EMAIL || process.env.G2P_LEADS_EMAIL || "leads@grass2pro.com",
};

const COACH_DIRECTORY = {
  hope: HOPE_COACH,
  "hope-bouhe": HOPE_COACH,
  cobby: COBBY_COACH,
  "cobby-jones": COBBY_COACH,
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const VALID_AGE_GROUPS = new Set(["U7", "U8", "U9", "U10", "U11", "U12"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCoachEmailHtml({ coachName, parentName, parentEmail, parentPhone, childName, ageGroup, message, source }) {
  // Brand-on: dark background, lime accent, system fonts. Mirrors the
  // "Register with Hope" CTA the parent just clicked so the coach's inbox
  // immediately recognises the source.
  const safe = {
    coach: escapeHtml(coachName),
    parentName: escapeHtml(parentName),
    parentEmail: escapeHtml(parentEmail),
    parentPhone: escapeHtml(parentPhone || "—"),
    childName: escapeHtml(childName),
    age: escapeHtml(ageGroup),
    message: escapeHtml(message || "—"),
    source: escapeHtml(source || "direct"),
  };
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background:#0b0d0a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#f3f5ee;">
    <div style="max-width:560px; margin:0 auto; padding:32px 20px;">
      <div style="background:#11140e; border:2px solid #c9e970; border-radius:18px; padding:28px;">
        <div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#c9e970; font-weight:800; margin-bottom:6px;">New registration · Grass2Pro</div>
        <h1 style="font-size:22px; line-height:1.25; margin:0 0 18px; color:#ffffff;">${safe.parentName} wants to register ${safe.childName} (${safe.age}) with ${safe.coach}.</h1>

        <table role="presentation" style="width:100%; border-collapse:collapse; margin:18px 0;">
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Parent</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; font-weight:600; text-align:right;">${safe.parentName}</td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Email</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; text-align:right;"><a href="mailto:${safe.parentEmail}" style="color:#c9e970; text-decoration:none;">${safe.parentEmail}</a></td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Phone</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; text-align:right;">${safe.parentPhone}</td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Child</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; font-weight:600; text-align:right;">${safe.childName}</td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Age group</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; text-align:right;">${safe.age}</td></tr>
          <tr><td style="padding:8px 0; color:#9aa39a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Source</td><td style="padding:8px 0; color:#f3f5ee; font-size:15px; text-align:right;">${safe.source}</td></tr>
        </table>

        <div style="background:#0b0d0a; border:1px solid #2a2f24; border-radius:12px; padding:16px; margin:12px 0 20px; color:#d6d9cf; font-size:14px; line-height:1.55; white-space:pre-wrap;">${safe.message}</div>

        <a href="mailto:${safe.parentEmail}" style="display:inline-block; background:#c9e970; color:#1a2110; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; font-size:13px;">Reply to ${safe.parentName}</a>
        <p style="margin:18px 0 0; font-size:12px; color:#6b7066;">This enquiry was also saved in Airtable → Coach Registrations. Mark it Contacted once you've replied.</p>
      </div>
    </div>
  </body>
</html>`;
}

function buildCoachEmailText({ coachName, parentName, parentEmail, parentPhone, childName, ageGroup, message, source }) {
  return [
    `New registration enquiry — Grass2Pro`,
    ``,
    `${parentName} wants to register ${childName} (${ageGroup}) with ${coachName}.`,
    ``,
    `Parent:    ${parentName}`,
    `Email:     ${parentEmail}`,
    `Phone:     ${parentPhone || "—"}`,
    `Child:     ${childName}`,
    `Age group: ${ageGroup}`,
    `Source:    ${source || "direct"}`,
    ``,
    `Message:`,
    message || "—",
    ``,
    `This enquiry has been logged in Airtable → Coach Registrations. Reply directly to the parent to get them onto the pitch.`,
  ].join("\n");
}

async function sendCoachEmail(coachName, coachEmail, payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[coach-register] RESEND_API_KEY not set; skipping coach notification email", payload);
    return { ok: false, reason: "mailer-not-configured" };
  }
  const sender = process.env.EMAIL_FROM || "Grass2Pro <noreply@grass2pro.com>";
  const subject = `New registration: ${payload.parentName} → ${payload.childName} (${payload.ageGroup})`;
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sender,
        to: [coachEmail],
        // BCC the leads inbox so we always have a backup copy regardless of
        // whether the coach has set up filtering — also gives us a paper trail
        // for spam debugging.
        bcc: process.env.G2P_LEADS_EMAIL ? [process.env.G2P_LEADS_EMAIL] : undefined,
        reply_to: payload.parentEmail,
        subject,
        text: buildCoachEmailText({ coachName, ...payload }),
        html: buildCoachEmailHtml({ coachName, ...payload }),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("[coach-register] Resend rejected:", response.status, body);
      return { ok: false, reason: "send-rejected" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[coach-register] Resend request failed:", error);
    return { ok: false, reason: "send-failed" };
  }
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  // Honeypot — bots love to fill every field. We expose a hidden
  // "company" field on the form that real users never see; if it has any
  // value we silently 200 so the bot thinks it succeeded.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    console.warn("[coach-register] honeypot tripped, dropping submission", { coachSlug: body.coachSlug });
    return json(200, { ok: true, dropped: true });
  }

  const coachSlug = clean(body.coachSlug, 40).toLowerCase();
  const coach = COACH_DIRECTORY[coachSlug];
  if (!coach) {
    return json(404, { error: "Unknown coach" });
  }

  const parentName = clean(body.parentName, 120);
  const parentEmail = clean(body.parentEmail, 200).toLowerCase();
  const parentPhone = clean(body.parentPhone, 40);
  const childName = clean(body.childName, 120);
  const ageGroup = clean(body.ageGroup, 8);
  const message = clean(body.message, 1500);
  const source = clean(body.source, 60) || "direct";

  if (!parentName) return json(400, { error: "Parent name is required." });
  if (!parentEmail || !EMAIL_REGEX.test(parentEmail)) return json(400, { error: "A valid email is required." });
  if (!childName) return json(400, { error: "Child's name is required." });
  if (!ageGroup || !VALID_AGE_GROUPS.has(ageGroup)) return json(400, { error: "Pick an age group between U7 and U12." });

  // Write to Airtable. We ALWAYS attempt this first — even if mailing fails
  // later, we want the lead persisted. The link to the Coaches table uses
  // multipleRecordLinks so it shows up in Hope's row's reverse link.
  const fields = {
    "Parent Name": parentName,
    "Parent Email": parentEmail,
    "Parent Phone": parentPhone,
    "Child Name": childName,
    "Child Age Group": ageGroup,
    "Coach Slug": coachSlug,
    "Message": message,
    "Submitted At": new Date().toISOString(),
    "Status": "New",
    "Source": source,
  };
  if (coach.airtableRecordId) {
    fields["Coach"] = [coach.airtableRecordId];
  }

  let airtableResult;
  try {
    airtableResult = await airtableCreate(COACH_REGISTRATIONS_TABLE, fields);
  } catch (error) {
    console.error("[coach-register] Airtable write failed:", error);
    return json(500, { error: "We couldn't save your enquiry. Please try again or message the coach on WhatsApp." });
  }

  // Best-effort coach notification. We don't gate the user-visible success
  // on the email landing — coaches can recover from Airtable.
  const emailResult = await sendCoachEmail(coach.name, coach.email, {
    parentName, parentEmail, parentPhone, childName, ageGroup, message, source,
  });

  // If the email landed, flip the "Coach Notified" checkbox so we know which
  // rows still need a manual nudge if Resend has a bad day.
  if (emailResult.ok && airtableResult?.id) {
    try {
      // We use airtableCreate above for the initial write; updating the
      // checkbox uses the same generic helper. Inline import avoids loading
      // it on the validation early-out paths.
      const { airtableUpdate } = await import("./_airtable.mjs");
      await airtableUpdate(COACH_REGISTRATIONS_TABLE, airtableResult.id, { "Coach Notified": true });
    } catch (error) {
      console.warn("[coach-register] could not flip Coach Notified:", error?.message || error);
    }
  }

  return json(200, {
    ok: true,
    coach: coach.name,
    notified: emailResult.ok,
  });
}
