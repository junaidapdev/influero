// /expenses ledger constants. The category-filter sentinel for "show all" lives
// here so it never appears as a literal in the route or the hook (the
// PAYMENTS_TAB convention). The category VALUES themselves are the shared
// EXPENSE_CATEGORY (backend/shared/types/expense.types.ts).

export const EXPENSE_CATEGORY_ALL = "all" as const;

export type ExpenseCategoryFilter = typeof EXPENSE_CATEGORY_ALL;
