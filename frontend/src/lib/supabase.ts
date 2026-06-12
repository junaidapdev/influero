import { createClient } from "@supabase/supabase-js";
import { ENV } from "@/config/env";

// Browser-side Supabase client — used by every hook. The edge functions use a
// separate server-side client (service role / per-request JWT); the two are
// never mixed. RLS is the real security boundary; this client only ever holds
// the public anon key.
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // auto-exchanges the OAuth / email-verification code on the callback page
    flowType: "pkce", // tokens never land in the URL; the code verifier stays in this browser's storage
  },
});
