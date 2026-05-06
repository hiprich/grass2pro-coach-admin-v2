// Web Push configuration — public-facing values only.
//
// The VAPID public key is safe to ship in the bundle: it's the same key the
// browser hands to the push service when subscribing, and it's used by the
// push service to verify that the application server (us) is allowed to
// send to that endpoint. The matching private key lives only in Netlify
// env vars (VAPID_PRIVATE_KEY) and never reaches the client.
//
// VAPID = Voluntary Application Server Identification for Web Push (RFC 8292).
// See https://datatracker.ietf.org/doc/html/rfc8292 and
// https://web.dev/articles/push-notifications-web-push-protocol for the why.
export const VAPID_PUBLIC_KEY =
  "BKRxsMY8W_99iZW2ysx-K20CPqw8AHf8xs8svJ9iOnbII1xODY7jSyK95T8DwO9lMpNP0rN-WBjxRu_Y2H-0Wy4";

// Subject identifies us to the push service when sending. RFC 8292 says it
// must be either a `mailto:` URL or an `https://` URL we control. We use
// the platform contact address so any push-service operator can reach us
// if there's an abuse signal — the same address must be set as the
// VAPID_SUBJECT env var on the server side.
export const VAPID_SUBJECT_FALLBACK = "mailto:noreply@grass2pro.com";
