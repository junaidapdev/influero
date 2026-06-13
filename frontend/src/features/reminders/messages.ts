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

export function buildPaymentReminderMessages(input: {
  dealTitle: string | undefined;
  amountEn: string;
  amountAr: string;
}): ReminderMessages {
  const { dealTitle, amountEn, amountAr } = input;
  return {
    messageEn: dealTitle
      ? `Payment due — ${dealTitle} · ${amountEn}`
      : `Payment due — ${amountEn}`,
    messageAr: dealTitle
      ? `دفعة مستحقة — ${dealTitle} · ${amountAr}`
      : `دفعة مستحقة — ${amountAr}`,
  };
}

// The 24h Snap-analytics nudge (Feature 16B): a deliverable was just marked
// posted, and the brand will ask for the content's Insights at the 24h mark —
// this is the reminder to capture the screenshot.
export function buildSnapAnalyticsReminderMessages(
  dealTitle: string,
): ReminderMessages {
  return {
    messageEn: `Capture Snap analytics — ${dealTitle}`,
    messageAr: `التقط تحليلات سناب — ${dealTitle}`,
  };
}
