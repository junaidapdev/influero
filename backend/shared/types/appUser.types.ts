// Shared profile type — the canonical shape of an app_users row. Kept
// framework-agnostic (no React, Vite, or Deno imports) so the web app, the
// edge functions, and the future React Native app all reuse it untouched.
export type AppUser = {
  user_id: string;
  display_name: string | null;
  locale: "ar" | "en";
  default_currency: string;
  avatar_url: string | null;
  reminder_lead_minutes: number;
  created_at: string;
};
