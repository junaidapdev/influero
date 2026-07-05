// Bilingual reminder message builders (React-free, Supabase-free per the
// features/ boundary). Both languages are ALWAYS written — message_en and
// message_ar are denormalized at creation time (same stance as
// activity_log.summary) so the Today panel renders the active locale without
// re-deriving. Callers pass pre-formatted amount strings so this module stays
// free of lib/ formatting imports.

export type ReminderMessages = {
  messageEn: string;
  messageAr: string;
};

export function buildMeetingReminderMessages(title: string): ReminderMessages {
  return {
    messageEn: `Meeting — ${title}`,
    messageAr: `اجتماع — ${title}`,
  };
}

// The deal-lifecycle worklist nudges: shoot-day and post-day reminders that
// surface in the dashboard Today panel and clear when the matching checkmark
// is ticked.
export function buildShootReminderMessages(title: string): ReminderMessages {
  return {
    messageEn: `Shoot — ${title}`,
    messageAr: `تصوير — ${title}`,
  };
}

export function buildPostReminderMessages(title: string): ReminderMessages {
  return {
    messageEn: `Post — ${title}`,
    messageAr: `نشر — ${title}`,
  };
}
