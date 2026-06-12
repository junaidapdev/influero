import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { Reminder } from "@shared/types/reminder.types";

// Dismiss a Today-panel reminder: is_done=true means "the user handled it"
// (decision settled in Feature 14 — the F13 cancel path DELETES instead,
// because a cancelled source has nothing left to handle). Known and accepted:
// editing a meeting re-arms its dismissed reminder via createReminder's
// upsert-by-ref move — a moved meeting is a new thing to be reminded of.
export function useDismissReminder() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (reminder: Reminder): Promise<void> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useDismissReminder] No authenticated user");

      const { error } = await supabase
        .from("reminders")
        .update({ is_done: true })
        .eq("id", reminder.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}
