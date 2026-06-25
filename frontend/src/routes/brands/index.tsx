import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Store } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { HeaderIconButton } from "@/components/layout/HeaderIconButton";
import { BrandListItem } from "@/components/brands/BrandListItem";
import { BrandForm } from "@/components/brands/BrandForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBrands, useCreateBrand } from "@/hooks/useBrands";
import { useDealsIndex } from "@/hooks/useDeals";
import { useQuickAddOpen } from "@/hooks/useQuickAddOpen";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/numbers";
import { logger } from "@/lib/logger";
import type { BrandFormInput } from "@/features/brands/brand.schema";

const EMPTY_BRAND_FORM: BrandFormInput = {
  nameEn: "",
  nameAr: "",
  category: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

function BrandsSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function BrandsRoute() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const brandsQuery = useBrands();
  const dealsIndexQuery = useDealsIndex();
  const createBrand = useCreateBrand();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Open the Add sheet when reached via the FAB Quick Add → Brand tile (the
  // pattern Deals/Meetings/Payments use). Stable callback — it's an effect dep.
  useQuickAddOpen(useCallback(() => setSheetOpen(true), []));

  const brands = brandsQuery.data ?? [];
  const ready = !brandsQuery.isLoading && !brandsQuery.isError;

  // Per-brand deal counts grouped client-side from the one lightweight index
  // query — never a count query per brand row (the N+1 the architecture
  // forbids). undefined while in flight → the row keeps its em-dash slot.
  const dealCounts = useMemo(() => {
    if (!dealsIndexQuery.data) return undefined;
    const counts = new Map<string, number>();
    for (const row of dealsIndexQuery.data) {
      counts.set(row.brand_id, (counts.get(row.brand_id) ?? 0) + 1);
    }
    return counts;
  }, [dealsIndexQuery.data]);

  function handleCreate(data: BrandFormInput): void {
    createBrand.mutate(data, {
      onSuccess: () => {
        showToast("brands.toast.created", "success");
        setSheetOpen(false);
      },
      onError: (error) => {
        logger.error("BrandsRoute.create", error);
        showToast("brands.toast.error", "error");
      },
    });
  }

  return (
    <main className="min-h-dvh bg-background px-4 pb-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <PageHeader
          eyebrow={
            ready
              ? t("brands.count", { total: formatNumber(brands.length, locale) })
              : undefined
          }
          title={t("brands.title")}
          action={
            ready && brands.length > 0 ? (
              <HeaderIconButton
                icon={Plus}
                label={t("brands.addBrand")}
                onClick={() => setSheetOpen(true)}
              />
            ) : undefined
          }
        />

        {brandsQuery.isLoading ? (
          <BrandsSkeleton />
        ) : brandsQuery.isError ? (
          <Card>
            <p className="text-sm text-error-foreground">{t("brands.loadError")}</p>
          </Card>
        ) : brands.length === 0 ? (
          <EmptyState
            icon={Store}
            message={t("brands.empty.message")}
            action={
              <Button onClick={() => setSheetOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                {t("brands.empty.cta")}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {dealsIndexQuery.isError ? (
              <p className="text-body text-text-muted">
                {t("brands.dealCountsUnavailable")}
              </p>
            ) : null}
            {brands.map((brand) => (
              <BrandListItem
                key={brand.id}
                brand={brand}
                dealCount={dealCounts ? (dealCounts.get(brand.id) ?? 0) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("brands.addBrand")}
      >
        <BrandForm
          defaultValues={EMPTY_BRAND_FORM}
          onSubmit={handleCreate}
          isSubmitting={createBrand.isPending}
          submitLabel={t("brands.actions.add")}
        />
      </BottomSheet>
    </main>
  );
}
