// Coach dashboard magic-link authentication.
//
//   POST /.netlify/functions/coach-auth { action: "request-link", email }
//   POST /.netlify/functions/coach-auth { action: "verify-token", email, token }
//   POST /.netlify/functions/coach-auth { action: "sign-out" }
//
// Only emails that appear on an Airtable Coaches row (trimmed Email field)
// receive a minted token; unknown addresses get the same silent 200 as the
// parent portal to avoid scraping which addresses are coaches.

import {
  findCoachRecordByNormalisedEmail,
  hasAirtableConfig,
  json,
} from "./_airtable.mjs";
import {
  MAGIC_LINK_TTL_MINUTES,
  mintMagicLinkToken,
  consumeMagicLinkToken,
  normaliseEmail,
  isValidEmail,
  storeMagicLinkToken,
} from "./_parent-session.mjs";
import {
  buildCoachSessionCookie,
  clearCoachSessionCookie,
  createCoachSessionCookieValue,
} from "./_coach-session.mjs";
import { sendCoachMagicLinkEmail } from "./_coach-mailer.mjs";

function jsonWithCookie(statusCode, body, cookie) {
  const base = json(statusCode, body);
  return {
    ...base,
    headers: {
      ...(base.headers || {}),
      "Set-Cookie": cookie,
    },
  };
}

async function handleRequestLink(body) {
  const email = normaliseEmail(body.email);
  if (!isValidEmail(email)) {
    return json(400, { error: "Enter a valid email address." });
  }
  if (!hasAirtableConfig()) {
    return json(200, { ok: true, demo: true });
  }

  const coachRecord = await findCoachRecordByNormalisedEmail(email);
  if (!coachRecord) {
    return json(200, { ok: true });
  }

  const { raw, hash } = mintMagicLinkToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000).toISOString();

  try {
    await storeMagicLinkToken({
      email,
      hash,
      expiresAtIso: expiresAt,
      audience: "coach",
    });
  } catch (error) {
    console.error("[coach-auth] Failed to store magic-link token:", error);
    return json(200, { ok: true });
  }

  const result = await sendCoachMagicLinkEmail({
    to: email,
    rawToken: raw,
    expiresInMinutes: MAGIC_LINK_TTL_MINUTES,
  });
  return json(200, { ok: true, sent: result.ok, reason: result.ok ? undefined : result.reason });
}

async function handleVerifyToken(body) {
  const email = normaliseEmail(body.email);
  const tokenRaw = String(body.token || "").trim();
  if (!isValidEmail(email) || !tokenRaw) {
    return json(400, { error: "Sign-in link is missing or invalid." });
  }
  if (!hasAirtableConfig()) {
    return json(503, { error: "Sign-in is not available in demo mode." });
  }

  const match = await consumeMagicLinkToken({
    email,
    rawToken: tokenRaw,
    audience: "coach",
  });
  if (!match) {
    return json(401, { error: "This sign-in link is no longer valid. Please request a new one." });
  }

  const coachRecord = await findCoachRecordByNormalisedEmail(email);
  if (!coachRecord) {
    return json(403, { error: "This email is no longer linked to an active coach account." });
  }

  const cookieValue = createCoachSessionCookieValue(email);
  return jsonWithCookie(200, { ok: true, email }, buildCoachSessionCookie(cookieValue));
}

function handleSignOut() {
  return jsonWithCookie(200, { ok: true }, clearCoachSessionCookie());
}

export const handler = async (event) => {
  const method = (event.httpMethod || "POST").toUpperCase();
  if (method !== "POST") {
    return json(405, { error: `Method ${method} not allowed.` });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const action = String(body.action || "").trim();
  try {
    if (action === "request-link") return await handleRequestLink(body);
    if (action === "verify-token") return await handleVerifyToken(body);
    if (action === "sign-out") return handleSignOut();
    return json(400, { error: `Unknown action: ${action}` });
  } catch (error) {
    console.error("[coach-auth] Unhandled error:", error);
    return json(500, { error: "Sign-in is temporarily unavailable. Please try again." });
  }
};
