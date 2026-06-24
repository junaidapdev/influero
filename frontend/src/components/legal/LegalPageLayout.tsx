import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { useLocale } from "@/hooks/useLocale";
import { ROUTES } from "@/constants/routes";
import { SUPPORT_EMAIL } from "@/constants/support";
import { pick, type LegalDoc } from "@/features/legal/legalDoc";

// Standalone public renderer for any legal document (Privacy / Terms / Refund).
// Public (reachable logged-out, for Google's consent screen + LemonSqueezy), so it
// uses its own minimal chrome — a back link + a switch-only LocaleToggle (no DB
// write) — not the app's tab shell. RTL follows the app's <html dir>; logical
// classes (ps-*, text-start) mirror automatically.
type Props = { doc: LegalDoc };

export function LegalPageLayout({ doc }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={ROUTES.ROOT}
            className="text-sm font-semibold text-accent focus-visible:underline focus-visible:outline-none"
          >
            {t("legal.back")}
          </Link>
          <LocaleToggle />
        </div>

        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-text-primary">
            {pick(doc.title, locale)}
          </h1>
          <p className="text-caption text-text-muted">
            {t("legal.updated", { date: doc.updated })}
          </p>
        </header>

        <p className="text-body text-text-secondary">{pick(doc.intro, locale)}</p>

        <div className="flex flex-col gap-6">
          {doc.sections.map((section, i) => (
            <section key={i} className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-text-primary">
                {pick(section.heading, locale)}
              </h2>
              {section.paragraphs?.map((paragraph, j) => (
                <p key={j} className="text-body text-text-secondary">
                  {pick(paragraph, locale)}
                </p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-1 ps-5 text-body text-text-secondary">
                  {section.bullets.map((bullet, j) => (
                    <li key={j}>{pick(bullet, locale)}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <footer className="border-t border-border pt-4 text-body text-text-secondary">
          {t("legal.contactPrefix")}{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold text-accent focus-visible:underline focus-visible:outline-none"
            dir="ltr"
          >
            {SUPPORT_EMAIL}
          </a>
        </footer>
      </div>
    </main>
  );
}
