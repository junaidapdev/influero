import { useTranslation } from "react-i18next";

import { PAYMENT_STATUS, type PaymentStatus } from "@shared/types/payment.types";

type Props = {
  // The DISPLAY status: the caller derives overdue (features/payments/overdue)
  // before rendering — the stored status is never 'overdue' in v1.
  status: PaymentStatus;
};

// Colors come from ui-tokens "Status Pills — Payments" — the closed table;
// never invent a pill color. Unlike the deals table, the payments table
// defines no dot color, so this pill is label-only. At most one per row.
const PILL_CLASS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.PENDING]: "bg-warning-light text-warning-foreground",
  [PAYMENT_STATUS.RECEIVED]: "bg-success-light text-success-foreground",
  [PAYMENT_STATUS.OVERDUE]: "bg-error-light text-error-foreground",
};

export function PaymentStatusPill({ status }: Props) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PILL_CLASS[status]}`}
    >
      {t(`payments.status.${status}`)}
    </span>
  );
}
