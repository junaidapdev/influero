import { useTranslation } from "react-i18next";
import { Check, RotateCcw } from "lucide-react";

import { useLocale } from "@/hooks/useLocale";
import { formatDualTimestampDate, formatTime } from "@/lib/date";
import type { Reminder } from "@shared/types/reminder.types";

type Props = {
  reminder: Reminder;
  // Past-due and still open — the parent compares due_at against a single "now"
  // so every row in a render agrees. Always false for a done reminder.
  overdue: boolean;
  onEdit: (reminder: Reminder) => void;
  onToggleDone: (reminder: Reminder) => void;
  isToggling: boolean;
};

// One reminder row: the note text + its date/time on the left (the whole area is
// the edit affordance — tapping opens the prefilled sheet, where Delete lives),
// and a trailing toggle — a check to mark Done, or an undo to re-open a done one.
// message_en === message_ar (the text is dual-written), so either renders the
// user's note; we pick by locale to stay consistent with the Today panel.
export function ReminderListItem({
  reminder,
  overdue,
  onEdit,
  onToggleDone,
  isToggling,
}: Props) {
  const { t } = useTranslation();
  const { isArabic, locale } = useLocale();

  const text = isArabic ? reminder.message_ar : reminder.message_en;
  const done = reminder.is_done;
  const dateLabel = formatDualTimestampDate(reminder.due_at, locale).primary;
  const timeLabel = formatTime(reminder.due_at, locale);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-card ${
        done ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onEdit(reminder)}
        aria-label={t("reminders.actions.editAria", { title: text })}
        className="flex min-w-0 flex-1 flex-col gap-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
      >
        <p
          className={`truncate font-semibold ${
            done ? "text-text-muted line-through" : "text-text-primary"
          }`}
        >
          {text}
        </p>
        <span className="flex flex-wrap items-center gap-x-2 text-caption text-text-muted">
          <span>
            {dateLabel} · {timeLabel}
          </span>
          {overdue ? (
            <span className="font-medium text-error-foreground">
              {t("dashboard.today.overdue")}
            </span>
          ) : null}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onToggleDone(reminder)}
        disabled={isToggling}
        aria-label={
          done
            ? t("reminders.actions.reopenAria", { title: text })
            : t("reminders.actions.doneAria", { title: text })
        }
        className="grid size-11 shrink-0 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary hover:text-success-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
      >
        {done ? (
          <RotateCcw className="size-5" aria-hidden="true" />
        ) : (
          <Check className="size-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
