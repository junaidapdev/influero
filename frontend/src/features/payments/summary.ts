import { PAYMENT_STATUS, type Payment } from "@shared/types/payment.types";

export type PaymentsSummary = {
  receivedCount: number;
  totalCount: number;
  outstandingSar: number;
  isFullyPaid: boolean;
};

// The deal-row payment rollup ("X of Y payments received · SAR Z outstanding").
// Pure (React-/Supabase-free) per the features/ boundary. Outstanding counts
// every non-received installment — including a stored 'overdue' if one ever
// appears — mirroring the pending tab's `neq received` read. isFullyPaid is
// false with zero payments: a deal with no installments isn't "fully paid"
// (the RPC's all-received deal flip only ever fires off an existing payment).
export function getPaymentsSummary(payments: Payment[]): PaymentsSummary {
  let receivedCount = 0;
  let outstandingSar = 0;
  for (const payment of payments) {
    if (payment.status === PAYMENT_STATUS.RECEIVED) {
      receivedCount += 1;
    } else {
      outstandingSar += payment.amount_sar;
    }
  }
  return {
    receivedCount,
    totalCount: payments.length,
    outstandingSar,
    isFullyPaid: payments.length > 0 && receivedCount === payments.length,
  };
}
