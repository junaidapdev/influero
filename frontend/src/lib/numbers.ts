import { LOCALES, type Locale } from "@/constants/locale";

// Maps the app locale to the BCP-47 tag whose digits and symbols we want:
// ar → Arabic-Indic digits and the Arabic percent sign (٪); en → Western.
const INTL_LOCALE: Record<Locale, string> = {
  [LOCALES.AR]: "ar-SA",
  [LOCALES.EN]: "en-US",
};

// Whole-number percent from a 0–1 fraction, localized (0.5 → "50%" / "٥٠٪").
// Intl handles both the digits and the percent symbol per locale, so callers
// never concatenate "%" by hand.
export function formatPercent(fraction: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(fraction);
}

// Locale-aware number formatting (8 → "8" / "٨"). Use for any count or quantity
// so digits follow the active locale; never stringify a number by hand.
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

// Normalizes Arabic-Indic (٠–٩, U+0660–0669) and Extended/Persian (۰–۹,
// U+06F0–06F9) digits to ASCII 0–9, plus the Arabic decimal separator (٫,
// U+066B) to a dot — so a decimal value typed on an Arabic keypad (e.g. ١٢٫٥)
// validates and parses like Western input (12.5). Without the separator step,
// digit-only normalization left "12٫5", which still failed every numeric
// pattern. All other characters pass through unchanged.
export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩۰-۹]/g, (char) => {
      const code = char.charCodeAt(0);
      const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
      return String(code - base);
    })
    .replace(/٫/g, ".");
}

// Compact, locale-aware number (20000 → "20K" / "٢٠ ألف"). For dense axes where
// a full grouped number would overflow — the Reports monthly-chart Y axis (its
// first consumer). Money axes pass the raw SAR amount; the currency symbol is
// dropped on purpose (the axis is a magnitude scale, the tooltip carries SAR).
export function formatCompactNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
