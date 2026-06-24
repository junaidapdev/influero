import { LOCALES, type Locale } from "@/constants/locale";

// Legal documents (Privacy / Terms / Refund) are authored as structured bilingual
// data — EN + AR on every node — rather than i18n-catalog prose, because long-form
// policy text doesn't belong in the UI string catalog. LegalPageLayout renders any
// LegalDoc; the route files just supply the doc.
//
// ⚠️ DRAFT: this content is a plain-language starting point, NOT legal advice. Have
// it reviewed by a qualified lawyer (PDPL / consumer law) before relying on it.

export type Bilingual = { en: string; ar: string };

export type LegalSection = {
  heading: Bilingual;
  // Zero or more paragraphs, then an optional bulleted list (e.g. sub-processors).
  paragraphs?: Bilingual[];
  bullets?: Bilingual[];
};

export type LegalDoc = {
  title: Bilingual;
  updated: string; // ISO date, shown verbatim
  intro: Bilingual;
  sections: LegalSection[];
};

// Resolve a bilingual node to the active locale's string.
export function pick(value: Bilingual, locale: Locale): string {
  return locale === LOCALES.AR ? value.ar : value.en;
}
