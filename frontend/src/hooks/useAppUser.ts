import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { AppUser } from "@shared/types/appUser.types";

// Reads the signed-in user's profile row for the Settings prefill. The row is
// bootstrapped at first login (useEnsureAppUser), so a missing row is an error,
// not an empty state. RLS scopes the read; the user_id filter is convenience.
export function useAppUser() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: QUERY_KEYS.APP_USER,
    enabled: Boolean(userId),
    queryFn: async (): Promise<AppUser> => {
      if (!userId) throw new Error("[useAppUser] No authenticated user");

      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;

      // The browser client is untyped (no generated Database types yet); the row
      // shape is the shared AppUser. Cast is the sanctioned pattern here.
      return data as AppUser;
    },
  });
}
