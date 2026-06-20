import { lazy, Suspense, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BarChart3, Building2 } from "lucide-react";

import { PerBrandReportItem } from "@/components/reports/PerBrandReportItem";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useMonthlyTotals, usePerBrandReport } from "@/hooks/useReports";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useUpgradeModal } from "@/hooks/useUpgradeModal";
import { ROUTES } from "@/constants/routes";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { isPro } from "@/features/billing/entitlement";

// Lazy so recharts (a heavy dep) lands in its own chunk instead of the main
// bundle — the pdf.js precedent. /reports is a single leaf page, so paying the
// chart's download cost only when it's opened is the right trade. (The dashboard
// sparkline is hand-rolled SVG precisely to keep this chunk off the landing page.)
const MonthlyTotalsChart = lazy(() =>
  import("@/components/reports/MonthlyTotalsChart").then((module) => ({
    default: module.MonthlyTotalsChart,
  })),
);

// Chart-shaped pulse — shared by the query-loading state and the lazy-chunk
// Suspense fallback so both read the same height.
function ChartSkeleton() {
  return (
    <div
      className="h-60 w-full animate-pulse rounded-lg bg-border motion-reduce:animate-none"
      role="status"
      aria-busy="true"
    />
  );
}

function PerBrandSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-[78px] animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

// Reports — Monthly & Per-Brand (Feature 16). Two stacked sections: the monthly
// invoiced-vs-collected bar chart (last 12 months) and the per-brand
// collection-rate list (all-time). Both wired to server-side aggregate RPCs
// (0011) via useMonthlyTotals / usePerBrandReport — each owns its
// loading / error / empty / populated states here, the MonthTotalsBar pattern.
export function ReportsRoute() {
  const { t } = useTranslation();
  const monthly = useMonthlyTotals();
  const perBrand = usePerBrandReport();
  const entitlement = useEntitlement();
  const openUpgrade = useUpgradeModal();

  // The RPC always returns 12 month rows (empty months as 0), so "empty" means
  // every month is genuinely zero — show the empty state, not a flat-zero chart.
  const monthlyHasData =
    monthly.data?.some(
      (row) => row.invoicedSar > 0 || row.collectedSar > 0,
    ) ?? false;

  // Reports are Pro-only, gated in the UI on purpose — the underlying aggregate
  // RPC is shared with the free dashboard sparkline, so it stays callable. The
  // modal pops when a free user lands here; the card behind re-opens it.
  const gated = !entitlement.isLoading && !isPro(entitlement.data);
  useEffect(() => {
    if (gated) openUpgrade("billing.upgradePrompt.reports");
  }, [gated, openUpgrade]);

  if (gated) {
    return (
      <main className="min-h-dvh bg-background px-4 py-8">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
          <InsightsTabs />
          <h1 className="text-2xl font-bold text-text-primary">{t("reports.title")}</h1>
          <UpgradePrompt messageKey="billing.upgradePrompt.reports" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <InsightsTabs />

        <h1 className="text-2xl font-bold text-text-primary">{t("reports.title")}</h1>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {t("reports.monthly.title")}
            </h2>
            <p className="text-body text-text-secondary">{t("reports.period")}</p>
          </div>
          <Card>
            {monthly.isLoading ? (
              <ChartSkeleton />
            ) : monthly.isError ? (
              <p className="text-sm text-error-foreground">{t("reports.loadError")}</p>
            ) : !monthlyHasData ? (
              <EmptyState icon={BarChart3} message={t("reports.monthly.empty")} />
            ) : (
              <Suspense fallback={<ChartSkeleton />}>
                <MonthlyTotalsChart data={monthly.data ?? []} />
              </Suspense>
            )}
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            {t("reports.perBrand.title")}
          </h2>
          {perBrand.isLoading ? (
            <PerBrandSkeleton />
          ) : perBrand.isError ? (
            <Card>
              <p className="text-sm text-error-foreground">{t("reports.loadError")}</p>
            </Card>
          ) : !perBrand.data || perBrand.data.length === 0 ? (
            <Card>
              <EmptyState
                icon={Building2}
                message={t("reports.perBrand.empty")}
                action={
                  <Link
                    to={ROUTES.DEALS}
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-accent focus-visible:underline focus-visible:outline-none"
                  >
                    {t("reports.perBrand.emptyCta")}
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {perBrand.data.map((row) => (
                <PerBrandReportItem key={row.brand.id} row={row} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
