// The single place the frontend reads environment variables. Every other module
// imports ENV from here — never `import.meta.env` directly. Presence is validated
// once at startup so a missing key fails loudly instead of surfacing as a vague
// runtime error deep in the app.
//
// Required vars (set by the developer in `.env.local`, never committed):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY
// Optional vars:
//   VITE_VAPID_PUBLIC_KEY  — the public half of the web-push VAPID key pair the
//     browser needs to subscribe. Optional on purpose: the app must boot without
//     it (push is opt-in and the key is unset until web-push is wired), so the
//     notifications UI degrades to "unavailable" when it's blank — never throws.

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

export const ENV = {
  SUPABASE_URL: required(import.meta.env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL"),
  SUPABASE_ANON_KEY: required(
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    "VITE_SUPABASE_ANON_KEY",
  ),
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "",
  IS_PROD: import.meta.env.PROD,
} as const;
