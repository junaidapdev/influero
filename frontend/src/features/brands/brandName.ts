// The localized brand-name pick (React-free, Supabase-free per the features/
// boundary) — the same active-locale-first rule BrandListItem renders with,
// extracted for callers that need the name as a VALUE (the snap report card's
// brand line) rather than a layout of both names.

import { LOCALES, type Locale } from "@/constants/locale";

export function localizedBrandName(
  brand: { name_en: string; name_ar: string },
  locale: Locale,
): string {
  return locale === LOCALES.AR ? brand.name_ar : brand.name_en;
}
