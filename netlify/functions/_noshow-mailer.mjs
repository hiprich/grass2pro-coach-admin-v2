// Sends the "didn't see you at training, everything okay?" email to a parent
// whose child RSVP'd "Coming" but never scanned in. Triggered from
// scheduled-push-fanout when the No Show Check-In window fires (end + 30 min).
//
// This is intentionally a check-in tone, not a chase tone — coaches usually
// don't ask, and the user's spec is: "hey, didn't see you at training, it's
// everything okay?". So the copy is warm, short, and gives the parent an
// easy out to reply or message the coach.
//
// Returns { ok: true } on success or { ok: false, reason } on failure so the
// fan-out caller can record the right Status on the audit row.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function sender() {
  return process.env.EMAIL_FROM || "Grass2Pro <noreply@grass2pro.com>";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function subjectLine(childFirstName) {
  const safe = childFirstName ? `${childFirstName}` : "your child";
  return `Didn't see ${safe} at training — everything okay?`;
}

function textBody({ childFirstName, coachName, sessionName, sessionDate }) {
  const child = childFirstName || "your child";
  const coachLine = coachName ? `${coachName}` : "Your coach";
  const sessionLine = sessionName
    ? `today's ${sessionName}`
    : sessionDate
      ? `training on ${sessionDate}`
      : "training";
  return [
    `Hi,`,
    "",
    `${coachLine} didn't see ${child} at ${sessionLine}.`,
    "",
    `No worries either way — just wanted to check in. Reply to this email or message your coach if there's anything we should know.`,
    "",
    `If ${child} did make it and was missed in the register, just let us know.`,
    "",
    "— Grass2Pro",
  ].join("\n");
}

function htmlBody({ childFirstName, coachName, sessionName, sessionDate }) {
  const child = escapeHtml(childFirstName || "your child");
  const coach = escapeHtml(coachName || "Your coach");
  const session = sessionName
    ? `today's ${escapeHtml(sessionName)}`
    : sessionDate
      ? `training on ${escapeHtml(sessionDate)}`
      : "training";
  return `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111827; background:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #e5e7eb;">
      <h1 style="font-size:20px; margin:0 0 16px;">Everything okay?</h1>
      <p style="margin:0 0 12px; line-height:1.55;">${coach} didn't see ${child} at ${session}.</p>
      <p style="margin:0 0 12px; line-height:1.55;">No worries either way — just wanted to check in. Reply to this email or message your coach if there's anything we should know.</p>
      <p style="margin:16px 0 0; color:#6b7280; font-size:14px; line-height:1.55;">If ${child} did make it and was missed in the register, just let us know.</p>
    </div>
    <p style="text-align:center; margin:16px 0 0; color:#9ca3af; font-size:12px;">— Grass2Pro</p>
  </body>
</html>`;
}

// Send the no-show check-in email. childFirstName / coachName / sessionName
// are all optional — copy degrades gracefully when any are missing so a
// half-populated Airtable row still produces a usable message.
export async function sendNoShowCheckInEmail({
  to,
  childFirstName,
  coachName,
  sessionName,
  sessionDate,
}) {
  if (!to) return { ok: false, reason: "missing-to" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[noshow-mailer] RESEND_API_KEY not set; skipping send for",
      to,
    );
    return { ok: false, reason: "mailer-not-configured" };
  }

  const payload = {
    from: sender(),
    to: [to],
    subject: subjectLine(childFirstName),
    text: textBody({ childFirstName, coachName, sessionName, sessionDate }),
    html: htmlBody({ childFirstName, coachName, sessionName, sessionDate }),
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
      console.error(
        "[noshow-mailer] Resend rejected send:",
        response.status,
        body,
      );
      return { ok: false, reason: "send-rejected", httpStatus: response.status };
    }
    return { ok: true };
  } catch (error) {
    console.error("[noshow-mailer] Resend request failed:", error);
    return { ok: false, reason: "send-failed" };
  }
}
