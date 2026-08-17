import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Handshake, Plus, SlidersHorizontal } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { HeaderIconButton } from "@/components/layout/HeaderIconButton";
import { DealListItem } from "@/components/deals/DealListItem";
import { DealForm } from "@/components/deals/DealForm";
import { DealsFilters } from "@/components/deals/DealsFilters";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useDeals, useDealsIndex, useCreateDeal, type DealFilters } from "@/hooks/useDeals";
import { useBrands } from "@/hooks/useBrands";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { useQuickAddOpen } from "@/hooks/useQuickAddOpen";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useUpgradeModal } from "@/hooks/useUpgradeModal";
import { localDayOfIso } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import { formatSar } from "@/lib/currency";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/constants/routes";
import {
  DEAL_STATUS,
  DELIVERABLE_TYPE,
  type Deal,
} from "@shared/types/deal.types";
import type { DealFormInput } from "@/features/deals/deal.schema";
import { isDealLimitError, isPro } from "@/features/billing/entitlement";
import type { Brand } from "@shared/types/brand.types";

const EMPTY_DEAL_FORM: DealFormInput = {
  brandId: "",
  title: "",
  deliverables: [{ type: DELIVERABLE_TYPE.STORY, count: "1" }],
  agreedAmount: "",
  shootDate: "",
  postDate: "",
  notes: "",
};

function DealsSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

// "How many done / how much pending" over the FILTERED result — filtering by a
// brand makes the rollup that brand's rollup, which is the useful reading.
// Done = posted or paid; pending money = agreed amounts not yet posted
// (pending / shot).
function getRollup(deals: Deal[]): { posted: number; pendingSar: number } {
  let posted = 0;
  let pendingSar = 0;
  for (const deal of deals) {
    if (deal.status === DEAL_STATUS.POSTED || deal.status === DEAL_STATUS.PAID) {
      posted += 1;
    }
    if (
      deal.status === DEAL_STATUS.PENDING ||
      deal.status === DEAL_STATUS.SHOT
    ) {
      pendingSar += deal.agreed_amount_sar;
    }
  }
  return { posted, pendingSar };
}

export function DealsRoute() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const [filters, setFilters] = useState<DealFilters>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  // The header funnel reveals the brand/month selects; the status chips stay
  // visible at all times.
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const dealsQuery = useDeals(filters);
  const indexQuery = useDealsIndex();
  const brandsQuery = useBrands();
  const createDeal = useCreateDeal();
  const entitlement = useEntitlement();
  const openUpgrade = useUpgradeModal();

  // FAB Quick Add → Deal opens this route's Add sheet (even if already here).
  const handleQuickAdd = useCallback(() => setSheetOpen(true), []);
  useQuickAddOpen(handleQuickAdd);

  const deals = dealsQuery.data ?? [];
  const brands = brandsQuery.data ?? [];
  const ready = !dealsQuery.isLoading && !dealsQuery.isError;
  const hasActiveFilters = Boolean(filters.brandId || filters.status || filters.month);

  const brandsById = useMemo(() => {
    const map = new Map<string, Brand>();
    for (const brand of brandsQuery.data ?? []) map.set(brand.id, brand);
    return map;
  }, [brandsQuery.data]);

  // Months that actually have deals, newest first, from the unfiltered index.
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    for (const row of indexQuery.data ?? []) {
      // effective_post_at (0028) is a timestamptz — bucket by its viewer-local
      // (Riyadh) month, matching the dashboard/reports RPCs (not the UTC month a
      // raw slice gives). Never null, so every deal contributes a month and the
      // dropdown can no longer omit a month the user actually has deals in.
      months.add(localDayOfIso(row.effective_post_at).slice(0, 7));
    }
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [indexQuery.data]);

  const rollup = getRollup(deals);
  // Free-tier usage hint: in-flight deals (pending/shot/posted) count toward the
  // 5-deal cap. Shown only when unfiltered, where `deals` is the full set.
  const pro = isPro(entitlement.data);
  const inFlightCount = deals.filter(
    (deal) =>
      deal.status === DEAL_STATUS.PENDING ||
      deal.status === DEAL_STATUS.SHOT ||
      deal.status === DEAL_STATUS.POSTED,
  ).length;

  function handleCreate(data: DealFormInput): void {
    createDeal.mutate(data, {
      onSuccess: (result) => {
        showToast(
          result.reminderFailed ? "deals.toast.createdReminderFailed" : "deals.toast.created",
          result.reminderFailed ? "error" : "success",
        );
        setSheetOpen(false);
      },
      onError: (error) => {
        logger.error("DealsRoute.create", error);
        // The free-tier deal-limit trigger raises DEAL_LIMIT — close the
        // (now-unusable) form sheet and pop the upgrade modal.
        if (isDealLimitError(error)) {
          setSheetOpen(false);
          openUpgrade("billing.upgradePrompt.deals");
          return;
        }
        showToast("deals.toast.error", "error");
      },
    });
  }

  return (
    <main className="min-h-dvh bg-background px-4 pb-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <PageHeader
          eyebrow={
            ready
              ? t("deals.count", { total: formatNumber(deals.length, locale) })
              : undefined
          }
          title={t("deals.title")}
          action={
            ready && (deals.length > 0 || hasActiveFilters) ? (
              <HeaderIconButton
                icon={SlidersHorizontal}
                label={t("deals.filters.toggle")}
                onClick={() => setAdvancedFiltersOpen((open) => !open)}
                active={hasActiveFilters}
              />
            ) : undefined
          }
        />

        {ready && (deals.length > 0 || hasActiveFilters) ? (
          <>
            <DealsFilters
              brands={brands}
              monthOptions={monthOptions}
              filters={filters}
              onChange={setFilters}
              advancedOpen={advancedFiltersOpen}
            />
            {indexQuery.isError || brandsQuery.isError ? (
              <p className="text-body text-text-muted">
                {t("deals.filtersUnavailable")}
              </p>
            ) : null}
            <p className="text-body text-text-secondary">
              {t("deals.rollup", {
                posted: formatNumber(rollup.posted, locale),
                amount: formatSar(rollup.pendingSar, locale),
              })}
            </p>
            {!pro && !hasActiveFilters ? (
              <Card className="flex flex-col gap-2">
                <p className="text-body font-semibold text-accent">
                  {t("billing.dealUsage", {
                    count: formatNumber(inFlightCount, locale),
                  })}
                </p>
                <p className="text-body text-text-secondary">
                  {t("billing.dealUsageHint")}
                </p>
                <button
                  type="button"
                  onClick={() => openUpgrade("billing.upgradePrompt.deals")}
                  className="inline-flex min-h-11 items-center self-start text-body font-semibold text-accent focus-visible:underline focus-visible:outline-none"
                >
                  {t("billing.upgrade")}
                </button>
              </Card>
            ) : null}
          </>
        ) : null}

        {dealsQuery.isLoading ? (
          <DealsSkeleton />
        ) : dealsQuery.isError ? (
          <Card>
            <p className="text-sm text-error-foreground">{t("deals.loadError")}</p>
          </Card>
        ) : deals.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState icon={Handshake} message={t("deals.empty.noMatches")} />
          ) : (
            <EmptyState
              icon={Handshake}
              message={t("deals.empty.message")}
              action={
                <Button onClick={() => setSheetOpen(true)}>
                  <Plus className="size-4" aria-hidden="true" />
                  {t("deals.empty.cta")}
                </Button>
              }
            />
          )
        ) : (
          <div className="flex flex-col gap-3">
            {deals.map((deal) => (
              <DealListItem
                key={deal.id}
                deal={deal}
                brand={brandsById.get(deal.brand_id)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("deals.addDeal")}
      >
        {brandsQuery.isError ? (
          <p className="text-sm text-error-foreground">{t("deals.brandsLoadError")}</p>
        ) : brands.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-text-secondary">{t("deals.needBrandFirst")}</p>
            <Link
              to={ROUTES.BRANDS}
              className="text-sm font-semibold text-accent focus-visible:underline focus-visible:outline-none"
            >
              {t("deals.goToBrands")}
            </Link>
          </div>
        ) : (
          <DealForm
            brands={brands}
            defaultValues={EMPTY_DEAL_FORM}
            onSubmit={handleCreate}
            isSubmitting={createDeal.isPending}
            submitLabel={t("deals.actions.add")}
          />
        )}
      </BottomSheet>
    </main>
  );
}
