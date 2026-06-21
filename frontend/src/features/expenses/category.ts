import { EXPENSE_CATEGORY, type ExpenseCategory } from "@shared/types/expense.types";

// Per-category chip tint. Reuses the brand-tint tokens (ui-tokens) — distinct
// hues, no new tokens. A category is NOT a status, so badges keep a neutral
// text-text-primary foreground rather than borrowing the semantic
// success/warning/error foregrounds (those carry meaning the deal/payment pills
// rely on). The label itself is the i18n key expenses.categories.<value>.
export const EXPENSE_CATEGORY_TINT: Record<ExpenseCategory, string> = {
  [EXPENSE_CATEGORY.PRODUCTION]: "bg-brand-tint-violet",
  [EXPENSE_CATEGORY.TRAVEL]: "bg-brand-tint-blue",
  [EXPENSE_CATEGORY.EQUIPMENT]: "bg-brand-tint-amber",
  [EXPENSE_CATEGORY.SOFTWARE]: "bg-brand-tint-green",
  [EXPENSE_CATEGORY.MARKETING]: "bg-brand-tint-pink",
  [EXPENSE_CATEGORY.OPERATIONAL]: "bg-brand-tint-neutral",
  [EXPENSE_CATEGORY.OTHER]: "bg-brand-tint-neutral",
};
