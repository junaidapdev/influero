// Shared expense types — the canonical shape of an expenses row and the fixed
// category set. Framework-agnostic (no React, Vite, or Deno imports) so the web
// app and the future React Native app reuse them untouched. Keep EXPENSE_CATEGORY
// in sync with the CHECK constraint in 0020_expenses.sql and the zod enum in
// frontend/src/features/expenses/expense.schema.ts.

export const EXPENSE_CATEGORY = {
  PRODUCTION: "production",
  TRAVEL: "travel",
  EQUIPMENT: "equipment",
  OPERATIONAL: "operational",
  SOFTWARE: "software",
  MARKETING: "marketing",
  OTHER: "other",
} as const;

export type ExpenseCategory =
  (typeof EXPENSE_CATEGORY)[keyof typeof EXPENSE_CATEGORY];

// Stable display order — the order categories appear in the form picker and the
// filter chips (most-common-first, with `other` last).
export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  EXPENSE_CATEGORY.PRODUCTION,
  EXPENSE_CATEGORY.TRAVEL,
  EXPENSE_CATEGORY.EQUIPMENT,
  EXPENSE_CATEGORY.OPERATIONAL,
  EXPENSE_CATEGORY.SOFTWARE,
  EXPENSE_CATEGORY.MARKETING,
  EXPENSE_CATEGORY.OTHER,
];

// The canonical shape of an expenses row. deal_id is nullable — an expense may be
// attributed to a deal (its cost) or stand as general overhead (null).
export type Expense = {
  id: string;
  user_id: string;
  deal_id: string | null;
  amount_sar: number;
  category: ExpenseCategory;
  title: string;
  expense_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
