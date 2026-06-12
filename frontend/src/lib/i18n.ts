import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";
import {
  DEFAULT_LOCALE,
  DIRECTION,
  LOCALES,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/constants/locale";

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === LOCALES.AR || stored === LOCALES.EN ? stored : DEFAULT_LOCALE;
}

// `<html lang>` drives the active font (Inter vs Tajawal) and `<html dir>`
// flips the whole layout via logical utilities — so both must follow the locale.
function applyDocumentDirection(locale: Locale): void {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = DIRECTION[locale];
}

const initialLocale = readStoredLocale();

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: en },
    ar: { common: ar },
  },
  lng: initialLocale,
  fallbackLng: LOCALES.EN,
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

applyDocumentDirection(initialLocale);

i18n.on("languageChanged", (lng) => {
  const next: Locale = lng === LOCALES.AR ? LOCALES.AR : LOCALES.EN;
  localStorage.setItem(LOCALE_STORAGE_KEY, next);
  applyDocumentDirection(next);
});

export { i18n };
