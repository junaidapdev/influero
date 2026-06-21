import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { ExpenseFormInput } from "@/features/expenses/expense.schema";
import type { Expense, ExpenseCategory } from "@shared/types/expense.types";

// /expenses ledger filters. All optional — absent means "all". `month` is
// YYYY-MM and narrows on expense_date (a bare date column, so plain string
// bounds compare chronologically — no timezone conversion like the deal
// post_date timestamptz needs).
export type ExpenseFilters = {
  category?: ExpenseCategory;
  month?: string;
};

// [start, end) date bounds for a YYYY-MM month filter on the bare expense_date.
function monthDateRange(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonthFirst =
    monthNumber === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  return { start: `${month}-01`, end: nextMonthFirst };
}

// Maps the all-string form input to expenses columns: trims, converts the
// validated amount string to a number, and turns the empty optional fields into
// null (an empty dealId means "general overhead" — the nullable column).
function toExpenseColumns(input: ExpenseFormInput): {
  category: ExpenseCategory;
  title: string;
  amount_sar: number;
  expense_date: string;
  deal_id: string | null;
  notes: string | null;
} {
  const dealId = input.dealId.trim();
  const notes = input.notes.trim();
  return {
    category: input.category,
    title: input.title.trim(),
    amount_sar: Number(input.amount),
    expense_date: input.expenseDate.trim(),
    deal_id: dealId === "" ? null : dealId,
    notes: notes === "" ? null : notes,
  };
}

// The filtered ledger, DB-filtered with the filter state in the queryKey so each
// combination caches independently. Newest expense first, newest-created as the
// tiebreaker. RLS scopes the read; the user_id filter is convenience.
export function useExpenses(filters: ExpenseFilters) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.EXPENSES, "list", filters],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Expense[]> => {
      if (!userId) throw new Error("[useExpenses] No authenticated user");

      let query = supabase
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.category) query = query.eq("category", filters.category);
      if (filters.month) {
        const { start, end } = monthDateRange(filters.month);
        query = query.gte("expense_date", start).lt("expense_date", end);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []) as Expense[];
    },
  });
}

// One unfiltered select of expense_date for every expense the user owns — feeds
// the month-filter options (grouped client-side). The no-N+1 query: never a
// per-month count.
export function useExpensesIndex() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.EXPENSES, "index"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<string[]> => {
      if (!userId) throw new Error("[useExpensesIndex] No authenticated user");

      const { data, error } = await supabase
        .from("expenses")
        .select("expense_date")
        .eq("user_id", userId);
      if (error) throw error;

      return ((data ?? []) as { expense_date: string }[]).map(
        (row) => row.expense_date,
      );
    },
  });
}

// Expense mutations all invalidate the EXPENSES prefix (covers the list + the
// month index) and DASHBOARD (the hero net reads total_expenses). No edge
// function — single-table writes under the caller's id, RLS-gated (the brands /
// settings pattern). REPORTS is untouched here: Build 1's reports don't read
// expenses yet (Build 2 wires the per-brand margin + monthly overlay).
function invalidateExpenseViews(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (input: ExpenseFormInput): Promise<Expense> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCreateExpense] No authenticated user");

      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...toExpenseColumns(input), user_id: userId })
        .select("*")
        .single();
      if (error) throw error;

      return data as Expense;
    },
    onSuccess: () => invalidateExpenseViews(queryClient),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async ({
      expenseId,
      input,
    }: {
      expenseId: string;
      input: ExpenseFormInput;
    }): Promise<Expense> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useUpdateExpense] No authenticated user");

      const { data, error } = await supabase
        .from("expenses")
        .update({ ...toExpenseColumns(input), updated_at: new Date().toISOString() })
        .eq("id", expenseId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;

      return data as Expense;
    },
    onSuccess: () => invalidateExpenseViews(queryClient),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (expenseId: string): Promise<void> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useDeleteExpense] No authenticated user");

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => invalidateExpenseViews(queryClient),
  });
}
