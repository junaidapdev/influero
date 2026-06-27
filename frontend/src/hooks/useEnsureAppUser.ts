import { useMutation } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { ensureAppUserRow } from "@/features/profile/bootstrapAppUser";

// Idempotent profile bootstrap: insert the app_users row if it's missing. The
// actual insert lives in features/profile/bootstrapAppUser so the read-time
// self-heal (useAppUser) uses byte-identical logic. Safe to call on every login.
export function useEnsureAppUser() {
  return useMutation({
    mutationFn: (user: User): Promise<void> => ensureAppUserRow(user),
  });
}
