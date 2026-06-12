import { useTranslation } from "react-i18next";

import { LOCALES, type Locale } from "@/constants/locale";

type UseLocale = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  isArabic: boolean;
};

// Thin wrapper over i18next's active language. Switching here triggers the
// `languageChanged` listener in lib/i18n.ts, which persists the choice and
// updates `<html lang/dir>`.
export function useLocale(): UseLocale {
  const { i18n } = useTranslation();
  const locale: Locale = i18n.language === LOCALES.AR ? LOCALES.AR : LOCALES.EN;

  function setLocale(next: Locale): void {
    void i18n.changeLanguage(next);
  }

  return { locale, setLocale, isArabic: locale === LOCALES.AR };
}
