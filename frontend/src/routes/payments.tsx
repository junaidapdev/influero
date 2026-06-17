import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Wallet } from "lucide-react";

import { PaymentListItem } from "@/components/payments/PaymentListItem";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { TotalPendingStrip } from "@/components/payments/TotalPendingStrip";
import { FilterChips } from "@/components/ui/FilterChips";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  useCreatePayment,
  useMarkPaymentReceived,
  usePayments,
  useSendPaymentReminder,
} from "@/hooks/usePayments";
import { useDeals } from "@/hooks/useDeals";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { useQuickAddOpen } from "@/hooks/useQuickAddOpen";
import { isPaymentOverdue } from "@/features/payments/overdue";
import { formatNumber } from "@/lib/numbers";
import { formatSar } from "@/lib/currency";
import { todayIsoLocal } from "@/lib/date";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/constants/routes";
import { PAYMENTS_TAB, type PaymentsTab } from "@/constants/payments";
import { DEAL_STATUS, type Deal } from "@shared/types/deal.types";
import type { Payment } from "@shared/types/payment.types";
import type { PaymentFormInput } from "@/features/payments/payment.schema";

const EMPTY_PAYMENT_FORM: PaymentFormInput = {
  dealId: "",
  amount: "",
  expectedDate: "",
  method: "",
  markReceived: false,
  notes: "",
};

// Deals that can take a new installment (Decision 3): cancelled is dead,
// paid only became paid because every payment was received.
const ACTIVE_DEAL_STATUSES: ReadonlySet<Deal["status"]> = new Set([
  DEAL_STATUS.PENDING,
  DEAL_STATUS.SHOT,
  DEAL_STATUS.POSTED,
]);

function PaymentsSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function PaymentsRoute() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const [tab, setTab] = useState<PaymentsTab>(PAYMENTS_TAB.PENDING);
  const [sheetOpen, setSheetOpen] = useState(false);

  const paymentsQuery = usePayments(tab);
  const dealsQuery = useDeals({});
  const createPayment = useCreatePayment();
  const markReceived = useMarkPaymentReceived();
  const sendReminder = useSendPaymentReminder();

  // FAB Quick Add → Payment opens this route's Add sheet (even if already here).
  const handleQuickAdd = useCallback(() => setSheetOpen(true), []);
  useQuickAddOpen(handleQuickAdd);

  const payments = paymentsQuery.data ?? [];
  const ready = !paymentsQuery.isLoading && !paymentsQuery.isError;
  const today = todayIsoLocal();

  const dealsById = useMemo(() => {
    const map = new Map<string, Deal>();
    for (const deal of dealsQuery.data ?? []) map.set(deal.id, deal);
    return map;
  }, [dealsQuery.data]);

  const activeDeals = useMemo(
    () => (dealsQuery.data ?? []).filter((deal) => ACTIVE_DEAL_STATUSES.has(deal.status)),
    [dealsQuery.data],
  );

  const totalPendingSar = payments.reduce(
    (sum, payment) => sum + payment.amount_sar,
    0,
  );

  function handleCreate(data: PaymentFormInput): void {
    createPayment.mutate(data, {
      onSuccess: (result) => {
        // The insert succeeded; pick the message by what happened to the
        // "already received" step. markFailed = saved but the RPC didn't run,
        // so point the user at the Pending tab to finish (a soft warning).
        if (result.markFailed) {
          showToast("payments.toast.createdNotReceived", "error");
        } else if (result.markedReceived) {
          showToast(
            result.dealPaid ? "payments.toast.dealPaid" : "payments.toast.received",
            "success",
          );
        } else {
          showToast("payments.toast.created", "success");
        }
        setSheetOpen(false);
      },
      onError: (error) => {
        logger.error("PaymentsRoute.create", error);
        showToast("payments.toast.error", "error");
      },
    });
  }

  // Feature 13: the F12 gate is gone — the button now drops a real in-app
  // kind='payment' reminder (due on the expected date, or immediately when
  // overdue/undated) that the Feature 14 Today panel reads. A second tap moves
  // the existing reminder instead of stacking a duplicate.
  function handleSendReminder(payment: Payment): void {
    sendReminder.mutate(
      { payment, dealTitle: dealsById.get(payment.deal_id)?.title },
      {
        onSuccess: () => {
          showToast("payments.toast.reminderSet", "success");
        },
        onError: (error) => {
          logger.error("PaymentsRoute.sendReminder", error);
          showToast("payments.toast.reminderError", "error");
        },
      },
    );
  }

  function handleMarkReceived(payment: Payment): void {
    markReceived.mutate(payment.id, {
      onSuccess: (result) => {
        showToast(
          result.deal_paid ? "payments.toast.dealPaid" : "payments.toast.received",
          "success",
        );
      },
      onError: (error) => {
        logger.error("PaymentsRoute.markReceived", error);
        showToast("payments.toast.receiveError", "error");
      },
    });
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            {ready ? (
              <p className="text-body text-text-secondary">
                {t("payments.count", {
                  total: formatNumber(payments.length, locale),
                })}
              </p>
            ) : null}
            <h1 className="text-2xl font-bold text-text-primary">
              {t("payments.title")}
            </h1>
          </div>
          {ready ? (
            <Button onClick={() => setSheetOpen(true)} className="shrink-0">
              <Plus className="size-4" aria-hidden="true" />
              {t("payments.addPayment")}
            </Button>
          ) : null}
        </div>

        <FilterChips
          items={[
            { value: PAYMENTS_TAB.PENDING, label: t("payments.tabs.pending") },
            { value: PAYMENTS_TAB.RECEIVED, label: t("payments.tabs.received") },
          ]}
          value={tab}
          onChange={setTab}
          label={t("payments.tabs.label")}
        />

        {ready && tab === PAYMENTS_TAB.PENDING && payments.length > 0 ? (
          <TotalPendingStrip amount={formatSar(totalPendingSar, locale)} />
        ) : null}

        {paymentsQuery.isLoading ? (
          <PaymentsSkeleton />
        ) : paymentsQuery.isError ? (
          <Card>
            <p className="text-sm text-error-foreground">{t("payments.loadError")}</p>
          </Card>
        ) : payments.length === 0 ? (
          tab === PAYMENTS_TAB.PENDING ? (
            <EmptyState
              icon={Wallet}
              message={t("payments.empty.pending")}
              action={
                <Button onClick={() => setSheetOpen(true)}>
                  <Plus className="size-4" aria-hidden="true" />
                  {t("payments.empty.pendingCta")}
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Wallet} message={t("payments.empty.received")} />
          )
        ) : (
          <div className="flex flex-col gap-3">
            {payments.map((payment) => (
              <PaymentListItem
                key={payment.id}
                payment={payment}
                dealTitle={dealsById.get(payment.deal_id)?.title}
                isOverdue={isPaymentOverdue(payment, today)}
                onMarkReceived={handleMarkReceived}
                onSendReminder={handleSendReminder}
                isMarking={markReceived.isPending && markReceived.variables === payment.id}
                isSendingReminder={
                  sendReminder.isPending &&
                  sendReminder.variables?.payment.id === payment.id
                }
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("payments.addPayment")}
      >
        {activeDeals.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-text-secondary">{t("payments.needDealFirst")}</p>
            <Link
              to={ROUTES.DEALS}
              className="text-sm font-semibold text-accent focus-visible:underline focus-visible:outline-none"
            >
              {t("payments.goToDeals")}
            </Link>
          </div>
        ) : (
          <PaymentForm
            deals={activeDeals}
            defaultValues={EMPTY_PAYMENT_FORM}
            onSubmit={handleCreate}
            isSubmitting={createPayment.isPending}
            submitLabel={t("payments.actions.add")}
          />
        )}
      </BottomSheet>
    </main>
  );
}
