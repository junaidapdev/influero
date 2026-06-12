// Locale + direction constants. Arabic-first: the default is `ar` / RTL.
export const LOCALES = {
  AR: "ar",
  EN: "en",
} as const;

export type Locale = (typeof LOCALES)[keyof typeof LOCALES];

export const DEFAULT_LOCALE: Locale = LOCALES.AR;

export const LOCALE_STORAGE_KEY = "influency.locale";

export const DIRECTION: Record<Locale, "rtl" | "ltr"> = {
  [LOCALES.AR]: "rtl",
  [LOCALES.EN]: "ltr",
};
