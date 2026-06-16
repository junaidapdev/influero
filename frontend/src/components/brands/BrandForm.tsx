import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { brandSchema, type BrandFormInput } from "@/features/brands/brand.schema";
import { BRAND_CATEGORIES } from "@shared/types/brand.types";

type Props = {
  defaultValues: BrandFormInput;
  onSubmit: (data: BrandFormInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
};

// Create/edit form shared by the directory's Add sheet and the detail page's Edit
// sheet. Mounts fresh each time its sheet opens, so defaultValues seed it on open
// (empty for create, the brand's values for edit). Error messages are i18n keys
// resolved with t(). The name fields force their own dir so Arabic/English text
// types correctly regardless of the active UI locale.
export function BrandForm({
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
  } = useForm<BrandFormInput>({
    resolver: zodResolver(brandSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <Label htmlFor="brand-nameEn">{t("brands.fields.nameEn")}</Label>
        <Input
          id="brand-nameEn"
          dir="ltr"
          placeholder={t("brands.fields.nameEnPlaceholder")}
          hasError={Boolean(errors.nameEn)}
          {...register("nameEn")}
        />
        <FieldError
          message={errors.nameEn?.message ? t(errors.nameEn.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="brand-nameAr">{t("brands.fields.nameAr")}</Label>
        <Input
          id="brand-nameAr"
          dir="rtl"
          placeholder={t("brands.fields.nameArPlaceholder")}
          hasError={Boolean(errors.nameAr)}
          {...register("nameAr")}
        />
        <FieldError
          message={errors.nameAr?.message ? t(errors.nameAr.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="brand-category">{t("brands.fields.category")}</Label>
        <Select
          id="brand-category"
          hasError={Boolean(errors.category)}
          {...register("category")}
        >
          <option value="">{t("brands.fields.categoryUnset")}</option>
          {BRAND_CATEGORIES.map((key) => (
            <option key={key} value={key}>
              {t(`brands.categories.${key}`)}
            </option>
          ))}
        </Select>
        <FieldError
          message={errors.category?.message ? t(errors.category.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="brand-contactName">{t("brands.fields.contactName")}</Label>
        <Input
          id="brand-contactName"
          placeholder={t("brands.fields.contactNamePlaceholder")}
          hasError={Boolean(errors.contactName)}
          {...register("contactName")}
        />
        <FieldError
          message={
            errors.contactName?.message ? t(errors.contactName.message) : undefined
          }
        />
      </div>

      <div>
        <Label htmlFor="brand-contactEmail">{t("brands.fields.contactEmail")}</Label>
        <Input
          id="brand-contactEmail"
          type="email"
          dir="ltr"
          placeholder={t("brands.fields.contactEmailPlaceholder")}
          hasError={Boolean(errors.contactEmail)}
          {...register("contactEmail")}
        />
        <FieldError
          message={
            errors.contactEmail?.message ? t(errors.contactEmail.message) : undefined
          }
        />
      </div>

      <div>
        <Label htmlFor="brand-contactPhone">{t("brands.fields.contactPhone")}</Label>
        <Input
          id="brand-contactPhone"
          type="tel"
          dir="ltr"
          placeholder={t("brands.fields.contactPhonePlaceholder")}
          hasError={Boolean(errors.contactPhone)}
          {...register("contactPhone")}
        />
        <FieldError
          message={
            errors.contactPhone?.message ? t(errors.contactPhone.message) : undefined
          }
        />
      </div>

      <div>
        <Label htmlFor="brand-notes">{t("brands.fields.notes")}</Label>
        <Textarea
          id="brand-notes"
          placeholder={t("brands.fields.notesPlaceholder")}
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
