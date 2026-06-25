// Edge-function-side Supabase clients. Two ownership models — never mix them:
//
// createSupabaseAsUser (the DEFAULT): forwards the caller's JWT, so every
// query runs under the user's identity and RLS still enforces ownership.
// mark-payment-received uses this because the RPC checks auth.uid().
//
// createSupabaseAdmin (service_role): BYPASSES RLS. Only for system-level work
// that genuinely needs cross-user access, only after explicit ownership checks
// in code, and only with a comment explaining why. Inflero v1 needs it
// nowhere. NOTE for any future admin-path activity write: with no JWT,
// auth.uid() is null, so activity_log's user_id default does not fill —
// pass userId explicitly to logActivity.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

import { ENV } from "../../../config/env.ts";

export function createSupabaseAsUser(authHeader: string): SupabaseClient {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

export function createSupabaseAdmin(): SupabaseClient {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
