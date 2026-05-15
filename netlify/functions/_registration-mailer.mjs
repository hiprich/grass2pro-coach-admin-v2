// Parent confirmation after a coach landing registration (/c/:slug).

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function sender() {
  return process.env.EMAIL_FROM || "Grass2Pro <noreply@grass2pro.com>";
}

function siteBaseUrl() {
  return (process.env.PARENT_PORTAL_BASE_URL || process.env.SITE_URL || "").replace(/\/+$/, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function portalUrl() {
  const base = siteBaseUrl();
  return base ? `${base}/portal` : "/portal";
}

function subjectLine(coachName, childName) {
  return `Registration received — ${childName} with ${coachName}`;
}

function textBody({ parentName, coachName, childName, ageGroup }) {
  const first = parentName.split(/\s+/)[0] || "there";
  const coachFirst = coachName.split(/\s+/)[0] || coachName;
  return [
    `Hi ${first},`,
    "",
    `Thanks for registering ${childName} (${ageGroup}) with ${coachName} on Grass2Pro.`,
    "",
    `We've passed your details to ${coachFirst}. They'll be in touch within 24 hours to confirm next steps.`,
    "",
    `Parent portal: ${portalUrl()}`,
    "",
    "— Grass2Pro",
  ].join("\n");
}

function htmlBody({ parentName, coachName, childName, ageGroup }) {
  const first = escapeHtml(parentName.split(/\s+/)[0] || "there");
  const safeCoach = escapeHtml(coachName);
  const coachFirst = escapeHtml(coachName.split(/\s+/)[0] || coachName);
  const safeChild = escapeHtml(childName);
  const safeAge = escapeHtml(ageGroup);
  const link = escapeHtml(portalUrl());
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0b0d0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f5ee;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#11140e;border:2px solid #c9e970;border-radius:18px;padding:28px;">
        <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#c9e970;font-weight:800;margin-bottom:6px;">Registration received</div>
        <h1 style="font-size:22px;line-height:1.25;margin:0 0 16px;color:#ffffff;">Hi ${first}, we've got your enquiry.</h1>
        <p style="margin:0 0 16px;line-height:1.55;color:#d6d9cf;">Thanks for registering <strong style="color:#fff;">${safeChild}</strong> (${safeAge}) with <strong style="color:#fff;">${safeCoach}</strong>.</p>
        <p style="margin:0 0 20px;line-height:1.55;color:#d6d9cf;">We've passed your details to ${coachFirst}. They'll be in touch within 24 hours.</p>
        <a href="${link}" style="display:inline-block;background:#c9e970;color:#1a2110;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-size:13px;">Open parent portal</a>
        <p style="margin:18px 0 0;font-size:12px;color:#6b7066;">Didn't request this? You can ignore this email.</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendRegistrationConfirmationEmail({
  to,
  parentName,
  coachName,
  childName,
  ageGroup,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[registration-mailer] RESEND_API_KEY not set; skipping parent confirmation");
    return { ok: false, reason: "mailer-not-configured" };
  }

  const payload = {
    from: sender(),
    to: [to],
    subject: subjectLine(coachName, childName),
    text: textBody({ parentName, coachName, childName, ageGroup }),
    html: htmlBody({ parentName, coachName, childName, ageGroup }),
  };

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("[registration-mailer] Resend rejected:", response.status, body);
      return { ok: false, reason: "send-rejected" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[registration-mailer] Resend request failed:", error);
    return { ok: false, reason: "send-failed" };
  }
}
