import { useTranslation } from "react-i18next";

import { useLocale } from "@/hooks/useLocale";
import { formatDualTimestampDate, formatTime } from "@/lib/date";
import type { Meeting } from "@shared/types/meeting.types";

type Props = {
  meeting: Meeting;
  // Resolved by the parent from the cached brands list — undefined while the
  // brands query is in flight or when the meeting has no brand link.
  brandName: string | undefined;
  onEdit: (meeting: Meeting) => void;
  // The calendar's selected-day cards sit under a date heading, so the
  // trailing dual date is redundant there; the flat list shows it.
  showDate?: boolean;
};

// The meeting row card. Meetings ARE in ui-tokens' "Row-Card Left Stripe"
// table (meeting = accent), so every row carries border-s-4 border-s-accent.
// The leading time pill uses the info family — ui-tokens names "Meeting time
// pills" under Info. No status pill: cancelled meetings are excluded from the
// month query and 'done' has no writer, so every visible row is upcoming/past
// by time alone. The whole card is a button that opens the edit sheet.
export function MeetingListItem({ meeting, brandName, onEdit, showDate = true }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const dualDate = formatDualTimestampDate(meeting.scheduled_at, locale);
  const subtitle = [brandName, meeting.location_or_link]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onEdit(meeting)}
      aria-label={t("meetings.actions.editAria", { title: meeting.title })}
      className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-border border-s-4 border-s-accent bg-surface px-4 py-3.5 text-start shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="shrink-0 rounded-md bg-info-light px-2 py-1 text-body font-semibold text-info-foreground">
        {formatTime(meeting.scheduled_at, locale)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-row font-semibold text-text-primary">
          {meeting.title}
        </span>
        {subtitle ? (
          <span className="block truncate text-body text-text-secondary">
            {subtitle}
          </span>
        ) : null}
      </span>

      {showDate ? (
        <span className="shrink-0 text-end">
          <span className="block text-body text-text-secondary">
            {dualDate.primary}
          </span>
          <span className="block text-xs text-text-muted">{dualDate.secondary}</span>
        </span>
      ) : null}
    </button>
  );
}
