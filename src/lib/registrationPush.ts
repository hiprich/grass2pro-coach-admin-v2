// Post-registration push: local notification + optional Web Push subscribe
// without a parent-portal session (uses parent-registration-push).

import { VAPID_PUBLIC_KEY } from "../config/push";
import { getPushCapability } from "./pushClient";

function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buffer;
}

function guessDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh|Mac OS/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "This device";
}

/** Lock-screen style confirmation when permission is already granted. */
export async function showLocalRegistrationNotification(coachName: string, childName: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return;

  const coachFirst = coachName.split(/\s+/)[0] || coachName;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Registration received", {
      body: `We've sent ${childName}'s details to ${coachFirst}. Check your email for confirmation.`,
      tag: "registration-confirmation",
      data: { url: "/portal" },
    });
  } catch {
    /* best-effort */
  }
}

export type RegistrationPushParams = {
  registrationId: string;
  parentEmail: string;
  parentName: string;
  parentPhone?: string;
  coachName: string;
  childName: string;
  coachSlug: string;
};

/**
 * After a successful coach landing registration: show a local notification and,
 * when Web Push is available, subscribe + notify via parent-registration-push.
 */
export async function enableRegistrationPush(params: RegistrationPushParams): Promise<void> {
  await showLocalRegistrationNotification(params.coachName, params.childName);

  const cap = getPushCapability();
  if (cap.kind !== "ready") return;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return;

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
  } catch {
    return;
  }

  if (!endpoint || !keys.p256dh || !keys.auth) return;
  if (!params.registrationId) return;

  try {
    await fetch("/api/parent-registration-push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registrationId: params.registrationId,
        parentEmail: params.parentEmail,
        parentName: params.parentName,
        parentPhone: params.parentPhone || "",
        coachName: params.coachName,
        childName: params.childName,
        coachSlug: params.coachSlug,
        endpoint,
        keys,
        deviceLabel: guessDeviceLabel(),
        userAgent: navigator.userAgent || "",
      }),
    });
  } catch {
    /* best-effort */
  }
}
