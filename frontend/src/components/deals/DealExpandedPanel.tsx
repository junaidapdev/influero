import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useCancelDeal, useToggleDeliverable } from "@/hooks/useDeals";
import { usePaymentsForDeal } from "@/hooks/usePayments";
import { useSnapReportsForDeal } from "@/hooks/useSnapReports";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { isChecklistLocked, isDeliverablePosted } from "@/features/deals/status";
import { formatDualDate } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import { formatSar } from "@/lib/currency";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/constants/routes";
import type { Deal } from "@shared/types/deal.types";

type Props = {
  deal: Deal;
};

// The inside of an expanded deal row: the deliverables checklist (drives the
// status machine via useToggleDeliverable), the deal notes when present, the
// real payment status (Feature 12 — fetched on expand only, so the list never
// fans out into per-row queries), the linked Snap report line (Feature 15 —
// read-only here; the report is managed on /analytics/snap), and the manual
// cancel action with a two-step inline confirm. The checklist is read-only
// once the deal is paid or cancelled.
export function DealExpandedPanel({ deal }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const paymentsQuery = usePaymentsForDeal(deal.id);
  const snapQuery = useSnapReportsForDeal(deal.id);
  const linkedReport = snapQuery.data?.[0];
  const paymentsSummary = paymentsQuery.data?.summary;
  const toggleDeliverable = useToggleDeliverable();
  const cancelDeal = useCancelDeal();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const locked = isChecklistLocked(deal.status);

  function handleToggle(index: number): void {
    toggleDeliverable.mutate(
      { deal, index },
      {
        onError: (error) => {
          logger.error("DealExpandedPanel.toggle", error);
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

  return (
    <div className="flex flex-col gap-4 border-t border-border-light pt-4">
      <div>
        <h3 className="text-body font-medium text-text-secondary">
          {t("deals.expanded.deliverables")}
        </h3>
        <div className="mt-1 flex flex-col">
          {deal.deliverables.map((line, index) => {
            const posted = isDeliverablePosted(line);
            return (
              <label
                key={index}
                className={`flex min-h-11 items-center gap-3 ${
                  locked ? "" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={posted}
                  disabled={locked || toggleDeliverable.isPending}
                  onChange={() => handleToggle(index)}
                  className="size-5 shrink-0 accent-accent"
                />
                <span
                  className={`flex-1 text-sm ${
                    posted ? "text-text-muted line-through" : "text-text-primary"
                  }`}
                >
                  {t("deals.expanded.deliverableLine", {
                    total: formatNumber(line.count, locale),
                    type: t(`deals.deliverableType.${line.type}`),
                  })}
                </span>
                {posted && line.posted_at ? (
                  <span className="shrink-0 text-xs text-text-muted">
                    {formatDualDate(line.posted_at, locale).primary}
                  </span>
                ) : null}
              </label>
            );
          })}
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

      {!locked ? (
        confirmingCancel ? (
          <div className="flex items-center gap-2">
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
            className="self-start"
          >
            {t("deals.actions.cancelDeal")}
          </Button>
        )
      ) : null}
    </div>
  );
}
