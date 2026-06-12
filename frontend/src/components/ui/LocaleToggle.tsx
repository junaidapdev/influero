import { useTranslation } from "react-i18next";

import { useLocale } from "@/hooks/useLocale";
import { LOCALES, type Locale } from "@/constants/locale";

const OPTIONS: readonly Locale[] = [LOCALES.AR, LOCALES.EN];

type Props = {
  // Optional: fires after the live i18n switch so a caller (Settings) can persist
  // the choice. Login uses the toggle with no handler — switch-only.
  onLocaleChange?: (next: Locale) => void;
};

// Segmented control (the project's one tab pattern), reused later for
// Pending/Received, List/Month, etc. Here it lets a user pick their language
// before signing in.
export function LocaleToggle({ onLocaleChange }: Props) {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  function handleSelect(next: Locale): void {
    setLocale(next);
    onLocaleChange?.(next);
  }

  return (
    <div
      role="group"
      aria-label={t("locale.switch")}
      className="inline-flex rounded-md bg-surface-muted p-1"
    >
      {OPTIONS.map((option) => {
        const isActive = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => handleSelect(option)}
            aria-pressed={isActive}
            className={`min-h-11 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive ? "bg-surface text-accent shadow-card" : "text-text-secondary"
            }`}
          >
            {t(`locale.${option}`)}
          </button>
        );
      })}
    </div>
  );
}
