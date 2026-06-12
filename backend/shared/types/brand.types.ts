// Shared brand type — the canonical shape of a brands row. Kept
// framework-agnostic (no React, Vite, or Deno imports) so the web app, the
// edge functions, and the future React Native app all reuse it untouched.
export type Brand = {
  id: string;
  user_id: string;
  name_en: string;
  name_ar: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
};
