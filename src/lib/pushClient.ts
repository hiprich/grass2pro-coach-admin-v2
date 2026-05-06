// Web Push client helper for the parent portal.
//
// Boundaries:
//  - This module never touches Airtable directly. All persistence goes through
//    /.netlify/functions/parent-push-subscribe and /parent-push-unsubscribe.
//  - This module never reads or writes the parent's auth state. The Netlify
//    functions read the parent session cookie set by /parent-auth.
//  - The service worker at /sw.js is registered by index.html on page load,
//    so we *wait* for it to be ready rather than registering it ourselves.
//    That avoids a race where two registrations fight for control.
//
// iOS Safari quirk (16.4+): Web Push only works once the page is installed
// to the Home Screen. We surface that via `getPushCapability()` so the UI
// can show the right hint instead of failing silently.
import { VAPID_PUBLIC_KEY } from "../config/push";

export type PushCapability =
  | { kind: "ready" }
  | { kind: "unsupported"; reason: "no-service-worker" | "no-push-manager" | "no-notifications" }
  | { kind: "ios-needs-pwa" }
  | { kind: "permission-denied" };

export type PushSubscriptionStatus =
  | { kind: "subscribed"; endpoint: string }
  | { kind: "not-subscribed" }
  | { kind: "unsupported" };

function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  // Web Push subscribe expects a raw byte view of the VAPID public key.
  // The key we ship is URL-safe base64 (RFC 7515 §2) so we normalise it
  // back to standard base64 before atob().
  //
  // We hand back a fresh ArrayBuffer rather than a Uint8Array because the
  // applicationServerKey type is BufferSource, and TS's DOM lib reports the
  // typed-array overload as `ArrayBufferLike` which now ambiguously includes
  // SharedArrayBuffer — a pure ArrayBuffer dodges that.
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buffer;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS 13+ reports as MacIntel; the touch points check disambiguates it.
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari uses navigator.standalone; other browsers expose the
  // display-mode media query.
  const navAny = navigator as unknown as { standalone?: boolean };
  if (navAny.standalone) return true;
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

/** Snapshot of what's possible right now. UI uses this to show the right hint. */
export function getPushCapability(): PushCapability {
  if (typeof window === "undefined") return { kind: "unsupported", reason: "no-service-worker" };
  if (!("serviceWorker" in navigator)) return { kind: "unsupported", reason: "no-service-worker" };
  if (!("PushManager" in window)) {
    if (isIos() && !isStandalone()) return { kind: "ios-needs-pwa" };
    return { kind: "unsupported", reason: "no-push-manager" };
  }
  if (typeof Notification === "undefined") return { kind: "unsupported", reason: "no-notifications" };
  if (Notification.permission === "denied") return { kind: "permission-denied" };
  return { kind: "ready" };
}

/** Returns the current subscription status without prompting for permission. */
export async function getSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  const cap = getPushCapability();
  if (cap.kind !== "ready" && cap.kind !== "permission-denied") {
    return { kind: "unsupported" };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) return { kind: "subscribed", endpoint: sub.endpoint };
    return { kind: "not-subscribed" };
  } catch {
    return { kind: "unsupported" };
  }
}

/**
 * Prompt for permission, subscribe via PushManager, and POST the subscription
 * to /parent-push-subscribe. Idempotent: re-calling on an already-subscribed
 * device returns the existing subscription and re-syncs it server-side, which
 * also serves as the "device label changed" path.
 */
export async function subscribeToPush(opts?: { deviceLabel?: string }): Promise<
  | { ok: true; endpoint: string }
  | { ok: false; reason: PushCapability["kind"] | "subscribe-failed" | "server-error"; detail?: string }
> {
  const cap = getPushCapability();
  if (cap.kind !== "ready") {
    return { ok: false, reason: cap.kind };
  }

  // Permission must be requested from a user gesture. Caller is responsible
  // for triggering this from a click/tap handler.
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: "permission-denied" };
  }

  let endpoint: string;
  let keys: { p256dh?: string; auth?: string };
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC_KEY),
      }));
    const json = sub.toJSON();
    endpoint = json.endpoint || sub.endpoint;
    keys = (json.keys || {}) as { p256dh?: string; auth?: string };
  } catch (error) {
    return { ok: false, reason: "subscribe-failed", detail: String(error) };
  }

  try {
    const res = await fetch("/.netlify/functions/parent-push-subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        endpoint,
        keys,
        deviceLabel: opts?.deviceLabel || guessDeviceLabel(),
        userAgent: navigator.userAgent || "",
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: "server-error", detail: text || `HTTP ${res.status}` };
    }
  } catch (error) {
    return { ok: false, reason: "server-error", detail: String(error) };
  }

  return { ok: true, endpoint };
}

/** Unsubscribe locally and tell the server to mark the row inactive. */
export async function unsubscribeFromPush(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return { ok: true }; // already gone

    // Tell the server first so it can flag Active=false even if the local
    // unsubscribe fails (e.g. Safari sometimes throws on a stale endpoint).
    let serverDetail: string | undefined;
    try {
      const res = await fetch("/.netlify/functions/parent-push-unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      if (!res.ok) serverDetail = `HTTP ${res.status}`;
    } catch (error) {
      serverDetail = String(error);
    }

    try {
      await sub.unsubscribe();
    } catch {
      /* swallow — server-side flag is the source of truth */
    }
    return { ok: !serverDetail, detail: serverDetail };
  } catch (error) {
    return { ok: false, detail: String(error) };
  }
}

/** Friendly label for the Push Subscriptions row, used as the primary field. */
function guessDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent || "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown device";
}
