import { PAYMENT_STATUS, type Payment } from "@shared/types/payment.types";

// Overdue is DERIVED, never stored, in v1: nothing runs on a schedule to flip
// payment statuses, so a pending payment whose expected_date has passed is
// computed at display time. Pure (React-/Supabase-free) per the features/
// boundary; the caller passes today's local date (lib/date.todayIsoLocal) so
// the rule stays deterministic and testable. Plain YYYY-MM-DD strings compare
// correctly lexicographically.
export function isPaymentOverdue(payment: Payment, todayIso: string): boolean {
  return (
    payment.status === PAYMENT_STATUS.PENDING &&
    payment.expected_date !== null &&
    payment.expected_date < todayIso
  );
}
