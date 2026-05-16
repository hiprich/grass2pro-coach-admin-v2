// Thin wrapper around Resend's HTTP API for parent-portal magic links.
//
// Kept dependency-free by hitting the REST endpoint directly. If RESEND_API_KEY
// is unset (e.g. during early local dev or before the domain has finished
// verifying) the helper logs the would-be email instead of throwing, so the
// rest of the auth flow can be tested without a live mailer.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function sender() {
  return process.env.EMAIL_FROM || "Grass2Pro <noreply@grass2pro.com>";
}

function portalBaseUrl() {
  // Falls back to relative URLs if not set so a fresh deploy still works for
  // people on the same host. The env var lets us send links pointing at a
  // canonical hostname (e.g. coach.grass2pro.com in production) regardless
  // of which Netlify deploy URL the function is running on.
  return process.env.PARENT_PORTAL_BASE_URL || "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Whitelist of post-verify destinations the magic-link can deep-link to. We
// keep this strict to defend against open-redirect abuse \u2014 a malicious
// `next` param mustn't be able to bounce a freshly-signed-in parent off to
// an attacker-controlled domain. Only same-origin paths that we explicitly
// recognise are allowed; anything else falls back to /portal.
function sanitiseNext(next) {
  if (typeof next !== "string") return "";
  const trimmed = next.trim();
  if (!trimmed) return "";
  // Must be a relative path beginning with a single slash. Reject
  // protocol-relative (//evil.com) and absolute (https://evil.com) URLs.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "";
  // Only allow the surfaces we intend to deep-link into. /scan is the QR
  // landing page; /portal stays as the default for anything else.
  if (!/^\/(scan|portal)(\/|\?|$)/i.test(trimmed)) return "";
  return trimmed;
}

function buildMagicLinkUrl(email, rawToken, next) {
  const base = portalBaseUrl().replace(/\/+$/, "");
  const safeNext = sanitiseNext(next);
  // The magic link always lands on /portal first \u2014 that's where the SPA
  // bootstrap consumes the token, sets the session cookie, and then
  // (optionally) bounces to `next`. Embedding `next` as a query param keeps
  // the round-trip stateless: no session storage, no cookies, no extra
  // server hop required.
  const params = { email, token: rawToken };
  if (safeNext) params.next = safeNext;
  const query = new URLSearchParams(params).toString();
  if (!base) return `/portal?${query}`;
  return `${base}/portal?${query}`;
}

function magicLinkSubject() {
  return "Your Grass2Pro sign-in link";
}

function magicLinkText({ url, expiresInMinutes }) {
  return [
    "Hi,",
    "",
    "Use this link to sign in to your Grass2Pro parent portal:",
    url,
    "",
    `The link expires in ${expiresInMinutes} minutes and works in any browser — tap it, or copy and paste it.`,
    "",
    "If you didn't request this, you can safely ignore the email.",
    "",
    "— Grass2Pro",
  ].join("\n");
}

function magicLinkHtml({ url, expiresInMinutes }) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111827; background:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #e5e7eb;">
      <h1 style="font-size:20px; margin:0 0 16px;">Sign in to Grass2Pro</h1>
      <p style="margin:0 0 16px; line-height:1.5;">Tap the button below to sign in to your parent portal. The link works in any browser — Safari, Chrome, or wherever you prefer.</p>
      <p style="margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block; background:#0d6efd; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;">Sign in to Grass2Pro</a>
      </p>
      <p style="margin:16px 0; color:#6b7280; font-size:14px; line-height:1.5;">Or copy and paste this link into any browser:<br /><a href="${safeUrl}" style="color:#0d6efd; word-break:break-all;">${safeUrl}</a></p>
      <p style="margin:24px 0 0; color:#6b7280; font-size:13px;">The link expires in ${expiresInMinutes} minutes. If you didn't request this, you can safely ignore the email.</p>
    </div>
  </body>
</html>`;
}

// Send the magic-link email. Returns { ok: true } on success or { ok: false,
// reason } when something has gone wrong so the caller can decide how to
// surface the failure to the parent (we never echo the raw error back to
// the browser to avoid leaking infra detail).
export async function sendMagicLinkEmail({ to, rawToken, expiresInMinutes, next }) {
  const url = buildMagicLinkUrl(to, rawToken, next);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[parent-mailer] RESEND_API_KEY not set; skipping send. Magic link would have been:",
      url,
    );
    return { ok: false, reason: "mailer-not-configured" };
  }

  const payload = {
    from: sender(),
    to: [to],
    subject: magicLinkSubject(),
    text: magicLinkText({ url, expiresInMinutes }),
    html: magicLinkHtml({ url, expiresInMinutes }),
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
      console.error("[parent-mailer] Resend rejected send:", response.status, body);
      return { ok: false, reason: "send-rejected" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[parent-mailer] Resend request failed:", error);
    return { ok: false, reason: "send-failed" };
  }
}
