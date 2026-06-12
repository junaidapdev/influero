import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { logger } from "@/lib/logger";
import { createReminder, deleteReminderForRef } from "@/lib/createReminder";
import { useSession } from "@/hooks/useSession";
import { useAppUser } from "@/hooks/useAppUser";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { APP_USER_DEFAULTS } from "@/constants/appUser";
import { monthTimestampRange } from "@/features/meetings/calendar";
import { meetingReminderDueAt } from "@/features/reminders/dueAt";
import { buildMeetingReminderMessages } from "@/features/reminders/messages";
import type { MeetingFormInput } from "@/features/meetings/meeting.schema";
import { ACTIVITY_KIND } from "@shared/types/activity.types";
import type { AppUser } from "@shared/types/appUser.types";
import {
  MEETING_STATUS,
  type Meeting,
  type MeetingAttendee,
} from "@shared/types/meeting.types";
import { REMINDER_KIND, REMINDER_REF_TABLE } from "@shared/types/reminder.types";

const ACTIVITY_REF_TABLE = "meetings";

// What the create/update mutations resolve with. The meeting write and the
// reminder write are deliberately two steps (reminders live in application
// code, never triggers) — when the meeting saved but its reminder write
// failed, the mutation still SUCCEEDS with reminderFailed=true so the caller
// can surface a distinct "saved, but the reminder couldn't be set" toast
// instead of silently missing a reminder or duplicating the meeting on retry.
type MeetingWriteResult = {
  meeting: Meeting;
  reminderFailed: boolean;
};

type UpdateMeetingInput = {
  meetingId: string;
  input: MeetingFormInput;
};

// Maps the all-string form input to meetings columns. A datetime-local string
// (no timezone) parses as LOCAL time — exactly what the user meant — and is
// stored as ISO UTC. Attendee contacts are only stored when non-empty.
function toMeetingColumns(input: MeetingFormInput): {
  brand_id: string | null;
  deal_id: string | null;
  title: string;
  scheduled_at: string;
  location_or_link: string | null;
  attendees: MeetingAttendee[];
  notes: string | null;
} {
  const locationOrLink = input.locationOrLink.trim();
  const notes = input.notes.trim();
  return {
    brand_id: input.brandId === "" ? null : input.brandId,
    deal_id: input.dealId === "" ? null : input.dealId,
    title: input.title.trim(),
    scheduled_at: new Date(input.scheduledAt).toISOString(),
    location_or_link: locationOrLink === "" ? null : locationOrLink,
    attendees: input.attendees.map((attendee) => {
      const contact = attendee.contact.trim();
      return contact === ""
        ? { name: attendee.name.trim() }
        : { name: attendee.name.trim(), contact };
    }),
    notes: notes === "" ? null : notes,
  };
}

// The lead-minutes the reminder is computed from. Normally the cached
// app_users row; when the cache hasn't resolved yet (e.g. a deep link straight
// to /meetings raced the form fill) it's fetched directly rather than silently
// falling back to the default — the bootstrap default is the last resort, and
// only when even that fetch fails (where the reminder write itself would
// almost certainly fail too, surfacing as reminderFailed).
async function resolveLeadMinutes(
  appUser: AppUser | undefined,
  userId: string,
): Promise<number> {
  if (appUser) return appUser.reminder_lead_minutes;
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("reminder_lead_minutes")
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    return (data as Pick<AppUser, "reminder_lead_minutes">).reminder_lead_minutes;
  } catch (err) {
    logger.error("useMeetings.resolveLeadMinutes", err);
    return APP_USER_DEFAULTS.reminderLeadMinutes;
  }
}

// Writes (or moves) the meeting's reminder; reports failure instead of
// throwing so the already-saved meeting still resolves the mutation.
async function writeMeetingReminder(
  meeting: Meeting,
  leadMinutes: number,
): Promise<boolean> {
  try {
    const messages = buildMeetingReminderMessages(meeting.title);
    await createReminder({
      userId: meeting.user_id,
      kind: REMINDER_KIND.MEETING,
      refId: meeting.id,
      refTable: REMINDER_REF_TABLE.MEETINGS,
      dueAt: meetingReminderDueAt(meeting.scheduled_at, leadMinutes),
      messageEn: messages.messageEn,
      messageAr: messages.messageAr,
    });
    return false;
  } catch (err) {
    logger.error("useMeetings.writeMeetingReminder", err);
    return true;
  }
}

// One LOCAL month, one query — feeds both the list and the calendar grid.
// Cancelled meetings are excluded: cancel is terminal and v1 has no consumer
// for them (mirrors how the deals list tucks cancelled away). RLS scopes the
// read; the user_id filter is convenience.
export function useMeetingsForMonth(month: string) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.MEETINGS, "month", month],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Meeting[]> => {
      if (!userId) throw new Error("[useMeetingsForMonth] No authenticated user");

      const { start, end } = monthTimestampRange(month);
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("user_id", userId)
        .neq("status", MEETING_STATUS.CANCELLED)
        .gte("scheduled_at", start)
        .lt("scheduled_at", end)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;

      return (data ?? []) as Meeting[];
    },
  });
}

// Insert a meeting, then its reminder (due_at = scheduled_at − the user's
// CURRENT reminder_lead_minutes), then log meeting_scheduled (fire-and-forget).
// Meeting first so a reminder never points at nothing.
export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: appUser } = useAppUser();

  return useMutation({
    mutationFn: async (input: MeetingFormInput): Promise<MeetingWriteResult> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCreateMeeting] No authenticated user");

      const { data, error } = await supabase
        .from("meetings")
        .insert({
          ...toMeetingColumns(input),
          user_id: userId,
          status: MEETING_STATUS.UPCOMING,
        })
        .select("*")
        .single();
      if (error) throw error;

      const meeting = data as Meeting;
      const leadMinutes = await resolveLeadMinutes(appUser, userId);
      const reminderFailed = await writeMeetingReminder(meeting, leadMinutes);

      void logActivity({
        kind: ACTIVITY_KIND.MEETING_SCHEDULED,
        summary: meeting.title,
        refId: meeting.id,
        refTable: ACTIVITY_REF_TABLE,
      });
      return { meeting, reminderFailed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MEETINGS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}

// Full-field edit. The reminder MOVES with it — createReminder's upsert
// semantics refresh due_at (recomputed from the CURRENT lead-minutes) and the
// title-bearing messages, and self-heal by inserting if the create-time
// reminder write had failed. No activity log: meeting_scheduled fires on
// creation only (the closed v1 kind set has no "meeting_updated").
export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: appUser } = useAppUser();

  return useMutation({
    mutationFn: async ({
      meetingId,
      input,
    }: UpdateMeetingInput): Promise<MeetingWriteResult> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useUpdateMeeting] No authenticated user");

      const { data, error } = await supabase
        .from("meetings")
        .update(toMeetingColumns(input))
        .eq("id", meetingId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;

      const meeting = data as Meeting;
      const leadMinutes = await resolveLeadMinutes(appUser, userId);
      const reminderFailed = await writeMeetingReminder(meeting, leadMinutes);

      return { meeting, reminderFailed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MEETINGS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}

// Cancel — terminal, the row stays (mirrors deals). The reminder is DELETED
// first (decision: a reminder is derived scheduling state, not history), and
// deliberately BEFORE the status flip: if the delete fails the whole mutation
// errors with the meeting untouched and the action is retryable — never a
// cancelled meeting with a live reminder still feeding Today.
export function useCancelMeeting() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (meeting: Meeting): Promise<Meeting> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCancelMeeting] No authenticated user");
      if (meeting.status === MEETING_STATUS.CANCELLED) {
        throw new Error("[useCancelMeeting] Meeting is already cancelled");
      }

      await deleteReminderForRef(userId, REMINDER_KIND.MEETING, meeting.id);

      const { data, error } = await supabase
        .from("meetings")
        .update({ status: MEETING_STATUS.CANCELLED })
        .eq("id", meeting.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;

      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MEETINGS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}
