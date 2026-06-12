import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";
import { dealSchema, type DealFormInput } from "@/features/deals/deal.schema";
import { DELIVERABLE_TYPE } from "@shared/types/deal.types";
import type { Brand } from "@shared/types/brand.types";

type Props = {
  brands: Brand[];
  defaultValues: DealFormInput;
  onSubmit: (data: DealFormInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
};

const DELIVERABLE_TYPES = [
  DELIVERABLE_TYPE.STORY,
  DELIVERABLE_TYPE.POST,
  DELIVERABLE_TYPE.REEL,
] as const;

// The Add-deal form, hosted in a BottomSheet. Mounts fresh each time the sheet
// opens, so defaultValues seed it. The deliverables builder is an RHF field
// array — each line is type × count, removable, with at least one line enforced
// by the schema. Error messages are i18n keys resolved with t(). Numeric inputs
// render Western digits regardless of locale (ui-rules) so math stays
// unambiguous; display formatting localizes elsewhere.
export function DealForm({
  brands,
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: Props) {
  const { t } = useTranslation();
  const { isArabic } = useLocale();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DealFormInput>({
    resolver: zodResolver(dealSchema),
    defaultValues,
  });
  const deliverableLines = useFieldArray({ control, name: "deliverables" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <Label htmlFor="deal-brand">{t("deals.fields.brand")}</Label>
        <Select
          id="deal-brand"
          hasError={Boolean(errors.brandId)}
          {...register("brandId")}
        >
          <option value="">{t("deals.fields.brandPlaceholder")}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {isArabic ? brand.name_ar : brand.name_en}
            </option>
          ))}
        </Select>
        <FieldError
          message={errors.brandId?.message ? t(errors.brandId.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="deal-title">{t("deals.fields.title")}</Label>
        <Input
          id="deal-title"
          placeholder={t("deals.fields.titlePlaceholder")}
          hasError={Boolean(errors.title)}
          {...register("title")}
        />
        <FieldError
          message={errors.title?.message ? t(errors.title.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="deal-deliverable-type-0">{t("deals.fields.deliverables")}</Label>
        <div className="flex flex-col gap-3">
          {deliverableLines.fields.map((field, index) => {
            const countError = errors.deliverables?.[index]?.count?.message;
            return (
              <div key={field.id}>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Select
                      id={`deal-deliverable-type-${index}`}
                      aria-label={t("deals.fields.deliverableType")}
                      {...register(`deliverables.${index}.type`)}
                    >
                      {DELIVERABLE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {t(`deals.deliverableType.${type}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input
                      inputMode="numeric"
                      dir="ltr"
                      aria-label={t("deals.fields.deliverableCount")}
                      placeholder="1"
                      hasError={Boolean(countError)}
                      {...register(`deliverables.${index}.count`)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => deliverableLines.remove(index)}
                    disabled={deliverableLines.fields.length === 1}
                    aria-label={t("deals.actions.removeDeliverable")}
                    className="grid size-11 shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-secondary hover:text-error-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <FieldError message={countError ? t(countError) : undefined} />
              </div>
            );
          })}
        </div>
        <FieldError
          message={
            errors.deliverables?.message ? t(errors.deliverables.message) : undefined
          }
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            deliverableLines.append({ type: DELIVERABLE_TYPE.STORY, count: "1" })
          }
          className="mt-2 self-start"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("deals.actions.addDeliverable")}
        </Button>
      </div>

      <div>
        <Label htmlFor="deal-amount">{t("deals.fields.amount")}</Label>
        <Input
          id="deal-amount"
          inputMode="decimal"
          dir="ltr"
          placeholder={t("deals.fields.amountPlaceholder")}
          hasError={Boolean(errors.agreedAmount)}
          {...register("agreedAmount")}
        />
        <FieldError
          message={
            errors.agreedAmount?.message ? t(errors.agreedAmount.message) : undefined
          }
        />
      </div>

      <div>
        <Label htmlFor="deal-deadline">{t("deals.fields.deadline")}</Label>
        <Input
          id="deal-deadline"
          type="date"
          dir="ltr"
          hasError={Boolean(errors.deadline)}
          {...register("deadline")}
        />
        <FieldError
          message={errors.deadline?.message ? t(errors.deadline.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="deal-notes">{t("deals.fields.notes")}</Label>
        <Textarea
          id="deal-notes"
          placeholder={t("deals.fields.notesPlaceholder")}
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
