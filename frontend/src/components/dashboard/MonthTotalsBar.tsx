import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { CompletionRing } from "@/components/dashboard/CompletionRing";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { Card } from "@/components/ui/Card";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useMonthlyTotals } from "@/hooks/useReports";
import { useLocale } from "@/hooks/useLocale";
import { formatSar } from "@/lib/currency";
import { formatNumber, formatPercent } from "@/lib/numbers";
import { formatMonthYear } from "@/lib/date";
import { collectionRate } from "@/features/dashboard/stats";
import { ROUTES } from "@/constants/routes";

type Props = {
  // Local YYYY-MM (features/meetings/calendar.currentMonth) — the route owns
  // it so the title row's month label and the stats agree.
  month: string;
};

// The hero "This Month" gradient — ui-tokens: the ONLY gradient surface in the
// app. The stops are tokens; the gradient itself can't be a generated utility,
// so it's composed inline from the CSS variables.
const HERO_GRADIENT = {
  background:
    "linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))",
} as const;

type TileProps = {
  stripe: string;
  caption: string;
  value: string;
  // The page where this number is managed — money tiles go to /payments, the
  // posted-deals count to /deals. Makes each tile a labelled entry point.
  to: string;
  ariaLabel: string;
};

// One stat tile under the hero — ui-tokens "Stat Tiles": a 2px colored top
// stripe + a single bold number + a muted caption. The whole tile is a link.
function StatTile({ stripe, caption, value, to, ariaLabel }: TileProps) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className="block overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className={`h-0.5 ${stripe}`} aria-hidden="true" />
      <div className="p-3">
        <p className="money truncate text-lg font-bold text-text-primary">{value}</p>
        <p className="text-xs text-text-secondary">{caption}</p>
      </div>
    </Link>
  );
}

function TotalsSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      <div className="h-40 animate-pulse rounded-2xl bg-border motion-reduce:animate-none" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}

// The five top-line month numbers (Feature 14): Total Invoiced headlines the
// hero card with the collection-rate ring (collected ÷ invoiced, em dash when
// nothing was invoiced — never NaN) and the posted/pending line; Collected,
// Outstanding, and Posted take the three stat tiles from the ui-tokens table.
// Self-contained: fetches via useDashboardStats and owns its loading/error
// states (the IncompleteProfileBanner pattern).
export function MonthTotalsBar({ month }: Props) {
  const { t } = useTranslation();
  const { locale, isArabic } = useLocale();
  const statsQuery = useDashboardStats(month);
  // Shared with /reports (same REPORTS cache key) — feeds the hero trend line.
  // Independent of the stats query: the sparkline simply stays absent until this
  // resolves, so it never blocks or skeletons the hero.
  const monthlyQuery = useMonthlyTotals();

  if (statsQuery.isLoading) return <TotalsSkeleton />;
  if (statsQuery.isError || !statsQuery.data) {
    return (
      <Card>
        <p className="text-sm text-error-foreground">{t("dashboard.loadError")}</p>
      </Card>
    );
  }

  const stats = statsQuery.data;
  const rate = collectionRate(stats.total_collected, stats.total_invoiced);
  // Only draw the trend when there's something to show — an all-zero flat line
  // reads as noise, so hide it until at least one month has been invoiced. The
  // sparkline is decorative and non-blocking: on a failed useMonthlyTotals we
  // intentionally hide it (no error UI belongs on the hero gradient) rather than
  // let the failure fall through implicitly — the error is handled, just silent.
  const trendValues =
    !monthlyQuery.isError &&
    monthlyQuery.data?.some((row) => row.invoicedSar > 0)
      ? monthlyQuery.data.map((row) => row.invoicedSar)
      : null;

  return (
    <div className="flex flex-col gap-3">
      <section
        className="relative overflow-hidden rounded-2xl p-5 text-text-on-accent shadow-hero"
        style={HERO_GRADIENT}
      >
        {/* Soft decorative disc bleeding off the trailing-top corner. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -end-10 size-40 rounded-full bg-text-on-accent/10"
        />

        <div className="relative flex items-center justify-between gap-3">
          <p className="text-body font-medium opacity-90">
            {t("dashboard.hero.label")}
          </p>
          <span className="rounded-full bg-text-on-accent/15 px-3 py-1 text-caption font-medium">
            {formatMonthYear(month, locale)}
          </span>
        </div>

        <div className="relative mt-5 flex items-center gap-4">
          <CompletionRing
            percent={rate === null ? 0 : rate * 100}
            label={rate === null ? "—" : formatPercent(rate, locale)}
            caption={t("dashboard.hero.collectionRate")}
            labelClassName="text-2xl font-bold"
            size={116}
            strokeWidth={9}
            tone="onAccent"
          />
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium opacity-80">
              {t("dashboard.hero.invoiced")}
            </p>
            <p className="money mt-0.5 truncate text-hero font-bold">
              {formatSar(stats.total_invoiced, locale)}
            </p>
            {trendValues && (
              <div className="mt-2">
                <Sparkline
                  values={trendValues}
                  label={t("dashboard.hero.trend")}
                  reversed={isArabic}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <Link
          to={ROUTES.PAYMENTS}
          className="inline-flex items-center gap-1 self-end rounded text-caption font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t("dashboard.viewPayments")}
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>

        <div className="grid grid-cols-3 gap-3">
          <StatTile
            stripe="bg-success"
            caption={t("dashboard.tiles.collected")}
            value={formatSar(stats.total_collected, locale)}
            to={ROUTES.PAYMENTS}
            ariaLabel={`${t("dashboard.tiles.collected")} · ${t("dashboard.viewPayments")}`}
          />
          <StatTile
            stripe="bg-warning"
            caption={t("dashboard.tiles.outstanding")}
            value={formatSar(stats.outstanding, locale)}
            to={ROUTES.PAYMENTS}
            ariaLabel={`${t("dashboard.tiles.outstanding")} · ${t("dashboard.viewPayments")}`}
          />
          <StatTile
            stripe="bg-accent"
            caption={t("dashboard.tiles.posted")}
            value={formatNumber(stats.deals_posted, locale)}
            to={ROUTES.DEALS}
            ariaLabel={`${t("dashboard.tiles.posted")} · ${t("dashboard.viewDeals")}`}
          />
        </div>
      </div>
    </div>
  );
}
