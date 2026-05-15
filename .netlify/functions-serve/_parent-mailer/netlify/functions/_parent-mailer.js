var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/_parent-mailer.mjs
var parent_mailer_exports = {};
__export(parent_mailer_exports, {
  sendMagicLinkEmail: () => sendMagicLinkEmail
});
module.exports = __toCommonJS(parent_mailer_exports);
var RESEND_ENDPOINT = "https://api.resend.com/emails";
function sender() {
  return process.env.EMAIL_FROM || "Grass2Pro <noreply@grass2pro.com>";
}
function portalBaseUrl() {
  return process.env.PARENT_PORTAL_BASE_URL || "";
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function sanitiseNext(next) {
  if (typeof next !== "string") return "";
  const trimmed = next.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "";
  if (!/^\/(scan|portal)(\/|\?|$)/i.test(trimmed)) return "";
  return trimmed;
}
function buildMagicLinkUrl(email, rawToken, next) {
  const base = portalBaseUrl().replace(/\/+$/, "");
  const safeNext = sanitiseNext(next);
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
    `The link expires in ${expiresInMinutes} minutes and can only be used once.`,
    "",
    "If you didn't request this, you can safely ignore the email.",
    "",
    "\u2014 Grass2Pro"
  ].join("\n");
}
function magicLinkHtml({ url, expiresInMinutes }) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111827; background:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #e5e7eb;">
      <h1 style="font-size:20px; margin:0 0 16px;">Sign in to Grass2Pro</h1>
      <p style="margin:0 0 16px; line-height:1.5;">Tap the button below to sign in to your parent portal.</p>
      <p style="margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block; background:#0d6efd; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;">Sign in to Grass2Pro</a>
      </p>
      <p style="margin:16px 0; color:#6b7280; font-size:14px; line-height:1.5;">Or paste this link into your browser:<br /><a href="${safeUrl}" style="color:#0d6efd; word-break:break-all;">${safeUrl}</a></p>
      <p style="margin:24px 0 0; color:#6b7280; font-size:13px;">The link expires in ${expiresInMinutes} minutes and can only be used once. If you didn't request this, you can safely ignore the email.</p>
    </div>
  </body>
</html>`;
}
async function sendMagicLinkEmail({ to, rawToken, expiresInMinutes, next }) {
  const url = buildMagicLinkUrl(to, rawToken, next);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[parent-mailer] RESEND_API_KEY not set; skipping send. Magic link would have been:",
      url
    );
    return { ok: false, reason: "mailer-not-configured" };
  }
  const payload = {
    from: sender(),
    to: [to],
    subject: magicLinkSubject(),
    text: magicLinkText({ url, expiresInMinutes }),
    html: magicLinkHtml({ url, expiresInMinutes })
  };
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sendMagicLinkEmail
});
//# sourceMappingURL=_parent-mailer.js.map
