import { LOCALES, type Locale } from "@/constants/locale";
import { formatNumber } from "@/lib/numbers";
import {
  SNAP_METRIC_UNIT,
  type SnapMetricUnit,
} from "@shared/analytics/snapMetricDictionary";

// Renders a Snap metric value in its dictionary UNIT, localized. Counts go
// through the shared formatNumber; minutes/hours/seconds and percent use Intl
// so the unit word ("min" / "دقيقة") and the percent symbol (% / ٪) follow the
// locale instead of being concatenated by hand. The dictionary's unit is the
// only thing that decides the rendering — labels never live in a component.

const INTL_LOCALE: Record<Locale, string> = {
  [LOCALES.AR]: "ar-SA",
  [LOCALES.EN]: "en-US",
};

const UNIT_TO_INTL: Partial<Record<SnapMetricUnit, string>> = {
  [SNAP_METRIC_UNIT.SECONDS]: "second",
  [SNAP_METRIC_UNIT.MINUTES]: "minute",
  [SNAP_METRIC_UNIT.HOURS]: "hour",
};

export function formatSnapMetricValue(
  value: number,
  unit: SnapMetricUnit,
  locale: Locale,
): string {
  if (unit === SNAP_METRIC_UNIT.COUNT) return formatNumber(value, locale);
  if (unit === SNAP_METRIC_UNIT.PERCENT) {
    return new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value / 100);
  }
  const intlUnit = UNIT_TO_INTL[unit];
  if (!intlUnit) return formatNumber(value, locale);
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "unit",
    unit: intlUnit,
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

// The "vs Previous 28 Days" change, signed + localized ("+6.7%" / "−4٪").
// The metric value is stored as a percent number (6.7 = +6.7%), so divide by
// 100 for Intl's percent style.
export function formatSnapChangePct(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    signDisplay: "exceptZero",
    maximumFractionDigits: 1,
  }).format(value / 100);
}

// The change MAGNITUDE, unsigned ("6.7%" / "٦٫٧٪") — for the export card's pills,
// which convey direction with an up/down arrow + color instead of a +/− sign.
// (formatSnapChangePct keeps the sign for the inline edit-sheet rows.)
export function formatSnapChangeMagnitude(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    signDisplay: "never",
    maximumFractionDigits: 1,
  }).format(Math.abs(value) / 100);
}
