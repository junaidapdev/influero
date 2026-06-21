import { useTranslation } from "react-i18next";

import { EXPENSE_CATEGORY_TINT } from "@/features/expenses/category";
import type { ExpenseCategory } from "@shared/types/expense.types";

type Props = {
  category: ExpenseCategory;
};

// The expense-category chip (tinted background + localized label) — one per
// ledger row (the add/edit sheet picks the category via FilterChips, not this).
// Tint per category from EXPENSE_CATEGORY_TINT; same pill envelope as
// DealStatusPill but, like the payments pill, no leading dot/gap — a category is
// not a status.
export function CategoryBadge({ category }: Props) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-text-primary ${EXPENSE_CATEGORY_TINT[category]}`}
    >
      {t(`expenses.categories.${category}`)}
    </span>
  );
}
