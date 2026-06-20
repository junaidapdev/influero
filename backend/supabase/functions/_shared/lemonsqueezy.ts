// All LemonSqueezy (LS) API specifics in ONE module so the billing edge functions
// never hand-roll the JSON:API envelope or the webhook signature. Verified against
// the live LS API (api.lemonsqueezy.com/v1, JSON:API / vnd.api+json):
//
// - verifyWebhookSignature: LS signs each webhook with HMAC-SHA256(rawBody, secret)
//   and sends the hex digest in the X-Signature header. Verified with a
//   constant-time compare (no early-exit on first mismatched char).
// - createCheckout / getCustomerPortalUrl: Bearer-authed JSON:API calls. Test vs
//   live is determined by which key is in ENV.LEMONSQUEEZY_API_KEY.

import { ENV } from "../../../config/env.ts";

const LS_BASE = "https://api.lemonsqueezy.com/v1";
const JSON_API = "application/vnd.api+json";

// Constant-time compare of two hex strings (equal length ⇒ no timing leak of how
// many chars matched). Length differing is not secret, so an early false is fine.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const digest = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqual(digest, signature.trim().toLowerCase());
}

async function lsFetch(path: string, init: RequestInit): Promise<Response> {
  return await fetch(`${LS_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ENV.LEMONSQUEEZY_API_KEY}`,
      Accept: JSON_API,
      "Content-Type": JSON_API,
      ...init.headers,
    },
  });
}

// Creates a hosted checkout for the Pro variant, embedding the Supabase user_id as
// custom data (the webhook reads it back via meta.custom_data to map the resulting
// subscription to the user) and prefilling email. Returns the hosted checkout URL.
export async function createCheckout(params: {
  email: string;
  userId: string;
  redirectUrl: string;
}): Promise<string> {
  const body = {
    data: {
      type: "checkouts",
      attributes: {
        // Must match the mode of the store/variant + the API key. LS rejects a
        // live checkout against a test variant (and vice versa).
        test_mode: ENV.LEMONSQUEEZY_TEST_MODE,
        checkout_data: {
          email: params.email,
          custom: { user_id: params.userId },
        },
        product_options: { redirect_url: params.redirectUrl },
      },
      relationships: {
        store: {
          data: { type: "stores", id: ENV.LEMONSQUEEZY_STORE_ID },
        },
        variant: {
          data: { type: "variants", id: ENV.LEMONSQUEEZY_PRO_VARIANT_ID },
        },
      },
    },
  };
  const res = await lsFetch("/checkouts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `LS create checkout failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as { data: { attributes: { url: string } } };
  return json.data.attributes.url;
}

// Fetches a subscription to read its FRESH customer-portal URL (these signed URLs
// expire ~24h, so they are fetched on demand and never stored). Null if absent.
export async function getCustomerPortalUrl(
  subscriptionId: string,
): Promise<string | null> {
  const res = await lsFetch(`/subscriptions/${subscriptionId}`, { method: "GET" });
  if (!res.ok) {
    throw new Error(
      `LS get subscription failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as {
    data: { attributes: { urls?: { customer_portal?: string } } };
  };
  return json.data.attributes.urls?.customer_portal ?? null;
}
