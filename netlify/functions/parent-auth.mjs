// Parent portal authentication endpoint.
//
//   POST /api/parent-auth { action: "request-link", email }
//     Mints a magic-link token, stores its hash, and emails the parent.
//     Returns 200 even when the email isn't on file so attackers can't
//     enumerate registered parents from the portal.
//
//   POST /api/parent-auth { action: "verify-token", email, token }
//     Validates the token, marks it used, and issues an HttpOnly session
//     cookie so subsequent calls to parent-data / parent-actions can scope
//     to this parent.
//
//   POST /api/parent-auth { action: "sign-out" }
//     Clears the session cookie. Idempotent.
//
// All actions go through the same POST handler so the SPA only needs one
// entry point. We intentionally avoid GET so magic-link discovery URLs
// can't trigger token consumption from email previewers.
import { hasAirtableConfig, json } from "./_airtable.mjs";
import {
  MAGIC_LINK_TTL_MINUTES,
  buildSessionCookie,
  clearSessionCookie,
  consumeMagicLinkToken,
  createSessionCookieValue,
  isValidEmail,
  mintMagicLinkToken,
  normaliseEmail,
  storeMagicLinkToken,
} from "./_parent-session.mjs";
import { sendMagicLinkEmail } from "./_parent-mailer.mjs";

function jsonWithCookie(statusCode, body, cookie) {
  // Wrap the standard JSON helper so we can attach a Set-Cookie header
  // alongside the existing { headers, body } shape that json() emits.
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

  // We always respond 200 even when the email isn't recognised. This
  // prevents the portal from being used to enumerate which parents are
  // registered. If the address is on file we send a real link; otherwise
  // we silently no-op.
  if (!hasAirtableConfig()) {
    // Without Airtable we can't store the token, so report a soft-success
    // so the SPA flow stays consistent in demo mode.
    return json(200, { ok: true, demo: true });
  }

  const { raw, hash } = mintMagicLinkToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000).toISOString();

  try {
    await storeMagicLinkToken({ email, hash, expiresAtIso: expiresAt });
  } catch (error) {
    console.error("[parent-auth] Failed to store magic-link token:", error);
    // Even on storage failure we keep the response generic so the parent
    // sees the same "check your email" message.
    return json(200, { ok: true });
  }

  const result = await sendMagicLinkEmail({
    to: email,
    rawToken: raw,
    expiresInMinutes: MAGIC_LINK_TTL_MINUTES,
  });

  // Surface a soft warning to the SPA when the mailer is not yet set up
  // (Resend not configured / domain not verified). The parent still sees
  // the same friendly "check your email" message but we expose a flag so
  // ops can spot misconfiguration in network requests.
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

  const match = await consumeMagicLinkToken({ email, rawToken: tokenRaw });
  if (!match) {
    return json(401, { error: "This sign-in link is no longer valid. Please request a new one." });
  }

  const cookieValue = createSessionCookieValue(email);
  return jsonWithCookie(200, { ok: true, email }, buildSessionCookie(cookieValue));
}

function handleSignOut() {
  return jsonWithCookie(200, { ok: true }, clearSessionCookie());
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
    console.error("[parent-auth] Unhandled error:", error);
    return json(500, { error: "Sign-in is temporarily unavailable. Please try again." });
  }
};
