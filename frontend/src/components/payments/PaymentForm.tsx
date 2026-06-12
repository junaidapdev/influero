import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import {
  paymentSchema,
  type PaymentFormInput,
} from "@/features/payments/payment.schema";
import { PAYMENT_METHOD } from "@shared/types/payment.types";
import type { Deal } from "@shared/types/deal.types";

type Props = {
  // ACTIVE deals only (pending / in_progress / posted) — the parent filters;
  // cancelled and paid deals don't take new installments (Decision 3).
  deals: Deal[];
  defaultValues: PaymentFormInput;
  onSubmit: (data: PaymentFormInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
};

const PAYMENT_METHODS = [
  PAYMENT_METHOD.BANK,
  PAYMENT_METHOD.CASH,
  PAYMENT_METHOD.OTHER,
] as const;

// The Add-payment form, hosted in a BottomSheet. Mounts fresh each time the
// sheet opens, so defaultValues seed it. Error messages are i18n keys resolved
// with t(). Numeric inputs render Western digits regardless of locale
// (ui-rules) so math stays unambiguous.
export function PaymentForm({
  deals,
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <Label htmlFor="payment-deal">{t("payments.fields.deal")}</Label>
        <Select
          id="payment-deal"
          hasError={Boolean(errors.dealId)}
          {...register("dealId")}
        >
          <option value="">{t("payments.fields.dealPlaceholder")}</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.title}
            </option>
          ))}
        </Select>
        <FieldError
          message={errors.dealId?.message ? t(errors.dealId.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="payment-amount">{t("payments.fields.amount")}</Label>
        <Input
          id="payment-amount"
          inputMode="decimal"
          dir="ltr"
          placeholder={t("payments.fields.amountPlaceholder")}
          hasError={Boolean(errors.amount)}
          {...register("amount")}
        />
        <FieldError
          message={errors.amount?.message ? t(errors.amount.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="payment-expected-date">
          {t("payments.fields.expectedDate")}
        </Label>
        <Input
          id="payment-expected-date"
          type="date"
          dir="ltr"
          hasError={Boolean(errors.expectedDate)}
          {...register("expectedDate")}
        />
        <FieldError
          message={
            errors.expectedDate?.message ? t(errors.expectedDate.message) : undefined
          }
        />
      </div>

      <div>
        <Label htmlFor="payment-method">{t("payments.fields.method")}</Label>
        <Select id="payment-method" {...register("method")}>
          <option value="">{t("payments.fields.methodNone")}</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {t(`payments.method.${method}`)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="payment-notes">{t("payments.fields.notes")}</Label>
        <Textarea
          id="payment-notes"
          placeholder={t("payments.fields.notesPlaceholder")}
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
    </form>
  );
}
