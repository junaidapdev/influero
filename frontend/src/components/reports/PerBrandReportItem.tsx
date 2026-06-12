import { useTranslation } from "react-i18next";

import { BrandAvatar } from "@/components/brands/BrandAvatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useLocale } from "@/hooks/useLocale";
import { formatSar } from "@/lib/currency";
import { formatNumber, formatPercent } from "@/lib/numbers";
import { collectionRate } from "@/features/dashboard/stats";
import type { PerBrandRow } from "@/features/reports/report";

type Props = {
  row: PerBrandRow;
};

// One brand's row in the per-brand report (Feature 16). A static row card (not a
// Link — there's no per-brand-report detail route), shaped like BrandListItem
// with no leading stripe (brand rows aren't status-coded). The collection-rate
// bar fills with success (money realized, ui-rules); the shared collectionRate
// guard yields an em dash when nothing was invoiced — never NaN/Infinity.
export function PerBrandReportItem({ row }: Props) {
  const { t } = useTranslation();
  const { locale, isArabic } = useLocale();

  const name = isArabic ? row.brand.name_ar : row.brand.name_en;
  const rate = collectionRate(row.collectedSar, row.invoicedSar);
  const percent = rate === null ? 0 : rate * 100;
  const rateLabel = rate === null ? "—" : formatPercent(rate, locale);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-card">
      <div className="flex items-center gap-3">
        <BrandAvatar brand={row.brand} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-row font-semibold text-text-primary">
            {name}
          </p>
          <p className="money truncate text-body text-text-secondary">
            {t("reports.perBrand.summary", {
              deals: formatNumber(row.dealCount, locale),
              amount: formatSar(row.invoicedSar, locale),
            })}
          </p>
        </div>
        <span
          className="shrink-0 text-body font-semibold text-text-primary"
          aria-label={t("reports.perBrand.rateAria", { rate: rateLabel })}
        >
          {rateLabel}
        </span>
      </div>
      <ProgressBar percent={percent} fill="success" />
    </div>
  );
}
