// The common response envelope every edge function returns — { ok: true, data }
// or { ok: false, error: { code, message } } — plus the CORS headers a browser
// `supabase.functions.invoke` call needs (the architecture template omits CORS,
// but the preflight OPTIONS request fails without it). Never return raw data
// without the envelope; never hand-build a Response in a function body.

import type { ErrorCode } from "./constants.ts";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
} as const;

export function ok(data: unknown, status: number): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: JSON_HEADERS,
  });
}

export function fail(code: ErrorCode, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ ok: false, error: { code, message } }),
    { status, headers: JSON_HEADERS },
  );
}

// The preflight response — return this immediately for OPTIONS requests.
export function corsPreflight(): Response {
  return new Response("ok", { headers: CORS_HEADERS });
}
