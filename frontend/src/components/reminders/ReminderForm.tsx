import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import {
  reminderSchema,
  type ReminderFormInput,
} from "@/features/reminders/reminder.schema";

type Props = {
  defaultValues: ReminderFormInput;
  onSubmit: (data: ReminderFormInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
  // Edit mode only — renders a destructive Delete action under Save.
  onDelete?: () => void;
  isDeleting?: boolean;
};

// The Add/Edit-reminder form, hosted in a BottomSheet. Mounts fresh each time the
// sheet opens, so defaultValues seed it (and prefill it in edit mode). Error
// messages are i18n keys resolved with t(). Two fields only: the note text and a
// native datetime-local — a quick reminder is just "what" + "when". The datetime
// input renders LTR regardless of locale so the picker reads left-to-right.
export function ReminderForm({
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
    formState: { errors },
  } = useForm<ReminderFormInput>({
    resolver: zodResolver(reminderSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <Label htmlFor="reminder-text">{t("reminders.fields.text")}</Label>
        <Input
          id="reminder-text"
          placeholder={t("reminders.fields.textPlaceholder")}
          hasError={Boolean(errors.text)}
          {...register("text")}
        />
        <FieldError
          message={errors.text?.message ? t(errors.text.message) : undefined}
        />
      </div>

      <div>
        <Label htmlFor="reminder-when">{t("reminders.fields.remindAt")}</Label>
        <Input
          id="reminder-when"
          type="datetime-local"
          dir="ltr"
          hasError={Boolean(errors.remindAt)}
          {...register("remindAt")}
        />
        <FieldError
          message={errors.remindAt?.message ? t(errors.remindAt.message) : undefined}
        />
      </div>

      {/* Cross-disable so a delete can't fire while a save is in flight (and
          vice versa) — no overlapping mutations on the same row. */}
      <Button
        type="submit"
        className="w-full"
        isLoading={isSubmitting}
        disabled={isDeleting}
      >
        {submitLabel}
      </Button>

      {onDelete ? (
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={onDelete}
          isLoading={isDeleting}
          disabled={isSubmitting}
        >
          {t("reminders.actions.delete")}
        </Button>
      ) : null}
    </form>
  );
}
