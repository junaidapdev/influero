import { z } from "zod";

import { EXPENSE_CATEGORY } from "@shared/types/expense.types";

// Add/edit-expense form validation. Error messages are i18n catalog KEYS
// (resolved with t() at render), matching payment.schema.ts / deal.schema.ts.
// Every field is a string because react-hook-form hands inputs strings; the
// amount string is validated here and converted to a real number at the write
// layer (useExpenses.toExpenseColumns). Same SAR amount rules as the payment /
// deal forms (positive, ≤ 2 decimals, Western digits).

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_AMOUNT_SAR = 100_000_000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const expenseSchema = z.object({
  // Derived from EXPENSE_CATEGORY (the shared const) so the validator stays in
  // sync if the category set changes — one source of truth, not a hand-copied list.
  category: z.nativeEnum(EXPENSE_CATEGORY),
  title: z
    .string()
    .trim()
    .min(1, "expenses.errors.titleRequired")
    .max(120, "expenses.errors.titleMax"),
  amount: z
    .string()
    .trim()
    .min(1, "expenses.errors.amountRequired")
    .refine((value) => {
      if (!AMOUNT_PATTERN.test(value)) return false;
      const amount = Number(value);
      return amount > 0 && amount <= MAX_AMOUNT_SAR;
    }, "expenses.errors.amountInvalid"),
  // Required — a native date input yields YYYY-MM-DD; the format check guards
  // manual entry. Defaults to today in the empty form.
  expenseDate: z
    .string()
    .trim()
    .min(1, "expenses.errors.dateRequired")
    .refine((value) => DATE_PATTERN.test(value), "expenses.errors.dateInvalid"),
  // Optional — empty string means "general overhead" (the deal_id column is
  // nullable). Linked → the cost is attributed to that deal/brand (Build 2).
  dealId: z.string(),
  notes: z.string().trim().max(1000, "expenses.errors.notesMax"),
});

export type ExpenseFormInput = z.infer<typeof expenseSchema>;
