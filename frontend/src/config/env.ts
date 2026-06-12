// The single place the frontend reads environment variables. Every other module
// imports ENV from here — never `import.meta.env` directly. Presence is validated
// once at startup so a missing key fails loudly instead of surfacing as a vague
// runtime error deep in the app.
//
// Required vars (set by the developer in `.env.local`, never committed):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY

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
  IS_PROD: import.meta.env.PROD,
} as const;
