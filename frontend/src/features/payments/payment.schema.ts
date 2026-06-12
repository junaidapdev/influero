import { z } from "zod";

import { PAYMENT_METHOD } from "@shared/types/payment.types";

// Add-payment form validation. Error messages are i18n catalog KEYS (resolved
// with t() at render), matching deal.schema.ts. Lives in features/ for now —
// the mark-payment-received edge function validates { paymentId }, not this
// form, so nothing server-side consumes it yet.
//
// Every field is modelled as a string because react-hook-form hands inputs
// strings; the amount string is validated here and converted to a real number
// at the write layer (usePayments.toPaymentColumns). Same SAR amount rules as
// the deal form (positive, ≤ 2 decimals, Western digits).

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_AMOUNT_SAR = 100_000_000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const paymentSchema = z.object({
  dealId: z.string().min(1, "payments.errors.dealRequired"),
  amount: z
    .string()
    .trim()
    .min(1, "payments.errors.amountRequired")
    .refine((value) => {
      if (!AMOUNT_PATTERN.test(value)) return false;
      const amount = Number(value);
      return amount > 0 && amount <= MAX_AMOUNT_SAR;
    }, "payments.errors.amountInvalid"),
  // Optional — empty string means "no expected date". A native date input
  // yields YYYY-MM-DD; the format check guards manual entry.
  expectedDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || DATE_PATTERN.test(value),
      "payments.errors.expectedDateInvalid",
    ),
  // Optional — empty string means "no method" (column is nullable).
  method: z.union([
    z.literal(""),
    z.enum([PAYMENT_METHOD.BANK, PAYMENT_METHOD.CASH, PAYMENT_METHOD.OTHER]),
  ]),
  notes: z.string().trim().max(1000, "payments.errors.notesMax"),
});

export type PaymentFormInput = z.infer<typeof paymentSchema>;
