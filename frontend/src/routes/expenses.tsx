import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Receipt } from "lucide-react";

import { ExpenseListItem } from "@/components/expenses/ExpenseListItem";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { FilterChips } from "@/components/ui/FilterChips";
import { Select } from "@/components/ui/Select";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import {
  useExpenses,
  useExpensesIndex,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  type ExpenseFilters,
} from "@/hooks/useExpenses";
import { useDeals } from "@/hooks/useDeals";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { useQuickAddOpen } from "@/hooks/useQuickAddOpen";
import { isPro } from "@/features/billing/entitlement";
import type { ExpenseFormInput } from "@/features/expenses/expense.schema";
import { formatNumber } from "@/lib/numbers";
import { formatMonthYear, todayIsoLocal } from "@/lib/date";
import { logger } from "@/lib/logger";
import { EXPENSE_CATEGORY_ALL } from "@/constants/expenses";
import {
  EXPENSE_CATEGORY,
  EXPENSE_CATEGORY_ORDER,
  type Expense,
  type ExpenseCategory,
} from "@shared/types/expense.types";
import type { Deal } from "@shared/types/deal.types";

// A fresh empty form — expenseDate defaults to today (local), category to the
// most common bucket. A function (not a const) so each open re-reads "today".
function emptyExpenseForm(): ExpenseFormInput {
  return {
    category: EXPENSE_CATEGORY.PRODUCTION,
    title: "",
    amount: "",
    expenseDate: todayIsoLocal(),
    dealId: "",
    notes: "",
  };
}

// Existing row → form values (edit mode prefill). Mirrors toExpenseColumns in
// reverse: number → string, null → "".
function expenseToForm(expense: Expense): ExpenseFormInput {
  return {
    category: expense.category,
    title: expense.title,
    amount: String(expense.amount_sar),
    expenseDate: expense.expense_date,
    dealId: expense.deal_id ?? "",
    notes: expense.notes ?? "",
  };
}

function ExpensesSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

// /expenses — the money-OUT ledger (the Payments twin). Pro-only, gated in the UI
// (the Reports stance — there is no shared free surface, but the data is the
// user's own zero-marginal-cost data so the gate stays convenience-level; RLS is
// plain user-owned, so a downgrade keeps the data). Add / edit / delete with
// category + month filters; the dashboard hero reads the same rows for net.
export function ExpensesRoute() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const expensesQuery = useExpenses(filters);
  const indexQuery = useExpensesIndex();
  const dealsQuery = useDeals({});
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const entitlement = useEntitlement();

  // FAB Quick Add → Expense opens the Add sheet (even if already here).
  const handleQuickAdd = useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);
  useQuickAddOpen(handleQuickAdd);

  const expenses = expensesQuery.data ?? [];
  const deals = dealsQuery.data ?? [];
  const ready = !expensesQuery.isLoading && !expensesQuery.isError;
  const hasActiveFilters = Boolean(filters.category || filters.month);

  const dealsById = useMemo(() => {
    const map = new Map<string, Deal>();
    for (const deal of dealsQuery.data ?? []) map.set(deal.id, deal);
    return map;
  }, [dealsQuery.data]);

  // Months that actually have expenses, newest first, from the unfiltered index.
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    for (const date of indexQuery.data ?? []) months.add(date.slice(0, 7));
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [indexQuery.data]);

  // Reports/Snap stance: gate in the UI. A free user lands on the in-page
  // UpgradePrompt card; its button opens the upgrade modal (card-first — no modal
  // auto-pops on landing).
  const gated = !entitlement.isLoading && !isPro(entitlement.data);

  function closeSheet(): void {
    setSheetOpen(false);
    setEditing(null);
  }

  function handleEdit(expense: Expense): void {
    setEditing(expense);
    setSheetOpen(true);
  }

  function handleSubmit(data: ExpenseFormInput): void {
    if (editing) {
      updateExpense.mutate(
        { expenseId: editing.id, input: data },
        {
          onSuccess: () => {
            showToast("expenses.toast.updated", "success");
            closeSheet();
          },
          onError: (error) => {
            logger.error("ExpensesRoute.update", error);
            showToast("expenses.toast.error", "error");
          },
        },
      );
      return;
    }

    createExpense.mutate(data, {
      onSuccess: () => {
        showToast("expenses.toast.created", "success");
        closeSheet();
      },
      onError: (error) => {
        logger.error("ExpensesRoute.create", error);
        showToast("expenses.toast.error", "error");
      },
    });
  }

  function handleDelete(): void {
    if (!editing) return;
    deleteExpense.mutate(editing.id, {
      onSuccess: () => {
        showToast("expenses.toast.deleted", "success");
        closeSheet();
      },
      onError: (error) => {
        logger.error("ExpensesRoute.delete", error);
        showToast("expenses.toast.deleteError", "error");
      },
    });
  }

  // Until entitlement resolves, render a skeleton rather than the full page —
  // otherwise a free user briefly sees the ledger before the gate applies. (All
  // hooks above run unconditionally, so this early return is rules-of-hooks safe;
  // `gated` stays false while loading, so the upgrade modal doesn't pop early.)
  if (entitlement.isLoading) {
    return (
      <main className="min-h-dvh bg-background px-4 py-8">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
          <h1 className="text-2xl font-bold text-text-primary">{t("expenses.title")}</h1>
          <ExpensesSkeleton />
        </div>
      </main>
    );
  }

  if (gated) {
    return (
      <main className="min-h-dvh bg-background px-4 py-8">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
          <h1 className="text-2xl font-bold text-text-primary">{t("expenses.title")}</h1>
          <UpgradePrompt messageKey="billing.upgradePrompt.expenses" />
        </div>
      </main>
    );
  }

  const categoryFilterValue: ExpenseCategory | typeof EXPENSE_CATEGORY_ALL =
    filters.category ?? EXPENSE_CATEGORY_ALL;

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            {ready ? (
              <p className="text-body text-text-secondary">
                {t("expenses.count", {
                  total: formatNumber(expenses.length, locale),
                })}
              </p>
            ) : null}
            <h1 className="text-2xl font-bold text-text-primary">
              {t("expenses.title")}
            </h1>
          </div>
          {ready && (expenses.length > 0 || hasActiveFilters) ? (
            <Button onClick={handleQuickAdd} className="shrink-0">
              <Plus className="size-4" aria-hidden="true" />
              {t("expenses.addExpense")}
            </Button>
          ) : null}
        </div>

        {ready && (expenses.length > 0 || hasActiveFilters) ? (
          <div className="flex flex-col gap-3">
            <FilterChips
              items={[
                { value: EXPENSE_CATEGORY_ALL, label: t("expenses.filters.all") },
                ...EXPENSE_CATEGORY_ORDER.map((value) => ({
                  value,
                  label: t(`expenses.categories.${value}`),
                })),
              ]}
              value={categoryFilterValue}
              onChange={(next) =>
                setFilters((current) => ({
                  ...current,
                  category: next === EXPENSE_CATEGORY_ALL ? undefined : next,
                }))
              }
              label={t("expenses.filters.categoryLabel")}
            />
            {monthOptions.length > 0 ? (
              <Select
                aria-label={t("expenses.filters.monthLabel")}
                value={filters.month ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    month: event.target.value || undefined,
                  }))
                }
              >
                <option value="">{t("expenses.filters.allMonths")}</option>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthYear(month, locale)}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        ) : null}

        {expensesQuery.isLoading ? (
          <ExpensesSkeleton />
        ) : expensesQuery.isError ? (
          <Card>
            <p className="text-sm text-error-foreground">{t("expenses.loadError")}</p>
          </Card>
        ) : expenses.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState icon={Receipt} message={t("expenses.empty.noMatches")} />
          ) : (
            <EmptyState
              icon={Receipt}
              message={t("expenses.empty.message")}
              action={
                <Button onClick={handleQuickAdd}>
                  <Plus className="size-4" aria-hidden="true" />
                  {t("expenses.empty.cta")}
                </Button>
              }
            />
          )
        ) : (
          <div className="flex flex-col gap-3">
            {expenses.map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                dealTitle={
                  expense.deal_id
                    ? dealsById.get(expense.deal_id)?.title
                    : undefined
                }
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editing ? t("expenses.editExpense") : t("expenses.addExpense")}
      >
        <ExpenseForm
          deals={deals}
          defaultValues={editing ? expenseToForm(editing) : emptyExpenseForm()}
          onSubmit={handleSubmit}
          isSubmitting={createExpense.isPending || updateExpense.isPending}
          submitLabel={editing ? t("expenses.actions.save") : t("expenses.actions.add")}
          onDelete={editing ? handleDelete : undefined}
          isDeleting={deleteExpense.isPending}
        />
      </BottomSheet>
    </main>
  );
}
