// Browser web-push plumbing: service-worker registration + the subscribe /
// unsubscribe dance the Push API requires. Pure browser APIs, no React and no
// Supabase — the hook layer (usePushNotifications) owns the DB write. Keeping
// this here mirrors lib/supabase.ts and lib/i18n.ts (third-party / platform
// init lives in lib/).

// Thrown by requestPermissionAndSubscribe when the user declines the prompt, so
// the caller can show the "blocked" state instead of a generic error.
export const PUSH_PERMISSION_DENIED = "push-permission-denied";

const SW_URL = "/sw.js";

// The three capabilities web push needs. iOS only exposes PushManager once the
// app is installed to the Home Screen, so this also gates the whole feature off
// for un-installed iOS Safari.
export function isPushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

// Registers the SW and waits until it is active (subscribe needs an active
// worker). Idempotent — the browser returns the existing registration.
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

// The shape the DB row needs — endpoint + the two keys, lifted out of the
// browser's PushSubscription.
export type WebPushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function extractKeys(subscription: PushSubscription): WebPushSubscriptionKeys {
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error("[pushClient] Subscription is missing endpoint or keys");
  }
  return { endpoint, p256dh, auth };
}

// VAPID public keys are base64url; the Push API wants a Uint8Array backed by a
// plain ArrayBuffer (applicationServerKey's BufferSource excludes SharedArrayBuffer).
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

// Registers the SW, asks permission, and subscribes (reusing any existing
// subscription). Throws PUSH_PERMISSION_DENIED if the user declines.
export async function requestPermissionAndSubscribe(
  vapidPublicKey: string,
): Promise<WebPushSubscriptionKeys> {
  const registration = await registerServiceWorker();

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(PUSH_PERMISSION_DENIED);
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  return extractKeys(subscription);
}

// Unsubscribes this device and returns the endpoint that was removed (so the
// hook can delete the matching DB row), or null if there was nothing to remove.
export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await getExistingSubscription();
  if (!subscription) return null;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}
