import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { APP_USER_DEFAULTS } from "@/constants/appUser";
import type { AppUser } from "@shared/types/appUser.types";

// The profile-row bootstrap, shared by the interactive entry paths
// (useEnsureAppUser, called from login + auth-callback) AND the read-time
// self-heal (useAppUser). Centralized so the two never drift — a missing row
// must be created identically wherever it's discovered. There is no server-side
// trigger, so the client is the only creator; making the READ self-heal removes
// the dead-end where a swallowed bootstrap failure left Settings permanently
// broken with no in-app recovery.

type AppUserInsert = Pick<
  AppUser,
  | "user_id"
  | "display_name"
  | "avatar_url"
  | "locale"
  | "default_currency"
  | "reminder_lead_minutes"
>;

function readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

// Builds the insert payload, seeding display_name / avatar from OAuth metadata
// when the provider supplied them.
export function buildAppUserInsert(user: User): AppUserInsert {
  const metadata: Record<string, unknown> = user.user_metadata ?? {};

  return {
    user_id: user.id,
    display_name:
      readMetadataString(metadata, "full_name") ??
      readMetadataString(metadata, "name"),
    avatar_url:
      readMetadataString(metadata, "avatar_url") ??
      readMetadataString(metadata, "picture"),
    locale: APP_USER_DEFAULTS.locale,
    default_currency: APP_USER_DEFAULTS.defaultCurrency,
    reminder_lead_minutes: APP_USER_DEFAULTS.reminderLeadMinutes,
  };
}

// Idempotent: insert the app_users row if it's missing. Runs under the caller's
// own session, so RLS 'insert own' gates it. `ignoreDuplicates` makes a repeat
// call a no-op and preserves any edits the user has since made — safe to call on
// every login AND on a self-heal read.
export async function ensureAppUserRow(user: User): Promise<void> {
  const { error } = await supabase
    .from("app_users")
    .upsert(buildAppUserInsert(user), { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw error;
}
