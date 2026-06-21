import { useTranslation } from "react-i18next";

import { CategoryBadge } from "@/components/expenses/CategoryBadge";
import { useLocale } from "@/hooks/useLocale";
import { formatSar } from "@/lib/currency";
import { formatDualDate } from "@/lib/date";
import type { Expense } from "@shared/types/expense.types";

type Props = {
  expense: Expense;
  // Resolved by the parent from its deals map — present only for a linked
  // expense (deal_id set). Absent → general overhead, no deal line.
  dealTitle?: string;
  onEdit: (expense: Expense) => void;
};

// One ledger row: title + amount on top, then the category chip, date, and the
// linked deal (if any). The whole card is the edit affordance — tapping opens the
// prefilled edit sheet (the delete action lives inside that sheet).
export function ExpenseListItem({ expense, dealTitle, onEdit }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  return (
    <button
      type="button"
      onClick={() => onEdit(expense)}
      aria-label={t("expenses.actions.editAria", { title: expense.title })}
      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 text-start shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate font-semibold text-text-primary">
          {expense.title}
        </p>
        <p className="money shrink-0 font-bold text-text-primary">
          {formatSar(expense.amount_sar, locale)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <CategoryBadge category={expense.category} />
        <span className="text-caption text-text-muted">
          {formatDualDate(expense.expense_date, locale).primary}
        </span>
        {dealTitle ? (
          <span className="truncate text-caption text-text-secondary">
            · {dealTitle}
          </span>
        ) : null}
      </div>
    </button>
  );
}
