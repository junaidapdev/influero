import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/numbers";
import { todayIsoLocal, weekdayLabels } from "@/lib/date";
import {
  monthGridDays,
  timestampDayKey,
  WEEK_STARTS_ON,
} from "@/features/meetings/calendar";
import type { Meeting } from "@shared/types/meeting.types";

type Props = {
  month: string;
  meetings: Meeting[];
  selectedDay: string;
  onSelectDay: (dayKey: string) => void;
};

// The month grid (Gregorian — Hijri months don't align with its buckets; the
// selected-day heading and every meeting date still render dual via
// lib/date.ts). Week starts Sunday (the Saudi week). Day cells are buttons
// (≥44px touch targets); days with meetings carry a small accent dot; the
// selected day fills accent; today is accent-tinted when not selected. The
// leading/trailing pad cells of other months are disabled — the month nav is
// how you leave the month. With <html dir="rtl"> the grid columns flow
// right-to-left automatically, which is exactly how Arabic calendars read.
//
// Deliberately a labelled GROUP of buttons, not an ARIA grid: role="grid"
// demands row/gridcell structure + arrow-key navigation, and faking it half-way
// reads as broken to screen readers. Plain buttons tab in order and announce
// their day number — honest and usable.
export function MeetingCalendar({ month, meetings, selectedDay, onSelectDay }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const days = useMemo(() => monthGridDays(month), [month]);
  const meetingDays = useMemo(() => {
    const keys = new Set<string>();
    for (const meeting of meetings) keys.add(timestampDayKey(meeting.scheduled_at));
    return keys;
  }, [meetings]);

  const labels = weekdayLabels(locale, WEEK_STARTS_ON);
  const today = todayIsoLocal();

  return (
    <div role="group" aria-label={t("meetings.calendarLabel")}>
      <div className="grid grid-cols-7 gap-1">
        {labels.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-xs font-medium text-text-muted"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const isSelected = day.inMonth && day.dayKey === selectedDay;
          const isToday = day.dayKey === today;
          const hasMeetings = meetingDays.has(day.dayKey);

          const cellTone = isSelected
            ? "bg-accent font-semibold text-accent-foreground"
            : isToday
              ? "bg-accent-light font-semibold text-accent"
              : day.inMonth
                ? "text-text-primary hover:bg-surface-secondary"
                : "text-text-muted opacity-40";

          return (
            <button
              key={day.dayKey}
              type="button"
              disabled={!day.inMonth}
              onClick={() => onSelectDay(day.dayKey)}
              aria-pressed={isSelected}
              className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none ${cellTone}`}
            >
              <span>{formatNumber(day.dayOfMonth, locale)}</span>
              <span
                aria-hidden="true"
                className={`size-1 rounded-full ${
                  hasMeetings
                    ? isSelected
                      ? "bg-accent-foreground"
                      : "bg-accent"
                    : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
