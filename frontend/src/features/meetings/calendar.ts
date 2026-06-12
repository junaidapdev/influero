// Pure month-grid math for the /meetings calendar (React-free, Supabase-free
// per the features/ boundary). Native Date arithmetic suffices here — date-fns
// (approved but not yet installed) stays deferred until something genuinely
// awkward needs it.
//
// All math runs in the VIEWER'S LOCAL timezone on purpose: a meeting at 00:30
// Riyadh time belongs to that local day even though its stored UTC timestamp
// is the previous evening. Day keys are plain local YYYY-MM-DD strings — the
// same convention as todayIsoLocal in lib/date.ts.

// The Saudi week starts on Sunday (the weekend is Fri–Sat) — used for grid
// alignment in both locales.
export const WEEK_STARTS_ON = 0;

export const DAYS_PER_WEEK = 7;

export type CalendarDay = {
  // Plain local YYYY-MM-DD — the grid cell's identity and selection key.
  dayKey: string;
  dayOfMonth: number;
  // False for the leading/trailing cells that pad the grid to full weeks.
  inMonth: boolean;
};

function toDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, monthIndex: monthNumber - 1 };
}

// Local YYYY-MM-DD day key for a stored ISO timestamp — buckets a meeting
// into the grid day the viewer experiences it on.
export function timestampDayKey(iso: string): string {
  return toDayKey(new Date(iso));
}

// Local YYYY-MM of "now" — the calendar's initial month.
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// YYYY-MM arithmetic for the month nav. Native Date normalizes overflow
// (month 13 → January next year), so this is just construct-and-read.
export function addMonths(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month);
  const next = new Date(year, monthIndex + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

// [start, end) ISO range covering the LOCAL month — feeds the scheduled_at
// range query so the fetched rows match exactly what the grid displays.
export function monthTimestampRange(month: string): { start: string; end: string } {
  const { year, monthIndex } = parseMonth(month);
  return {
    start: new Date(year, monthIndex, 1).toISOString(),
    end: new Date(year, monthIndex + 1, 1).toISOString(),
  };
}

// The grid cells for one month: full weeks from the week containing the 1st
// through the week containing the last day, each cell flagged in/out of month.
export function monthGridDays(month: string): CalendarDay[] {
  const { year, monthIndex } = parseMonth(month);
  const firstOfMonth = new Date(year, monthIndex, 1);
  const leadingPad = (firstOfMonth.getDay() - WEEK_STARTS_ON + DAYS_PER_WEEK) % DAYS_PER_WEEK;

  const days: CalendarDay[] = [];
  // Date-of-month overflow walks naturally across month boundaries.
  for (let offset = -leadingPad; ; offset += 1) {
    const date = new Date(year, monthIndex, 1 + offset);
    const inMonth = date.getMonth() === monthIndex && date.getFullYear() === year;
    const pastMonth = date.getTime() > firstOfMonth.getTime() && !inMonth;
    if (pastMonth && days.length % DAYS_PER_WEEK === 0) break;
    days.push({ dayKey: toDayKey(date), dayOfMonth: date.getDate(), inMonth });
  }
  return days;
}
