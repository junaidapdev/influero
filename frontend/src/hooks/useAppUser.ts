import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { ensureAppUserRow } from "@/features/profile/bootstrapAppUser";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { AppUser } from "@shared/types/appUser.types";

// Reads the signed-in user's profile row for the Settings prefill. The row is
// normally bootstrapped at first login (useEnsureAppUser), but that runs only on
// interactive entry paths and its failures used to be swallowed — leaving a user
// with a live session and no row permanently stuck (Settings/profile/language
// unusable, no in-app recovery). So a missing row SELF-HEALS here: create it
// idempotently, then re-read. RLS scopes the read; the user_id filter is
// convenience.
export function useAppUser() {
  const { session } = useSession();
  const user = session?.user;
  const userId = user?.id;

  return useQuery({
    queryKey: QUERY_KEYS.APP_USER,
    enabled: Boolean(userId),
    queryFn: async (): Promise<AppUser> => {
      if (!user || !userId) throw new Error("[useAppUser] No authenticated user");

      const read = () =>
        supabase.from("app_users").select("*").eq("user_id", userId).maybeSingle();

      let { data, error } = await read();
      if (error) throw error;

      if (!data) {
        // No row on a live session: the interactive bootstrap never ran or failed
        // (e.g. a transient OAuth-callback insert error). Create it, then re-read.
        await ensureAppUserRow(user);
        ({ data, error } = await read());
        if (error) throw error;
      }

      if (!data) {
        throw new Error("[useAppUser] Profile row missing after bootstrap");
      }

      // The browser client is untyped (no generated Database types yet); the row
      // shape is the shared AppUser. Cast is the sanctioned pattern here.
      return data as AppUser;
    },
  });
}
