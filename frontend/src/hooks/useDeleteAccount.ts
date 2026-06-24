import { useMutation } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { ACCOUNT_DELETE_ERROR, ACCOUNT_EDGE_FUNCTION } from "@/constants/account";

// The edge function's common envelope.
type DeleteEnvelope =
  | { ok: true; data: { deleted: boolean } }
  | { ok: false; error: { code: string; message: string } };

// Permanently deletes the calling user's account: delete-account cancels any
// active subscription, removes their storage + every owned row, and deletes the
// auth user; then we clear the now-orphaned local session. On failure it throws
// Error(token) — SUBSCRIPTION_ACTIVE (the recoverable "cancel your sub first"
// case, surfaced via the 4xx envelope on FunctionsHttpError.context) or GENERIC —
// so the caller can pick the right localized toast.
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { data, error } = await supabase.functions.invoke(
        ACCOUNT_EDGE_FUNCTION.DELETE_ACCOUNT,
        { body: {} },
      );

      if (error) {
        // A non-2xx response carries the envelope on the Response context — read
        // its error message token so the recoverable cases stay distinguishable.
        if (error instanceof FunctionsHttpError) {
          let token: string = ACCOUNT_DELETE_ERROR.GENERIC;
          try {
            const body = (await error.context.json()) as DeleteEnvelope;
            if (!body.ok && body.error?.message) token = body.error.message;
          } catch {
            // Body wasn't JSON — fall through to the generic token.
          }
          throw new Error(token);
        }
        throw error;
      }

      const envelope = data as DeleteEnvelope;
      if (!envelope.ok) throw new Error(envelope.error.message);

      // Account is gone — drop the LOCAL session (the server already invalidated
      // every session when the user was deleted, so a global revoke is pointless
      // and would just call the API for a user that no longer exists).
      await supabase.auth.signOut({ scope: "local" });
    },
  });
}
