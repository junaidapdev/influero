import { LOCALES, type Locale } from "@/constants/locale";

// SAR currency formatter (pulled forward from Feature 03 — the deal agreed
// amount is its first real consumer). Money is only ever displayed through
// here, rendered with the `.money` class for tabular figures; components never
// concatenate "SAR" + number by hand. currencyDisplay "code" matches the mocks
// ("SAR 19,000"); Intl owns digits, grouping, and placement per locale.

const INTL_LOCALE: Record<Locale, string> = {
  [LOCALES.AR]: "ar-SA",
  [LOCALES.EN]: "en-US",
};

export function formatSar(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "SAR",
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
