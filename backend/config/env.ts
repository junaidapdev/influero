// The single place edge functions read environment variables — the backend
// counterpart of frontend/src/config/env.ts. Every other module imports ENV
// from here; an inline Deno.env.get anywhere else fails review. Presence is
// validated at first import so a missing key fails loudly at boot, not as a
// vague error mid-request.
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are
// auto-injected into Supabase edge functions by the platform; additional
// secrets (e.g. OPENAI_API_KEY for Feature 15) are set via
// `supabase secrets set` and added here when their consumer lands.

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

// Optional numeric env with a default — used for tunables (rate limits) that
// should not require a secret to be set before the function can boot.
function optionalNumber(name: string, fallback: number): number {
  const value = Deno.env.get(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[env] Invalid numeric environment variable: ${name}`);
  }
  return parsed;
}

export const ENV = {
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_ANON_KEY: required("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  // Lazy on purpose: every function imports ENV (via supabase-server.ts), but
  // only extract-snap-report needs the OpenAI key. An eager required() here
  // would crash mark-payment-received's boot whenever the secret isn't set.
  // The getter still fails loudly — at the consumer's first access.
  get OPENAI_API_KEY(): string {
    return required("OPENAI_API_KEY");
  },
  SNAP_RATE_LIMIT_PER_HOUR: optionalNumber("SNAP_RATE_LIMIT_PER_HOUR", 20),
  // Web-push secrets — only send-daily-reminders reads these, so all lazy (same
  // reasoning as OPENAI_API_KEY). VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are the
  // base64url pair from `npx web-push generate-vapid-keys` (the public half also
  // lives in the frontend as VITE_VAPID_PUBLIC_KEY); VAPID_SUBJECT is the
  // `mailto:` contact the push relay can reach; CRON_SECRET gates the function
  // so only pg_cron (which sends a matching x-cron-secret header) can invoke it.
  get VAPID_PUBLIC_KEY(): string {
    return required("VAPID_PUBLIC_KEY");
  },
  get VAPID_PRIVATE_KEY(): string {
    return required("VAPID_PRIVATE_KEY");
  },
  get VAPID_SUBJECT(): string {
    return required("VAPID_SUBJECT");
  },
  get CRON_SECRET(): string {
    return required("CRON_SECRET");
  },
} as const;
