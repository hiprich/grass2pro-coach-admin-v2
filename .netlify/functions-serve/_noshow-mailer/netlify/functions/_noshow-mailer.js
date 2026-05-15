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

// netlify/functions/_noshow-mailer.mjs
var noshow_mailer_exports = {};
__export(noshow_mailer_exports, {
  sendNoShowCheckInEmail: () => sendNoShowCheckInEmail
});
module.exports = __toCommonJS(noshow_mailer_exports);
var RESEND_ENDPOINT = "https://api.resend.com/emails";
function sender() {
  return process.env.EMAIL_FROM || "Grass2Pro <noreply@grass2pro.com>";
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function subjectLine(childFirstName) {
  const safe = childFirstName ? `${childFirstName}` : "your child";
  return `Didn't see ${safe} at training \u2014 everything okay?`;
}
function textBody({ childFirstName, coachName, sessionName, sessionDate }) {
  const child = childFirstName || "your child";
  const coachLine = coachName ? `${coachName}` : "Your coach";
  const sessionLine = sessionName ? `today's ${sessionName}` : sessionDate ? `training on ${sessionDate}` : "training";
  return [
    `Hi,`,
    "",
    `${coachLine} didn't see ${child} at ${sessionLine}.`,
    "",
    `No worries either way \u2014 just wanted to check in. Reply to this email or message your coach if there's anything we should know.`,
    "",
    `If ${child} did make it and was missed in the register, just let us know.`,
    "",
    "\u2014 Grass2Pro"
  ].join("\n");
}
function htmlBody({ childFirstName, coachName, sessionName, sessionDate }) {
  const child = escapeHtml(childFirstName || "your child");
  const coach = escapeHtml(coachName || "Your coach");
  const session = sessionName ? `today's ${escapeHtml(sessionName)}` : sessionDate ? `training on ${escapeHtml(sessionDate)}` : "training";
  return `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111827; background:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #e5e7eb;">
      <h1 style="font-size:20px; margin:0 0 16px;">Everything okay?</h1>
      <p style="margin:0 0 12px; line-height:1.55;">${coach} didn't see ${child} at ${session}.</p>
      <p style="margin:0 0 12px; line-height:1.55;">No worries either way \u2014 just wanted to check in. Reply to this email or message your coach if there's anything we should know.</p>
      <p style="margin:16px 0 0; color:#6b7280; font-size:14px; line-height:1.55;">If ${child} did make it and was missed in the register, just let us know.</p>
    </div>
    <p style="text-align:center; margin:16px 0 0; color:#9ca3af; font-size:12px;">\u2014 Grass2Pro</p>
  </body>
</html>`;
}
async function sendNoShowCheckInEmail({
  to,
  childFirstName,
  coachName,
  sessionName,
  sessionDate
}) {
  if (!to) return { ok: false, reason: "missing-to" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[noshow-mailer] RESEND_API_KEY not set; skipping send for",
      to
    );
    return { ok: false, reason: "mailer-not-configured" };
  }
  const payload = {
    from: sender(),
    to: [to],
    subject: subjectLine(childFirstName),
    text: textBody({ childFirstName, coachName, sessionName, sessionDate }),
    html: htmlBody({ childFirstName, coachName, sessionName, sessionDate })
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
      console.error(
        "[noshow-mailer] Resend rejected send:",
        response.status,
        body
      );
      return { ok: false, reason: "send-rejected", httpStatus: response.status };
    }
    return { ok: true };
  } catch (error) {
    console.error("[noshow-mailer] Resend request failed:", error);
    return { ok: false, reason: "send-failed" };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sendNoShowCheckInEmail
});
//# sourceMappingURL=_noshow-mailer.js.map
