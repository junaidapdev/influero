import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { ReminderFormInput } from "@/features/reminders/reminder.schema";
import {
  REMINDER_CHANNEL,
  REMINDER_KIND,
  type Reminder,
} from "@shared/types/reminder.types";

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

// ── User-authored quick reminders (kind='custom') ──────────────────────────
// These do NOT go through lib/createReminder: that helper upserts by
// (kind, ref_id) for reminders DERIVED from a source row (a meeting, a deal).
// A custom reminder has no source — ref_id/ref_table stay null — so each is a
// distinct row created/edited/deleted directly by id, the brands/expenses
// single-table CRUD pattern (RLS-gated PostgREST, no edge function).

// Maps the all-string form input to reminders columns. The datetime-local
// string is the viewer's LOCAL wall-clock time; new Date(value).toISOString()
// stores it as the matching UTC instant (inverse of toDatetimeLocalValue). The
// typed text is denormalized into both message columns — a user note isn't
// translatable, so whichever locale renders shows exactly what they typed.
function toReminderColumns(input: ReminderFormInput): {
  due_at: string;
  message_en: string;
  message_ar: string;
} {
  const text = input.text.trim();
  return {
    due_at: new Date(input.remindAt).toISOString(),
    message_en: text,
    message_ar: text,
  };
}

// All of the user's custom reminders (both open and done), soonest first. The
// /reminders page splits them into Upcoming / Done client-side. RLS scopes the
// read; the user_id filter is convenience. Auto-generated reminders
// (meeting/shoot/post/deliverable) are excluded — they're managed from their
// source entity, never here.
export function useReminders() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.REMINDERS, "list"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Reminder[]> => {
      if (!userId) throw new Error("[useReminders] No authenticated user");

      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .eq("kind", REMINDER_KIND.CUSTOM)
        .order("due_at", { ascending: true });
      if (error) throw error;

      return (data ?? []) as Reminder[];
    },
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (input: ReminderFormInput): Promise<Reminder> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCreateReminder] No authenticated user");

      const { data, error } = await supabase
        .from("reminders")
        .insert({
          ...toReminderColumns(input),
          user_id: userId,
          kind: REMINDER_KIND.CUSTOM,
          ref_id: null,
          ref_table: null,
          channel: REMINDER_CHANNEL.IN_APP,
        })
        .select("*")
        .single();
      if (error) throw error;

      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}

// Edit the text + time, and re-open the reminder (is_done=false). Editing a
// reminder means you're actively working with it, so it should be live again —
// the same re-arm-on-change stance as lib/createReminder's upsert move. For an
// already-open reminder this is a no-op; for a done one it returns it to Upcoming.
export function useUpdateReminder() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async ({
      reminderId,
      input,
    }: {
      reminderId: string;
      input: ReminderFormInput;
    }): Promise<Reminder> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useUpdateReminder] No authenticated user");

      const { data, error } = await supabase
        .from("reminders")
        .update({ ...toReminderColumns(input), is_done: false })
        .eq("id", reminderId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;

      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (reminderId: string): Promise<void> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useDeleteReminder] No authenticated user");

      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", reminderId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}

// Done / Undo toggle for the /reminders page (both directions). The Today
// panel keeps its own useDismissReminder (one-way, takes a full Reminder); this
// one takes an id + the target state so the Done section can re-open a reminder.
export function useSetReminderDone() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async ({
      reminderId,
      isDone,
    }: {
      reminderId: string;
      isDone: boolean;
    }): Promise<void> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useSetReminderDone] No authenticated user");

      const { error } = await supabase
        .from("reminders")
        .update({ is_done: isDone })
        .eq("id", reminderId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}

// Bulk-clear the user's DONE custom reminders (the /reminders Done section's
// "Clear done" action) — bounds the otherwise ever-growing done list. Scoped to
// kind='custom' + is_done=true, so it NEVER touches an auto-generated reminder
// (a meeting/payment/deal reminder dismissed from the Today panel is is_done=true
// too, but carries a non-custom kind and stays managed from its source).
export function useClearDoneReminders() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useClearDoneReminders] No authenticated user");

      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("user_id", userId)
        .eq("kind", REMINDER_KIND.CUSTOM)
        .eq("is_done", true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}
