import { useMutation } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { APP_USER_DEFAULTS } from "@/constants/appUser";
import type { AppUser } from "@shared/types/appUser.types";

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

// Idempotent profile bootstrap: insert the app_users row if it's missing.
// Runs under the caller's own session, so RLS 'insert own' gates it.
// `ignoreDuplicates` makes a repeat call a no-op and preserves any edits the
// user has since made — so this is safe to call on every login. Seeds
// display_name / avatar from OAuth metadata when the provider supplied them.
export function useEnsureAppUser() {
  return useMutation({
    mutationFn: async (user: User): Promise<void> => {
      const metadata: Record<string, unknown> = user.user_metadata ?? {};

      const payload: AppUserInsert = {
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

      const { error } = await supabase
        .from("app_users")
        .upsert(payload, { onConflict: "user_id", ignoreDuplicates: true });
      if (error) throw error;
    },
  });
}
