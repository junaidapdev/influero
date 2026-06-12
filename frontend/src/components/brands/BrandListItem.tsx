import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

import { BrandAvatar } from "@/components/brands/BrandAvatar";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/numbers";
import { brandPath } from "@/constants/routes";
import type { Brand } from "@shared/types/brand.types";

type Props = {
  brand: Brand;
  // Count of ALL this brand's deals (any status), grouped client-side by the
  // parent from the deals index — undefined while that query is in flight.
  dealCount: number | undefined;
};

// Directory row card. The whole card is the tap target → brand detail. Leading
// avatar, the active-locale name as the title with the other-locale name beneath,
// the contact name (when present) on a muted third line, the deal count, and a
// trailing chevron that mirrors with direction.
export function BrandListItem({ brand, dealCount }: Props) {
  const { t } = useTranslation();
  const { locale, isArabic } = useLocale();
  const primaryName = isArabic ? brand.name_ar : brand.name_en;
  const secondaryName = isArabic ? brand.name_en : brand.name_ar;

  return (
    <Link
      to={brandPath(brand.id)}
      className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <BrandAvatar brand={brand} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-row font-semibold text-text-primary">
          {primaryName}
        </p>
        <p className="truncate text-body text-text-secondary">{secondaryName}</p>
        {brand.contact_name ? (
          <p className="truncate text-caption text-text-muted">{brand.contact_name}</p>
        ) : null}
      </div>
      {dealCount === undefined ? (
        <span className="text-body font-medium text-text-muted" aria-hidden="true">
          —
        </span>
      ) : (
        <span className="shrink-0 text-body font-medium text-text-muted">
          {t("brands.dealCount", { total: formatNumber(dealCount, locale) })}
        </span>
      )}
      <ChevronRight
        className="size-5 shrink-0 text-text-muted rtl:-scale-x-100"
        aria-hidden="true"
      />
    </Link>
  );
}
