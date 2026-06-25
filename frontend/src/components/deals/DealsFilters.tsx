import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { FilterChips } from "@/components/ui/FilterChips";
import { Label } from "@/components/ui/Label";
import { useLocale } from "@/hooks/useLocale";
import { formatMonthYear } from "@/lib/date";
import { DEAL_STATUS } from "@shared/types/deal.types";
import type { DealFilters } from "@/hooks/useDeals";
import type { Brand } from "@shared/types/brand.types";

type Props = {
  brands: Brand[];
  // YYYY-MM values derived from the deals index — only months that actually
  // have deals, so the filter can never select an empty month.
  monthOptions: string[];
  filters: DealFilters;
  onChange: (next: DealFilters) => void;
  // The status chips are always visible; the brand/month selects are revealed
  // by the header funnel (kept collapsed by default so the list breathes).
  advancedOpen: boolean;
};

// Status chips in pipeline order: See all · To-do · Shot · Posted · Paid. No
// Cancelled chip — cancelled deals surface under "See all".
const STATUS_CHIPS = [
  "all",
  DEAL_STATUS.PENDING,
  DEAL_STATUS.SHOT,
  DEAL_STATUS.POSTED,
  DEAL_STATUS.PAID,
] as const;

type StatusChip = (typeof STATUS_CHIPS)[number];

// The search-controls card: status as scrollable segmented chips (ui-rules wins
// over build-plan's "status dropdown" on form factor), brand and month as
// native selects. Filter state lives in the parent — it feeds the DB query.
export function DealsFilters({
  brands,
  monthOptions,
  filters,
  onChange,
  advancedOpen,
}: Props) {
  const { t } = useTranslation();
  const { locale, isArabic } = useLocale();

  // cancelled has no chip — it can't be set from this UI, but the type allows
  // it, so it (and undefined) collapse to "See all".
  const activeChip: StatusChip =
    !filters.status || filters.status === DEAL_STATUS.CANCELLED
      ? "all"
      : filters.status;

  return (
    <div className="flex flex-col gap-3">
      <FilterChips
        items={STATUS_CHIPS.map((chip) => ({
          value: chip,
          label:
            chip === "all" ? t("deals.filters.allStatuses") : t(`deals.status.${chip}`),
        }))}
        value={activeChip}
        onChange={(chip) =>
          onChange({ ...filters, status: chip === "all" ? undefined : chip })
        }
        label={t("deals.filters.statusLabel")}
      />

      {advancedOpen ? (
        <Card className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="deals-filter-brand">{t("deals.filters.brand")}</Label>
            <Select
              id="deals-filter-brand"
              value={filters.brandId ?? ""}
              onChange={(event) =>
                onChange({ ...filters, brandId: event.target.value || undefined })
              }
            >
              <option value="">{t("deals.filters.allBrands")}</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {isArabic ? brand.name_ar : brand.name_en}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="deals-filter-month">{t("deals.filters.month")}</Label>
            <Select
              id="deals-filter-month"
              value={filters.month ?? ""}
              onChange={(event) =>
                onChange({ ...filters, month: event.target.value || undefined })
              }
            >
              <option value="">{t("deals.filters.allMonths")}</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthYear(month, locale)}
                </option>
              ))}
            </Select>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
