import { useTranslation } from "react-i18next";

import { PaymentStatusPill } from "@/components/payments/PaymentStatusPill";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";
import { formatDualDate } from "@/lib/date";
import { formatSar } from "@/lib/currency";
import { PAYMENT_STATUS, type Payment } from "@shared/types/payment.types";

type Props = {
  payment: Payment;
  // Resolved by the parent from the cached deals list — undefined while the
  // deals query is in flight.
  dealTitle: string | undefined;
  // Derived by the parent (features/payments/overdue + todayIsoLocal) so the
  // whole list shares one "today".
  isOverdue: boolean;
  onMarkReceived: (payment: Payment) => void;
  // Drops an in-app kind='payment' reminder (Feature 13) — the parent owns
  // the mutation and the success/error toasts.
  onSendReminder: (payment: Payment) => void;
  isMarking: boolean;
  isSendingReminder: boolean;
};

// The payment row card. Not expandable — the row IS the content. Payment rows
// ARE in ui-tokens' "Row-Card Left Stripe" table: payment due = warning,
// overdue payment = error (border-s-4, mirrors with direction). Received rows
// carry no stripe — they're settled history, and the table has no entry for
// them; the pill carries the state. Pending rows show the expected date and
// the Mark-received + Send-reminder pair (side-by-side, equal width, primary
// action on the leading edge per ui-rules); received rows show the received
// date.
export function PaymentListItem({
  payment,
  dealTitle,
  isOverdue,
  onMarkReceived,
  onSendReminder,
  isMarking,
  isSendingReminder,
}: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const isPending = payment.status !== PAYMENT_STATUS.RECEIVED;
  const displayStatus = isOverdue ? PAYMENT_STATUS.OVERDUE : payment.status;
  const stripe = isPending
    ? isOverdue
      ? "border-s-4 border-s-error"
      : "border-s-4 border-s-warning"
    : "";
  const rowDate = isPending ? payment.expected_date : payment.received_date;
  const dualDate = rowDate ? formatDualDate(rowDate, locale) : null;

  return (
    <div
      className={`flex min-h-16 flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-card ${stripe}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-row font-semibold text-text-primary">
          {dealTitle ?? "—"}
        </p>
        <PaymentStatusPill status={displayStatus} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="money text-body font-semibold text-text-primary">
          {formatSar(payment.amount_sar, locale)}
        </p>
        {dualDate ? (
          <div className="text-end">
            <p className="text-body text-text-secondary">{dualDate.primary}</p>
            <p className="text-xs text-text-muted">{dualDate.secondary}</p>
          </div>
        ) : (
          <p className="text-xs text-text-muted">{t("payments.noExpectedDate")}</p>
        )}
      </div>

      {isPending ? (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => onMarkReceived(payment)}
            isLoading={isMarking}
            disabled={isSendingReminder}
            className="flex-1"
          >
            {t("payments.actions.markReceived")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onSendReminder(payment)}
            isLoading={isSendingReminder}
            disabled={isMarking}
            className="flex-1"
          >
            {t("payments.actions.sendReminder")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
