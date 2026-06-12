import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pencil } from "lucide-react";

import { BrandAvatar } from "@/components/brands/BrandAvatar";
import { BrandForm } from "@/components/brands/BrandForm";
import { DealListItem } from "@/components/deals/DealListItem";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBrand, useUpdateBrand } from "@/hooks/useBrands";
import { useDealsForBrand } from "@/hooks/useDeals";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/numbers";
import { formatSar } from "@/lib/currency";
import { formatDualTimestampDate } from "@/lib/date";
import { getBrandRollup } from "@/features/brands/rollup";
import { ROUTES } from "@/constants/routes";
import { logger } from "@/lib/logger";
import type { BrandFormInput } from "@/features/brands/brand.schema";
import type { Brand } from "@shared/types/brand.types";

function brandToFormInput(brand: Brand): BrandFormInput {
  return {
    nameEn: brand.name_en,
    nameAr: brand.name_ar,
    contactName: brand.contact_name ?? "",
    contactEmail: brand.contact_email ?? "",
    contactPhone: brand.contact_phone ?? "",
    notes: brand.notes ?? "",
  };
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true">
      <div className="h-40 animate-pulse rounded-lg bg-border motion-reduce:animate-none" />
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

function ContactRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-body text-text-secondary">{label}</dt>
      <dd className="min-w-0 truncate text-sm text-text-primary" dir={dir}>
        {value}
      </dd>
    </div>
  );
}

// A numeric rollup slot (lifetime total, avg deal size, last engagement),
// computed client-side from the page's one deals query (Feature 14). The
// em-dash renders while the deals load and when there's nothing to roll up.
function RollupStat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <p className="text-caption text-text-secondary">{label}</p>
      <p
        className={`money mt-1 truncate text-lg font-bold ${
          value === null ? "text-text-muted" : "text-text-primary"
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

export function BrandDetailRoute() {
  const { t } = useTranslation();
  const { locale, isArabic } = useLocale();
  const showToast = useToast();
  const { id } = useParams();

  const brandQuery = useBrand(id);
  const dealsQuery = useDealsForBrand(id);
  const updateBrand = useUpdateBrand();
  const [editOpen, setEditOpen] = useState(false);

  const brand = brandQuery.data;
  const deals = dealsQuery.data ?? [];
  const rollup = getBrandRollup(deals);

  function handleUpdate(data: BrandFormInput): void {
    if (!id) return;
    updateBrand.mutate(
      { id, input: data },
      {
        onSuccess: () => {
          showToast("brands.toast.updated", "success");
          setEditOpen(false);
        },
        onError: (error) => {
          logger.error("BrandDetailRoute.update", error);
          showToast("brands.toast.error", "error");
        },
      },
    );
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <Link
          to={ROUTES.BRANDS}
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-text-secondary hover:text-text-primary focus-visible:underline focus-visible:outline-none"
        >
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          {t("brands.detail.back")}
        </Link>

        {brandQuery.isLoading ? (
          <DetailSkeleton />
        ) : brandQuery.isError ? (
          <Card>
            <p className="text-sm text-error-foreground">{t("brands.loadError")}</p>
          </Card>
        ) : !brand ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-text-secondary">
                {t("brands.detail.notFound")}
              </p>
              <Link
                to={ROUTES.BRANDS}
                className="text-sm font-semibold text-accent focus-visible:underline focus-visible:outline-none"
              >
                {t("brands.detail.backToList")}
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex items-start gap-4">
                <BrandAvatar brand={brand} size="lg" />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-xl font-bold text-text-primary">
                    {isArabic ? brand.name_ar : brand.name_en}
                  </h1>
                  <p className="truncate text-sm text-text-secondary">
                    {isArabic ? brand.name_en : brand.name_ar}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setEditOpen(true)}
                  className="shrink-0"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  {t("brands.actions.edit")}
                </Button>
              </div>

              {brand.contact_name || brand.contact_email || brand.contact_phone ? (
                <dl className="mt-4 flex flex-col gap-2 border-t border-border-light pt-4">
                  {brand.contact_name ? (
                    <ContactRow
                      label={t("brands.fields.contactName")}
                      value={brand.contact_name}
                    />
                  ) : null}
                  {brand.contact_email ? (
                    <ContactRow
                      label={t("brands.fields.contactEmail")}
                      value={brand.contact_email}
                      dir="ltr"
                    />
                  ) : null}
                  {brand.contact_phone ? (
                    <ContactRow
                      label={t("brands.fields.contactPhone")}
                      value={brand.contact_phone}
                      dir="ltr"
                    />
                  ) : null}
                </dl>
              ) : null}

              {brand.notes ? (
                <div className="mt-4 border-t border-border-light pt-4">
                  <p className="text-body font-medium text-text-secondary">
                    {t("brands.fields.notes")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
                    {brand.notes}
                  </p>
                </div>
              ) : null}
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <RollupStat
                label={t("brands.detail.lifetimeTotal")}
                value={
                  rollup.lifetimeTotalSar === null
                    ? null
                    : formatSar(rollup.lifetimeTotalSar, locale)
                }
              />
              <RollupStat
                label={t("brands.detail.avgDealSize")}
                value={
                  rollup.avgDealSizeSar === null
                    ? null
                    : formatSar(rollup.avgDealSizeSar, locale)
                }
              />
              <RollupStat
                label={t("brands.detail.lastEngagement")}
                value={
                  rollup.lastEngagementAt === null
                    ? null
                    : formatDualTimestampDate(rollup.lastEngagementAt, locale)
                        .primary
                }
              />
            </div>

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold text-text-primary">
                  {t("brands.detail.deals")}
                </h2>
                {!dealsQuery.isLoading && !dealsQuery.isError ? (
                  <span className="text-body text-text-secondary">
                    {t("brands.dealCount", {
                      total: formatNumber(deals.length, locale),
                    })}
                  </span>
                ) : null}
              </div>

              {dealsQuery.isLoading ? (
                <div className="flex flex-col gap-3" role="status" aria-busy="true">
                  {[0, 1].map((index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
                    />
                  ))}
                </div>
              ) : dealsQuery.isError ? (
                <Card>
                  <p className="text-sm text-error-foreground">
                    {t("deals.loadError")}
                  </p>
                </Card>
              ) : deals.length === 0 ? (
                <Card>
                  <p className="text-sm text-text-secondary">
                    {t("brands.detail.noDeals")}
                  </p>
                </Card>
              ) : (
                deals.map((deal) => (
                  // brand is intentionally undefined — the page IS the brand,
                  // so the row skips the redundant brand subtitle.
                  <DealListItem key={deal.id} deal={deal} brand={undefined} />
                ))
              )}
            </section>
          </>
        )}
      </div>

      {brand ? (
        <BottomSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title={t("brands.editBrand")}
        >
          <BrandForm
            defaultValues={brandToFormInput(brand)}
            onSubmit={handleUpdate}
            isSubmitting={updateBrand.isPending}
            submitLabel={t("brands.actions.save")}
          />
        </BottomSheet>
      ) : null}
    </main>
  );
}
