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
import { meetingSchema, type MeetingFormInput } from "@/features/meetings/meeting.schema";
import type { Brand } from "@shared/types/brand.types";
import type { Deal } from "@shared/types/deal.types";

type Props = {
  brands: Brand[];
  // ACTIVE deals only — the parent filters out cancelled/paid, same set the
  // payment form links against.
  deals: Deal[];
  defaultValues: MeetingFormInput;
  onSubmit: (data: MeetingFormInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
};

// The Add/Edit-meeting form, hosted in a BottomSheet. Mounts fresh each time
// the sheet opens, so defaultValues seed it (empty for create, the meeting's
// values for edit — the F09 brand pattern). The attendees builder is an RHF
// field array — name + optional contact per line, removable down to zero
// (attendees are optional). Brand/deal links are optional selects with a
// "not linked" empty option. Error messages are i18n keys resolved with t().
export function MeetingForm({
  brands,
  deals,
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
  } = useForm<MeetingFormInput>({
    resolver: zodResolver(meetingSchema),
    defaultValues,
  });
  const attendeeLines = useFieldArray({ control, name: "attendees" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <Label htmlFor="meeting-title">{t("meetings.fields.title")}</Label>
        <Input
          id="meeting-title"
          placeholder={t("meetings.fields.titlePlaceholder")}
          hasError={Boolean(errors.title)}
          {...register("title")}
        />
        <FieldError
          message={errors.title?.message ? t(errors.title.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="meeting-scheduled-at">{t("meetings.fields.scheduledAt")}</Label>
        <Input
          id="meeting-scheduled-at"
          type="datetime-local"
          dir="ltr"
          hasError={Boolean(errors.scheduledAt)}
          {...register("scheduledAt")}
        />
        <FieldError
          message={
            errors.scheduledAt?.message ? t(errors.scheduledAt.message) : undefined
          }
        />
      </div>

      <div>
        <Label htmlFor="meeting-location">{t("meetings.fields.location")}</Label>
        <Input
          id="meeting-location"
          placeholder={t("meetings.fields.locationPlaceholder")}
          hasError={Boolean(errors.locationOrLink)}
          {...register("locationOrLink")}
        />
        <FieldError
          message={
            errors.locationOrLink?.message
              ? t(errors.locationOrLink.message)
              : undefined
          }
        />
      </div>

      <div>
        {/* htmlFor only when a row exists — create mode starts with zero
            attendee lines and a dangling reference is worse than none. */}
        <Label
          htmlFor={
            attendeeLines.fields.length > 0 ? "meeting-attendee-name-0" : undefined
          }
        >
          {t("meetings.fields.attendees")}
        </Label>
        <div className="flex flex-col gap-3">
          {attendeeLines.fields.map((field, index) => {
            const nameError = errors.attendees?.[index]?.name?.message;
            const contactError = errors.attendees?.[index]?.contact?.message;
            return (
              <div key={field.id}>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      id={`meeting-attendee-name-${index}`}
                      aria-label={t("meetings.fields.attendeeName")}
                      placeholder={t("meetings.fields.attendeeNamePlaceholder")}
                      hasError={Boolean(nameError)}
                      {...register(`attendees.${index}.name`)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      aria-label={t("meetings.fields.attendeeContact")}
                      placeholder={t("meetings.fields.attendeeContactPlaceholder")}
                      hasError={Boolean(contactError)}
                      {...register(`attendees.${index}.contact`)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => attendeeLines.remove(index)}
                    aria-label={t("meetings.actions.removeAttendee")}
                    className="grid size-11 shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-secondary hover:text-error-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <FieldError
                  message={
                    nameError ? t(nameError) : contactError ? t(contactError) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
        <FieldError
          message={errors.attendees?.message ? t(errors.attendees.message) : undefined}
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() => attendeeLines.append({ name: "", contact: "" })}
          className="mt-2 self-start"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("meetings.actions.addAttendee")}
        </Button>
      </div>

      <div>
        <Label htmlFor="meeting-brand">{t("meetings.fields.brand")}</Label>
        <Select
          id="meeting-brand"
          hasError={Boolean(errors.brandId)}
          {...register("brandId")}
        >
          <option value="">{t("meetings.fields.brandPlaceholder")}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {isArabic ? brand.name_ar : brand.name_en}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="meeting-deal">{t("meetings.fields.deal")}</Label>
        <Select
          id="meeting-deal"
          hasError={Boolean(errors.dealId)}
          {...register("dealId")}
        >
          <option value="">{t("meetings.fields.dealPlaceholder")}</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.title}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="meeting-notes">{t("meetings.fields.notes")}</Label>
        <Textarea
          id="meeting-notes"
          placeholder={t("meetings.fields.notesPlaceholder")}
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
