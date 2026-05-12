// Resend email for coach magic-link sign-in (same transport as parents).

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function sender() {
  return process.env.EMAIL_FROM || "Grass2Pro <noreply@grass2pro.com>";
}

function siteBaseUrl() {
  return (process.env.COACH_MAGIC_LINK_BASE_URL || process.env.PARENT_PORTAL_BASE_URL || "")
    .replace(/\/+$/, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCoachMagicLinkUrl(email, rawToken) {
  const base = siteBaseUrl();
  const query = new URLSearchParams({ email, token: rawToken }).toString();
  if (!base) return `/coach?${query}`;
  return `${base}/coach?${query}`;
}

function subjectCoachMagicLink() {
  return "Your Grass2Pro coach sign-in link";
}

function textCoachMagicLink({ url, expiresInMinutes }) {
  return [
    "Hi,",
    "",
    "Use this link to sign in to your Grass2Pro coach dashboard:",
    url,
    "",
    `The link expires in ${expiresInMinutes} minutes and can only be used once.`,
    "",
    "If you didn't request this, you can safely ignore the email.",
    "",
    "— Grass2Pro",
  ].join("\n");
}

function htmlCoachMagicLink({ url, expiresInMinutes }) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111827; background:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #e5e7eb;">
      <h1 style="font-size:20px; margin:0 0 16px;">Sign in to coach dashboard</h1>
      <p style="margin:0 0 16px; line-height:1.5;">Tap the button below to open your coach workspace.</p>
      <p style="margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block; background:#0d6efd; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;">Sign in</a>
      </p>
      <p style="margin:16px 0; color:#6b7280; font-size:14px; line-height:1.5;">Or paste this link into your browser:<br /><a href="${safeUrl}" style="color:#0d6efd; word-break:break-all;">${safeUrl}</a></p>
      <p style="margin:24px 0 0; color:#6b7280; font-size:13px;">The link expires in ${expiresInMinutes} minutes and can only be used once. If you didn't request this, you can safely ignore the email.</p>
    </div>
  </body>
</html>`;
}

export async function sendCoachMagicLinkEmail({ to, rawToken, expiresInMinutes }) {
  const url = buildCoachMagicLinkUrl(to, rawToken);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[coach-mailer] RESEND_API_KEY not set; skipping send. Coach magic link would have been:", url);
    return { ok: false, reason: "mailer-not-configured" };
  }

  const payload = {
    from: sender(),
    to: [to],
    subject: subjectCoachMagicLink(),
    text: textCoachMagicLink({ url, expiresInMinutes }),
    html: htmlCoachMagicLink({ url, expiresInMinutes }),
  };

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("[coach-mailer] Resend rejected send:", response.status, body);
      return { ok: false, reason: "send-rejected" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[coach-mailer] Resend request failed:", error);
    return { ok: false, reason: "send-failed" };
  }
}
