import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { HeaderIconButton } from "@/components/layout/HeaderIconButton";
import { ReminderListItem } from "@/components/reminders/ReminderListItem";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  useReminders,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
  useSetReminderDone,
  useClearDoneReminders,
} from "@/hooks/useReminders";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { useQuickAddOpen } from "@/hooks/useQuickAddOpen";
import type { ReminderFormInput } from "@/features/reminders/reminder.schema";
import { toDatetimeLocalValue } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import { logger } from "@/lib/logger";
import type { Reminder } from "@shared/types/reminder.types";

// A fresh empty form: default the time to tomorrow 09:00 local (the canonical
// "remind me tomorrow" case — the user adjusts from there). A function (not a
// const) so each open re-reads "now". toDatetimeLocalValue formats it as the
// input's local wall-clock value.
function emptyReminderForm(): ReminderFormInput {
  const when = new Date();
  when.setDate(when.getDate() + 1);
  when.setHours(9, 0, 0, 0);
  return { text: "", remindAt: toDatetimeLocalValue(when.toISOString()) };
}

// Existing row → form values (edit-mode prefill). message_en === message_ar
// (the text is dual-written), so either gives the user's note back.
function reminderToForm(reminder: Reminder): ReminderFormInput {
  return {
    text: reminder.message_en,
    remindAt: toDatetimeLocalValue(reminder.due_at),
  };
}

function RemindersSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

// /reminders — the user's own quick reminders (kind='custom'): a note + a time
// that surfaces in the dashboard Today panel when due. Free + standalone (no
// deal/brand link). This page is the full view + management surface; Today shows
// only the ones due within 24h. Add / edit / delete + a Done/Undo toggle.
export function RemindersRoute() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);

  const remindersQuery = useReminders();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const setDone = useSetReminderDone();
  const clearDone = useClearDoneReminders();

  // FAB Quick Add → Reminder opens the Add sheet (even if already here).
  const handleQuickAdd = useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);
  useQuickAddOpen(handleQuickAdd);

  const reminders = remindersQuery.data ?? [];
  const ready = !remindersQuery.isLoading && !remindersQuery.isError;

  // One "now" for the whole render so every row agrees on what's overdue.
  const nowMs = Date.now();
  const upcoming = reminders.filter((reminder) => !reminder.is_done);
  // Done newest-first: the list is due_at-ascending, so reverse the done slice.
  const done = reminders.filter((reminder) => reminder.is_done).reverse();

  const togglingId = setDone.isPending ? setDone.variables?.reminderId : undefined;

  function closeSheet(): void {
    setSheetOpen(false);
    setEditing(null);
  }

  function handleEdit(reminder: Reminder): void {
    setEditing(reminder);
    setSheetOpen(true);
  }

  function handleSubmit(data: ReminderFormInput): void {
    if (editing) {
      updateReminder.mutate(
        { reminderId: editing.id, input: data },
        {
          onSuccess: () => {
            showToast("reminders.toast.updated", "success");
            closeSheet();
          },
          onError: (error) => {
            logger.error("RemindersRoute.update", error);
            showToast("reminders.toast.error", "error");
          },
        },
      );
      return;
    }

    createReminder.mutate(data, {
      onSuccess: () => {
        showToast("reminders.toast.created", "success");
        closeSheet();
      },
      onError: (error) => {
        logger.error("RemindersRoute.create", error);
        showToast("reminders.toast.error", "error");
      },
    });
  }

  function handleDelete(): void {
    if (!editing) return;
    deleteReminder.mutate(editing.id, {
      onSuccess: () => {
        showToast("reminders.toast.deleted", "success");
        closeSheet();
      },
      onError: (error) => {
        logger.error("RemindersRoute.delete", error);
        showToast("reminders.toast.deleteError", "error");
      },
    });
  }

  function handleToggleDone(reminder: Reminder): void {
    setDone.mutate(
      { reminderId: reminder.id, isDone: !reminder.is_done },
      {
        onError: (error) => {
          logger.error("RemindersRoute.toggleDone", error);
          showToast("reminders.toast.error", "error");
        },
      },
    );
  }

  function handleClearDone(): void {
    clearDone.mutate(undefined, {
      onSuccess: () => showToast("reminders.toast.cleared", "success"),
      onError: (error) => {
        logger.error("RemindersRoute.clearDone", error);
        showToast("reminders.toast.deleteError", "error");
      },
    });
  }

  return (
    <main className="min-h-dvh bg-background px-4 pb-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <PageHeader
          eyebrow={
            ready
              ? t("reminders.count", { total: formatNumber(reminders.length, locale) })
              : undefined
          }
          title={t("reminders.title")}
          action={
            ready && reminders.length > 0 ? (
              <HeaderIconButton
                icon={Plus}
                label={t("reminders.addReminder")}
                onClick={handleQuickAdd}
              />
            ) : undefined
          }
        />

        {remindersQuery.isLoading ? (
          <RemindersSkeleton />
        ) : remindersQuery.isError ? (
          <Card>
            <p className="text-sm text-error-foreground">{t("reminders.loadError")}</p>
          </Card>
        ) : reminders.length === 0 ? (
          <EmptyState
            icon={Bell}
            message={t("reminders.empty.message")}
            action={
              <Button onClick={handleQuickAdd}>
                <Plus className="size-4" aria-hidden="true" />
                {t("reminders.empty.cta")}
              </Button>
            }
          />
        ) : (
          <>
            {upcoming.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="text-base font-semibold text-text-primary">
                  {t("reminders.sections.upcoming")}
                </h2>
                {upcoming.map((reminder) => (
                  <ReminderListItem
                    key={reminder.id}
                    reminder={reminder}
                    overdue={new Date(reminder.due_at).getTime() < nowMs}
                    onEdit={handleEdit}
                    onToggleDone={handleToggleDone}
                    isToggling={togglingId === reminder.id}
                  />
                ))}
              </section>
            ) : null}

            {done.length > 0 ? (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-text-primary">
                    {t("reminders.sections.done")}
                  </h2>
                  <button
                    type="button"
                    onClick={handleClearDone}
                    disabled={clearDone.isPending}
                    className="shrink-0 rounded-md px-1 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                  >
                    {t("reminders.clearDone")}
                  </button>
                </div>
                {done.map((reminder) => (
                  <ReminderListItem
                    key={reminder.id}
                    reminder={reminder}
                    overdue={false}
                    onEdit={handleEdit}
                    onToggleDone={handleToggleDone}
                    isToggling={togglingId === reminder.id}
                  />
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editing ? t("reminders.editReminder") : t("reminders.addReminder")}
      >
        <ReminderForm
          defaultValues={editing ? reminderToForm(editing) : emptyReminderForm()}
          onSubmit={handleSubmit}
          isSubmitting={createReminder.isPending || updateReminder.isPending}
          submitLabel={editing ? t("reminders.actions.save") : t("reminders.actions.add")}
          onDelete={editing ? handleDelete : undefined}
          isDeleting={deleteReminder.isPending}
        />
      </BottomSheet>
    </main>
  );
}
