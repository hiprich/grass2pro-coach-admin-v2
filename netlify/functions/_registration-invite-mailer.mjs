// Parent invite to the parent portal after a coach accepts a landing enquiry.

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

/** Magic-link sign-in entry point for invited parents. */
export function buildParentPortalInviteUrl({ parentEmail, coachSlug }) {
  const base = siteBaseUrl();
  const params = new URLSearchParams();
  if (parentEmail) params.set("parentEmail", parentEmail);
  if (coachSlug) params.set("coach", coachSlug);
  const query = params.toString();
  const path = query ? `/portal?${query}` : "/portal";
  return base ? `${base}${path}` : path;
}

function inviteSubject(coachName, childName) {
  return `${coachName} invited you to the Grass2Pro parent portal for ${childName}`;
}

function inviteText({ parentName, coachName, childName, portalUrl }) {
  const first = parentName.split(/\s+/)[0] || "there";
  const coachFirst = coachName.split(/\s+/)[0] || coachName;
  return [
    `Hi ${first},`,
    "",
    `${coachFirst} has accepted your enquiry and invited you to the Grass2Pro parent portal for ${childName}.`,
    "",
    `Open the link below, enter the same email address this was sent to, and we'll email you a one-time sign-in link.`,
    "",
    portalUrl,
    "",
    `From the portal you can complete safeguarding consent, manage RSVPs, and stay in touch about sessions.`,
    "",
    "— Grass2Pro",
  ].join("\n");
}

function inviteHtml({ parentName, coachName, childName, portalUrl }) {
  const first = escapeHtml(parentName.split(/\s+/)[0] || "there");
  const coachFirst = escapeHtml(coachName.split(/\s+/)[0] || coachName);
  const safeChild = escapeHtml(childName);
  const safeUrl = escapeHtml(portalUrl);
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0b0d0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f3f5ee;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#11140e;border:2px solid #c9e970;border-radius:18px;padding:28px;">
        <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#c9e970;font-weight:800;margin-bottom:6px;">Parent portal</div>
        <h1 style="font-size:22px;line-height:1.25;margin:0 0 16px;color:#fff;">Hi ${first}, ${coachFirst} invited you for ${safeChild}.</h1>
        <p style="margin:0 0 16px;line-height:1.55;color:#d6d9cf;">Your coach has accepted your enquiry. Open the parent portal with the email address this was sent to — we'll send you a quick sign-in link.</p>
        <a href="${safeUrl}" style="display:inline-block;background:#c9e970;color:#1a2110;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-size:13px;">Open parent portal</a>
        <p style="margin:18px 0 0;font-size:12px;color:#6b7066;">Or paste this link: <a href="${safeUrl}" style="color:#c9e970;word-break:break-all;">${safeUrl}</a></p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendRegistrationInviteEmail({
  to,
  parentName,
  coachName,
  childName,
  coachSlug,
}) {
  const portalUrl = buildParentPortalInviteUrl({ parentEmail: to, coachSlug });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[registration-invite-mailer] RESEND_API_KEY not set; invite URL:", portalUrl);
    return { ok: false, reason: "mailer-not-configured", portalUrl };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sender(),
        to: [to],
        reply_to: process.env.G2P_LEADS_EMAIL || undefined,
        subject: inviteSubject(coachName, childName),
        text: inviteText({ parentName, coachName, childName, portalUrl }),
        html: inviteHtml({ parentName, coachName, childName, portalUrl }),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("[registration-invite-mailer] Resend rejected:", response.status, body);
      return { ok: false, reason: "send-rejected", portalUrl };
    }
    return { ok: true, portalUrl };
  } catch (error) {
    console.error("[registration-invite-mailer] Resend failed:", error);
    return { ok: false, reason: "send-failed", portalUrl };
  }
}
