// Shared payment types — the canonical shape of a payments row, its status
// set, and the method set. Framework-agnostic (no React, Vite, or Deno
// imports) so the web app, the mark-payment-received edge function, and the
// future React Native app all reuse them untouched. Keep PAYMENT_STATUS and
// PAYMENT_METHOD in sync with the CHECK constraints in 0006_payments.sql.
//
// 'overdue' is legal in the DB CHECK but never written in v1 — overdue is
// derived at display time (pending + expected_date < today).

export const PAYMENT_STATUS = {
  PENDING: "pending",
  RECEIVED: "received",
  OVERDUE: "overdue",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_METHOD = {
  BANK: "bank",
  CASH: "cash",
  OTHER: "other",
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

// The canonical shape of a payments row.
export type Payment = {
  id: string;
  user_id: string;
  deal_id: string;
  amount_sar: number;
  expected_date: string | null;
  received_date: string | null;
  status: PaymentStatus;
  method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
};

// What mark_payment_received (the RPC, via the edge function) returns: enough
// for the caller to log activity and update caches without extra queries.
export type MarkPaymentReceivedResult = {
  payment_id: string;
  deal_id: string;
  amount_sar: number;
  deal_title: string;
  deal_paid: boolean;
};
