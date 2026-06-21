import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { FilterChips } from "@/components/ui/FilterChips";
import {
  expenseSchema,
  type ExpenseFormInput,
} from "@/features/expenses/expense.schema";
import { EXPENSE_CATEGORY_ORDER } from "@shared/types/expense.types";
import type { Deal } from "@shared/types/deal.types";

type Props = {
  // Any deal can carry a cost (including paid/cancelled), so the parent passes
  // the full list — linking is optional ("" = general overhead).
  deals: Deal[];
  defaultValues: ExpenseFormInput;
  onSubmit: (data: ExpenseFormInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
  // Edit mode only — renders a destructive Delete action under Save.
  onDelete?: () => void;
  isDeleting?: boolean;
};

// The Add/Edit-expense form, hosted in a BottomSheet. Mounts fresh each time the
// sheet opens, so defaultValues seed it (and prefill it in edit mode). Error
// messages are i18n keys resolved with t(). The category is a controlled
// FilterChips (setValue), every other field is a plain register. Numeric inputs
// render Western digits regardless of locale (ui-rules).
export function ExpenseForm({
  deals,
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  onDelete,
  isDeleting,
}: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });

  const category = watch("category");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <Label htmlFor="expense-title">{t("expenses.fields.title")}</Label>
        <Input
          id="expense-title"
          placeholder={t("expenses.fields.titlePlaceholder")}
          hasError={Boolean(errors.title)}
          {...register("title")}
        />
        <FieldError
          message={errors.title?.message ? t(errors.title.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="expense-category">{t("expenses.fields.category")}</Label>
        <FilterChips
          items={EXPENSE_CATEGORY_ORDER.map((value) => ({
            value,
            label: t(`expenses.categories.${value}`),
          }))}
          value={category}
          onChange={(next) => setValue("category", next, { shouldValidate: true })}
          label={t("expenses.fields.category")}
        />
      </div>

      <div>
        <Label htmlFor="expense-amount">{t("expenses.fields.amount")}</Label>
        <Input
          id="expense-amount"
          inputMode="decimal"
          dir="ltr"
          placeholder={t("expenses.fields.amountPlaceholder")}
          hasError={Boolean(errors.amount)}
          {...register("amount")}
        />
        <FieldError
          message={errors.amount?.message ? t(errors.amount.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="expense-date">{t("expenses.fields.date")}</Label>
        <Input
          id="expense-date"
          type="date"
          dir="ltr"
          hasError={Boolean(errors.expenseDate)}
          {...register("expenseDate")}
        />
        <FieldError
          message={
            errors.expenseDate?.message ? t(errors.expenseDate.message) : undefined
          }
        />
      </div>

      <div>
        <Label htmlFor="expense-deal">{t("expenses.fields.deal")}</Label>
        <Select id="expense-deal" {...register("dealId")}>
          <option value="">{t("expenses.fields.dealNone")}</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.title}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-caption text-text-muted">
          {t("expenses.fields.dealHint")}
        </p>
      </div>

      <div>
        <Label htmlFor="expense-notes">{t("expenses.fields.notes")}</Label>
        <Textarea
          id="expense-notes"
          placeholder={t("expenses.fields.notesPlaceholder")}
          hasError={Boolean(errors.notes)}
          {...register("notes")}
        />
        <FieldError
          message={errors.notes?.message ? t(errors.notes.message) : undefined}
        />
      </div>

      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        {submitLabel}
      </Button>

      {onDelete ? (
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={onDelete}
          isLoading={isDeleting}
        >
          {t("expenses.actions.delete")}
        </Button>
      ) : null}
    </form>
  );
}
