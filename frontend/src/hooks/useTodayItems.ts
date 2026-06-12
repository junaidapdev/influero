import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { TODAY_WINDOW_HOURS } from "@/constants/dashboard";
import { MEETING_STATUS, type Meeting } from "@shared/types/meeting.types";
import type { Reminder } from "@shared/types/reminder.types";

const HOUR_MS = 60 * 60 * 1000;

// The window is computed at FETCH time (not render time) so it can't go stale
// in the queryKey while staying fresh on every refetch — invalidations of the
// MEETINGS / REMINDERS prefixes and the default mount/focus refetches keep it
// current.
function todayWindowIsoRange(): { start: string; end: string } {
  const now = Date.now();
  return {
    start: new Date(now).toISOString(),
    end: new Date(now + TODAY_WINDOW_HOURS * HOUR_MS).toISOString(),
  };
}

// Meetings in the next-24h window. This stays as its own TanStack query so
// the Today panel can render whichever half loaded if reminders fail.
export function useTodayMeetings() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.MEETINGS, "today"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Meeting[]> => {
      if (!userId) throw new Error("[useTodayMeetings] No authenticated user");

      const window = todayWindowIsoRange();
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("user_id", userId)
        .eq("status", MEETING_STATUS.UPCOMING)
        .gte("scheduled_at", window.start)
        .lt("scheduled_at", window.end)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;

      return (data ?? []) as Meeting[];
    },
  });
}

// Open reminders due by the window's end. There is no lower bound: past-due
// undismissed reminders stay visible instead of silently vanishing.
export function useTodayReminders() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.REMINDERS, "today"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Reminder[]> => {
      if (!userId) throw new Error("[useTodayReminders] No authenticated user");

      const { end } = todayWindowIsoRange();
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .eq("is_done", false)
        .lt("due_at", end)
        .order("due_at", { ascending: true });
      if (error) throw error;

      return (data ?? []) as Reminder[];
    },
  });
}
