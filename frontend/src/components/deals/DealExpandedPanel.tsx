import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DealForm } from "@/components/deals/DealForm";
import {
  useCancelDeal,
  useMarkPosted,
  useMarkShot,
  useUpdateDeal,
} from "@/hooks/useDeals";
import { useBrands } from "@/hooks/useBrands";
import { usePaymentsForDeal } from "@/hooks/usePayments";
import { useSnapReportsForDeal } from "@/hooks/useSnapReports";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import {
  canToggleShot,
  isLifecycleLocked,
  isPosted,
  isShot,
} from "@/features/deals/status";
import type { DealFormInput } from "@/features/deals/deal.schema";
import { formatDualDate, formatDualTimestampDate } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import { formatSar } from "@/lib/currency";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/constants/routes";
import type { Deal } from "@shared/types/deal.types";

type Props = {
  deal: Deal;
};

// Maps a deal row back to the all-string form shape for editing.
function toDealFormInput(deal: Deal): DealFormInput {
  return {
    brandId: deal.brand_id,
    title: deal.title,
    deliverables: deal.deliverables.map((line) => ({
      type: line.type,
      count: String(line.count),
    })),
    agreedAmount: String(deal.agreed_amount_sar),
    shootDate: deal.shoot_date ?? "",
    postDate: deal.post_date ?? "",
    notes: deal.notes ?? "",
  };
}

// The inside of an expanded deal row: the read-only deliverables descriptor
// ("what's owed"), the two lifecycle checkmarks (☐ Shot / ☐ Posted — these drive
// the status machine via useMarkShot/useMarkPosted), the deal notes, the real
// payment status (Feature 12), the linked Snap report (Feature 15), and the
// Edit + Cancel actions. The checkmarks are read-only once the deal is paid or
// cancelled; the Shot box also locks once posted (posting implies shot).
export function DealExpandedPanel({ deal }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const brandsQuery = useBrands();
  const paymentsQuery = usePaymentsForDeal(deal.id);
  const snapQuery = useSnapReportsForDeal(deal.id);
  const linkedReport = snapQuery.data?.[0];
  const paymentsSummary = paymentsQuery.data?.summary;

  const markShot = useMarkShot();
  const markPosted = useMarkPosted();
  const updateDeal = useUpdateDeal();
  const cancelDeal = useCancelDeal();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [editing, setEditing] = useState(false);

  const locked = isLifecycleLocked(deal.status);
  const shot = isShot(deal);
  const posted = isPosted(deal);
  const shootDate = deal.shoot_date ? formatDualDate(deal.shoot_date, locale) : null;
  const postDate = deal.post_date ? formatDualDate(deal.post_date, locale) : null;

  function handleMarkShot(): void {
    markShot.mutate(deal, {
      onError: (error) => {
        logger.error("DealExpandedPanel.markShot", error);
        showToast("deals.toast.error", "error");
      },
    });
  }

  function handleMarkPosted(): void {
    markPosted.mutate(deal, {
      onError: (error) => {
        logger.error("DealExpandedPanel.markPosted", error);
        showToast("deals.toast.error", "error");
      },
    });
  }

  function handleEdit(data: DealFormInput): void {
    updateDeal.mutate(
      { dealId: deal.id, input: data },
      {
        onSuccess: (result) => {
          showToast(
            result.reminderFailed ? "deals.toast.savedReminderFailed" : "deals.toast.saved",
            result.reminderFailed ? "error" : "success",
          );
          setEditing(false);
        },
        onError: (error) => {
          logger.error("DealExpandedPanel.update", error);
          showToast("deals.toast.error", "error");
        },
      },
    );
  }

  function handleCancel(): void {
    cancelDeal.mutate(deal, {
      onSuccess: () => {
        showToast("deals.toast.cancelled", "success");
        setConfirmingCancel(false);
      },
      onError: (error) => {
        logger.error("DealExpandedPanel.cancel", error);
        showToast("deals.toast.error", "error");
      },
    });
  }

  const togglesPending = markShot.isPending || markPosted.isPending;

  return (
    <div className="flex flex-col gap-4 border-t border-border-light pt-4">
      <div>
        <h3 className="text-body font-medium text-text-secondary">
          {t("deals.expanded.deliverables")}
        </h3>
        <ul className="mt-1 flex flex-col gap-0.5">
          {deal.deliverables.map((line, index) => (
            <li key={index} className="text-sm text-text-primary">
              {t("deals.expanded.deliverableLine", {
                total: formatNumber(line.count, locale),
                type: t(`deals.deliverableType.${line.type}`),
              })}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-body font-medium text-text-secondary">
          {t("deals.expanded.progress")}
        </h3>
        <div className="mt-1 flex flex-col">
          <label
            className={`flex min-h-11 items-center gap-3 ${
              canToggleShot(deal) ? "cursor-pointer" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={shot}
              disabled={!canToggleShot(deal) || togglesPending}
              onChange={handleMarkShot}
              className="size-5 shrink-0 accent-accent"
            />
            <span
              className={`flex-1 text-sm ${
                shot ? "text-text-muted line-through" : "text-text-primary"
              }`}
            >
              {t("deals.expanded.shot")}
            </span>
            <span className="shrink-0 text-xs text-text-muted">
              {deal.shot_at
                ? formatDualTimestampDate(deal.shot_at, locale).primary
                : shootDate
                  ? t("deals.expanded.planned", { date: shootDate.primary })
                  : null}
            </span>
          </label>

          <label
            className={`flex min-h-11 items-center gap-3 ${
              locked ? "" : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={posted}
              disabled={locked || togglesPending}
              onChange={handleMarkPosted}
              className="size-5 shrink-0 accent-accent"
            />
            <span
              className={`flex-1 text-sm ${
                posted ? "text-text-muted line-through" : "text-text-primary"
              }`}
            >
              {t("deals.expanded.posted")}
            </span>
            <span className="shrink-0 text-xs text-text-muted">
              {deal.posted_at
                ? formatDualTimestampDate(deal.posted_at, locale).primary
                : postDate
                  ? t("deals.expanded.planned", { date: postDate.primary })
                  : null}
            </span>
          </label>
        </div>
      </div>

      {deal.notes ? (
        <div>
          <h3 className="text-body font-medium text-text-secondary">
            {t("deals.fields.notes")}
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
            {deal.notes}
          </p>
        </div>
      ) : null}

      <div>
        <h3 className="text-body font-medium text-text-secondary">
          {t("deals.expanded.payments")}
        </h3>
        {paymentsQuery.isLoading ? (
          <div
            className="mt-1.5 h-5 w-56 max-w-full animate-pulse rounded bg-border motion-reduce:animate-none"
            role="status"
            aria-busy="true"
          />
        ) : paymentsQuery.isError ? (
          <p className="mt-1 text-sm text-error-foreground">
            {t("deals.expanded.paymentsError")}
          </p>
        ) : !paymentsSummary || paymentsSummary.totalCount === 0 ? (
          <p className="mt-1 text-sm text-text-muted">
            {t("deals.expanded.noPayments")}
          </p>
        ) : paymentsSummary.isFullyPaid ? (
          <p className="mt-1 text-sm font-medium text-success-foreground">
            {t("deals.expanded.paymentsAllReceived")}
          </p>
        ) : (
          <p className="money mt-1 text-sm text-text-primary">
            {t("deals.expanded.paymentsSummary", {
              count: paymentsSummary.totalCount,
              received: formatNumber(paymentsSummary.receivedCount, locale),
              total: formatNumber(paymentsSummary.totalCount, locale),
              outstanding: formatSar(paymentsSummary.outstandingSar, locale),
            })}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-body font-medium text-text-secondary">
          {t("deals.expanded.snapReport")}
        </h3>
        {snapQuery.isLoading ? (
          <div
            className="mt-1.5 h-5 w-56 max-w-full animate-pulse rounded bg-border motion-reduce:animate-none"
            role="status"
            aria-busy="true"
          />
        ) : snapQuery.isError ? (
          <p className="mt-1 text-sm text-error-foreground">
            {t("deals.expanded.snapError")}
          </p>
        ) : !linkedReport ? (
          <p className="mt-1 text-sm text-text-muted">
            {t("deals.expanded.noSnapReport")}
          </p>
        ) : (
          <Link
            to={ROUTES.ANALYTICS_SNAP}
            className="mt-1 block text-sm text-text-primary hover:text-accent focus-visible:underline focus-visible:outline-none"
          >
            {t("deals.expanded.snapSummary", {
              date: linkedReport.report_date
                ? formatDualDate(linkedReport.report_date, locale).primary
                : "—",
              views:
                linkedReport.views === null
                  ? "—"
                  : formatNumber(linkedReport.views, locale),
            })}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => setEditing(true)}
          className="self-start"
        >
          <Pencil className="size-4" aria-hidden="true" />
          {t("deals.actions.edit")}
        </Button>
        {!locked ? (
          confirmingCancel ? (
            <div className="flex flex-1 items-center gap-2">
              <Button
                variant="destructive"
                onClick={handleCancel}
                isLoading={cancelDeal.isPending}
                className="flex-1"
              >
                {t("deals.actions.confirmCancel")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelDeal.isPending}
                className="flex-1"
              >
                {t("deals.actions.keepDeal")}
              </Button>
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setConfirmingCancel(true)}
            >
              {t("deals.actions.cancelDeal")}
            </Button>
          )
        ) : null}
      </div>

      <BottomSheet
        open={editing}
        onClose={() => setEditing(false)}
        title={t("deals.actions.editDeal")}
      >
        {brandsQuery.isError ? (
          <p className="text-sm text-error-foreground">
            {t("deals.brandsLoadError")}
          </p>
        ) : brandsQuery.isLoading ? (
          <div
            className="h-5 w-40 animate-pulse rounded bg-border motion-reduce:animate-none"
            role="status"
            aria-busy="true"
          />
        ) : (
          <DealForm
            brands={brandsQuery.data ?? []}
            defaultValues={toDealFormInput(deal)}
            onSubmit={handleEdit}
            isSubmitting={updateDeal.isPending}
            submitLabel={t("deals.actions.saveDeal")}
          />
        )}
      </BottomSheet>
    </div>
  );
}
