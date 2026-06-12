import { LOCALES, type Locale } from "@/constants/locale";

// Hijri + Gregorian dual-date formatter (pulled forward from Feature 03 — the
// deal deadline is its first real consumer). Dates are STORED as ISO/Gregorian
// (UTC) and only ever displayed through here; components never format dates
// ad-hoc. Hijri leads in Arabic, Gregorian leads in English, the other renders
// beneath in small muted text (ui-rules "Typography Hierarchy").
//
// Calendars are forced explicitly (-u-ca-…) because ar-SA's DEFAULT calendar
// has flipped between islamic and gregorian across CLDR versions — never rely
// on it. Plain dates (YYYY-MM-DD, e.g. a deadline) parse as UTC midnight, so
// formatting pins timeZone: "UTC" — otherwise a viewer west of UTC would see
// the previous day.

const HIJRI_LOCALE: Record<Locale, string> = {
  [LOCALES.AR]: "ar-SA-u-ca-islamic-umalqura",
  [LOCALES.EN]: "en-US-u-ca-islamic-umalqura",
};

const GREGORIAN_LOCALE: Record<Locale, string> = {
  [LOCALES.AR]: "ar-SA-u-ca-gregory",
  [LOCALES.EN]: "en-US-u-ca-gregory",
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
};

export type DualDate = {
  primary: string;
  secondary: string;
};

// Label for a YYYY-MM month value (the deals month filter) — "June 2026" /
// "يونيو ٢٠٢٦". Gregorian only: the filter buckets by Gregorian deadline month,
// and Hijri months don't align with those boundaries, so a Hijri label would
// mislabel the bucket.
export function formatMonthYear(month: string, locale: Locale): string {
  return new Intl.DateTimeFormat(GREGORIAN_LOCALE[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01`));
}

// Short Gregorian month label for a YYYY-MM value — "Jun" / "يونيو". Gregorian
// only, same rationale as formatMonthYear: month buckets are Gregorian, and a
// Hijri month label wouldn't align with the bucket. For the Reports monthly
// chart X axis, where the full "June 2026" is too wide.
export function formatMonthShort(month: string, locale: Locale): string {
  return new Intl.DateTimeFormat(GREGORIAN_LOCALE[locale], {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${month}-01`));
}

// Today as a plain YYYY-MM-DD in the VIEWER'S local calendar day — for
// comparing against stored plain dates (e.g. a payment's expected_date).
// Deliberately not toISOString().slice(): that yields the UTC day, which is
// yesterday/tomorrow for part of every day in Saudi Arabia (UTC+3).
export function todayIsoLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Dual date for a stored TIMESTAMP (e.g. a meeting's scheduled_at) — same
// Hijri/Gregorian pairing as formatDualDate but rendered in the VIEWER'S LOCAL
// timezone, not UTC: a meeting at 00:30 Riyadh time must show its local day,
// and pinning UTC (correct for plain YYYY-MM-DD dates) would shift it.
export function formatDualTimestampDate(iso: string, locale: Locale): DualDate {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const hijri = new Intl.DateTimeFormat(HIJRI_LOCALE[locale], options).format(date);
  const gregorian = new Intl.DateTimeFormat(GREGORIAN_LOCALE[locale], options).format(
    date,
  );
  return locale === LOCALES.AR
    ? { primary: hijri, secondary: gregorian }
    : { primary: gregorian, secondary: hijri };
}

// Clock time of a stored timestamp in the viewer's local timezone — locale
// digits and 12/24-hour convention come from Intl.
export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(GREGORIAN_LOCALE[locale], {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Short weekday labels for the calendar header, starting on the given weekday
// (0 = Sunday — the Saudi week). 2023-01-01 is a known Sunday; formatting it
// (+i days) in UTC yields locale-correct names without local-tz drift.
export function weekdayLabels(locale: Locale, weekStartsOn: number): string[] {
  const formatter = new Intl.DateTimeFormat(GREGORIAN_LOCALE[locale], {
    weekday: "short",
    timeZone: "UTC",
  });
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(2023, 0, 1 + weekStartsOn + index))),
  );
}

// A stored ISO timestamp as a <input type="datetime-local"> value — the
// viewer's LOCAL wall-clock time, no timezone suffix (the input rejects one).
// Inverse of the write layer's new Date(value).toISOString().
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDualDate(isoDate: string, locale: Locale): DualDate {
  const date = new Date(isoDate);
  const hijri = new Intl.DateTimeFormat(HIJRI_LOCALE[locale], DATE_OPTIONS).format(
    date,
  );
  const gregorian = new Intl.DateTimeFormat(
    GREGORIAN_LOCALE[locale],
    DATE_OPTIONS,
  ).format(date);

  return locale === LOCALES.AR
    ? { primary: hijri, secondary: gregorian }
    : { primary: gregorian, secondary: hijri };
}
