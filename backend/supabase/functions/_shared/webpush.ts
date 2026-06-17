// Web-push sender (Phase B). Wraps @negrel/webpush — a Web Crypto-native library
// that runs cleanly on the Deno edge runtime (npm:web-push relies on Node's
// http/crypto stack and is unreliable here). The library wants VAPID keys as a
// JWK pair; the project stores them as the base64url pair from
// `npx web-push generate-vapid-keys` (so the same public key works as the
// browser's applicationServerKey), so we convert here: a P-256 public key is
// 0x04 || X(32) || Y(32) and the private key is the 32-byte scalar d.

import * as webpush from "jsr:@negrel/webpush@0.5.0";

import { HTTP } from "./constants.ts";
import { ENV } from "../../../config/env.ts";

// A daily nudge shouldn't outlive its day — relays drop it after this if the
// device was offline the whole window.
const PUSH_TTL_SECONDS = 6 * 60 * 60;

export type PushDevice = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function base64UrlToBytes(value: string): Uint8Array {
  // Strip anything outside the base64url alphabet first: secret values commonly
  // pick up a trailing newline or wrapping quotes when set via the CLI/dashboard,
  // and atob throws InvalidCharacterError on those.
  const clean = value.replace(/[^A-Za-z0-9_-]/g, "");
  const padding = "=".repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// base64url VAPID pair → the JWK pair @negrel/webpush imports.
function vapidJwks(publicKey: string, privateKey: string): webpush.ExportedVapidKeys {
  const pub = base64UrlToBytes(publicKey); // 65 bytes: 0x04 || X(32) || Y(32)
  const d = bytesToBase64Url(base64UrlToBytes(privateKey)); // 32-byte scalar
  const x = bytesToBase64Url(pub.slice(1, 33));
  const y = bytesToBase64Url(pub.slice(33, 65));
  return {
    publicKey: { kty: "EC", crv: "P-256", x, y },
    privateKey: { kty: "EC", crv: "P-256", x, y, d },
  };
}

// ApplicationServer.new imports the keys (a little work) — build it once per
// invocation and reuse across every user/device.
let cached: webpush.ApplicationServer | null = null;

export async function getApplicationServer(): Promise<webpush.ApplicationServer> {
  if (cached) return cached;
  const vapidKeys = await webpush.importVapidKeys(
    vapidJwks(ENV.VAPID_PUBLIC_KEY, ENV.VAPID_PRIVATE_KEY),
    { extractable: false },
  );
  cached = await webpush.ApplicationServer.new({
    contactInformation: ENV.VAPID_SUBJECT,
    vapidKeys,
  });
  return cached;
}

export async function sendPush(
  appServer: webpush.ApplicationServer,
  device: PushDevice,
  payloadJson: string,
  topic: string,
): Promise<void> {
  const subscriber = appServer.subscribe({
    endpoint: device.endpoint,
    keys: { p256dh: device.p256dh, auth: device.auth },
  });
  await subscriber.pushTextMessage(payloadJson, {
    ttl: PUSH_TTL_SECONDS,
    topic,
  });
}

// A push to an expired/unsubscribed device → prune its row. 410 Gone is the
// canonical signal (isGone()); a few relays use 404.
export function isSubscriptionGone(error: unknown): boolean {
  return (
    error instanceof webpush.PushMessageError &&
    (error.isGone() || error.response.status === HTTP.NOT_FOUND)
  );
}
