import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { HeaderIconButton } from "@/components/layout/HeaderIconButton";
import { MeetingListItem } from "@/components/meetings/MeetingListItem";
import { MeetingForm } from "@/components/meetings/MeetingForm";
import { MeetingCalendar } from "@/components/meetings/MeetingCalendar";
import { FilterChips } from "@/components/ui/FilterChips";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  useCreateMeeting,
  useDeleteMeeting,
  useMeetingsForMonth,
  useUpdateMeeting,
} from "@/hooks/useMeetings";
import { useBrands } from "@/hooks/useBrands";
import { useDeals } from "@/hooks/useDeals";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { useQuickAddOpen } from "@/hooks/useQuickAddOpen";
import {
  formatDualDate,
  toDatetimeLocalValue,
  todayIsoLocal,
  formatMonthYear,
} from "@/lib/date";
import { logger } from "@/lib/logger";
import { MEETINGS_VIEW, type MeetingsView } from "@/constants/meetings";
import { addMonths, currentMonth, timestampDayKey } from "@/features/meetings/calendar";
import type { MeetingFormInput } from "@/features/meetings/meeting.schema";
import { DEAL_STATUS, type Deal } from "@shared/types/deal.types";
import type { Meeting } from "@shared/types/meeting.types";

const EMPTY_MEETING_FORM: MeetingFormInput = {
  title: "",
  scheduledAt: "",
  locationOrLink: "",
  attendees: [],
  brandId: "",
  dealId: "",
  notes: "",
};

// Deals a meeting can link to — the same active set the payment form uses
// (second copy; extract to constants on the third, per the review convention).
const ACTIVE_DEAL_STATUSES: ReadonlySet<Deal["status"]> = new Set([
  DEAL_STATUS.PENDING,
  DEAL_STATUS.SHOT,
  DEAL_STATUS.POSTED,
]);

function toMeetingFormInput(meeting: Meeting): MeetingFormInput {
  return {
    title: meeting.title,
    scheduledAt: toDatetimeLocalValue(meeting.scheduled_at),
    locationOrLink: meeting.location_or_link ?? "",
    attendees: meeting.attendees.map((attendee) => ({
      name: attendee.name,
      contact: attendee.contact ?? "",
    })),
    brandId: meeting.brand_id ?? "",
    dealId: meeting.deal_id ?? "",
    notes: meeting.notes ?? "",
  };
}

// The selected calendar day a month opens on: today when viewing the current
// month, else the 1st.
function initialSelectedDay(month: string): string {
  const today = todayIsoLocal();
  return today.startsWith(month) ? today : `${month}-01`;
}

function MeetingsSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function MeetingsRoute() {
  const { t } = useTranslation();
  const { locale, isArabic } = useLocale();
  const showToast = useToast();

  const [view, setView] = useState<MeetingsView>(MEETINGS_VIEW.LIST);
  const [month, setMonth] = useState<string>(currentMonth);
  const [selectedDay, setSelectedDay] = useState<string>(() =>
    initialSelectedDay(currentMonth()),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const meetingsQuery = useMeetingsForMonth(month);
  const brandsQuery = useBrands();
  const dealsQuery = useDeals({});
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();

  // FAB Quick Add → Meeting opens this route's Add sheet in create mode (even if
  // already here). Mirrors openCreate; the setters are stable so the callback is.
  const handleQuickAdd = useCallback(() => {
    setEditingMeeting(null);
    setDeleteConfirming(false);
    setSheetOpen(true);
  }, []);
  useQuickAddOpen(handleQuickAdd);

  const meetings = meetingsQuery.data ?? [];
  const ready = !meetingsQuery.isLoading && !meetingsQuery.isError;
  const isSubmitting = createMeeting.isPending || updateMeeting.isPending;

  const brands = brandsQuery.data ?? [];
  const brandNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const brand of brandsQuery.data ?? []) {
      map.set(brand.id, isArabic ? brand.name_ar : brand.name_en);
    }
    return map;
  }, [brandsQuery.data, isArabic]);

  const activeDeals = useMemo(
    () => (dealsQuery.data ?? []).filter((deal) => ACTIVE_DEAL_STATUSES.has(deal.status)),
    [dealsQuery.data],
  );

  const selectedDayMeetings = useMemo(
    () =>
      (meetingsQuery.data ?? []).filter(
        (meeting) => timestampDayKey(meeting.scheduled_at) === selectedDay,
      ),
    [meetingsQuery.data, selectedDay],
  );

  function changeMonth(delta: number): void {
    const next = addMonths(month, delta);
    setMonth(next);
    setSelectedDay(initialSelectedDay(next));
  }

  function openCreate(): void {
    setEditingMeeting(null);
    setDeleteConfirming(false);
    setSheetOpen(true);
  }

  function openEdit(meeting: Meeting): void {
    setEditingMeeting(meeting);
    setDeleteConfirming(false);
    setSheetOpen(true);
  }

  function closeSheet(): void {
    setSheetOpen(false);
    setDeleteConfirming(false);
  }

  function handleSubmit(data: MeetingFormInput): void {
    if (editingMeeting) {
      updateMeeting.mutate(
        { meetingId: editingMeeting.id, input: data },
        {
          onSuccess: (result) => {
            showToast(
              result.reminderFailed
                ? "meetings.toast.reminderFailed"
                : "meetings.toast.updated",
              result.reminderFailed ? "error" : "success",
            );
            closeSheet();
          },
          onError: (error) => {
            logger.error("MeetingsRoute.update", error);
            showToast("meetings.toast.error", "error");
          },
        },
      );
      return;
    }

    createMeeting.mutate(data, {
      onSuccess: (result) => {
        showToast(
          result.reminderFailed
            ? "meetings.toast.reminderFailed"
            : "meetings.toast.created",
          result.reminderFailed ? "error" : "success",
        );
        closeSheet();
      },
      onError: (error) => {
        logger.error("MeetingsRoute.create", error);
        showToast("meetings.toast.error", "error");
      },
    });
  }

  function handleDeleteMeeting(): void {
    if (!editingMeeting) return;
    deleteMeeting.mutate(editingMeeting, {
      onSuccess: () => {
        showToast("meetings.toast.deleted", "success");
        closeSheet();
      },
      onError: (error) => {
        logger.error("MeetingsRoute.delete", error);
        showToast("meetings.toast.deleteError", "error");
      },
    });
  }

  const selectedDayDual = formatDualDate(selectedDay, locale);

  return (
    <main className="min-h-dvh bg-background px-4 pb-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <PageHeader
          eyebrow={formatMonthYear(month, locale)}
          title={t("meetings.title")}
          action={
            ready ? (
              <HeaderIconButton
                icon={Plus}
                label={t("meetings.addMeeting")}
                onClick={openCreate}
              />
            ) : undefined
          }
        />

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label={t("meetings.monthNav.prev")}
            className="grid size-11 shrink-0 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </button>
          <p className="text-base font-semibold text-text-primary">
            {formatMonthYear(month, locale)}
          </p>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label={t("meetings.monthNav.next")}
            className="grid size-11 shrink-0 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        </div>

        <FilterChips
          items={[
            { value: MEETINGS_VIEW.LIST, label: t("meetings.view.list") },
            { value: MEETINGS_VIEW.CALENDAR, label: t("meetings.view.calendar") },
          ]}
          value={view}
          onChange={setView}
          label={t("meetings.view.label")}
        />

        {meetingsQuery.isLoading ? (
          <MeetingsSkeleton />
        ) : meetingsQuery.isError ? (
          <Card>
            <p className="text-sm text-error-foreground">{t("meetings.loadError")}</p>
          </Card>
        ) : view === MEETINGS_VIEW.LIST ? (
          meetings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              message={t("meetings.empty.list")}
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" aria-hidden="true" />
                  {t("meetings.empty.listCta")}
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {meetings.map((meeting) => (
                <MeetingListItem
                  key={meeting.id}
                  meeting={meeting}
                  brandName={
                    meeting.brand_id
                      ? brandNamesById.get(meeting.brand_id)
                      : undefined
                  }
                  onEdit={openEdit}
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-5">
            <Card>
              <MeetingCalendar
                month={month}
                meetings={meetings}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            </Card>

            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-text-primary">
                {selectedDayDual.primary}
                <span className="ms-2 text-xs font-normal text-text-muted">
                  {selectedDayDual.secondary}
                </span>
              </h2>
              {selectedDayMeetings.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("meetings.empty.day")}
                </p>
              ) : (
                selectedDayMeetings.map((meeting) => (
                  <MeetingListItem
                    key={meeting.id}
                    meeting={meeting}
                    brandName={
                      meeting.brand_id
                        ? brandNamesById.get(meeting.brand_id)
                        : undefined
                    }
                    onEdit={openEdit}
                    showDate={false}
                  />
                ))
              )}
            </section>
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingMeeting ? t("meetings.editMeeting") : t("meetings.addMeeting")}
      >
        <div className="flex flex-col gap-4">
          <MeetingForm
            brands={brands}
            deals={activeDeals}
            defaultValues={
              editingMeeting ? toMeetingFormInput(editingMeeting) : EMPTY_MEETING_FORM
            }
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel={
              editingMeeting ? t("meetings.actions.save") : t("meetings.actions.add")
            }
          />

          {editingMeeting ? (
            deleteConfirming ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteMeeting}
                  isLoading={deleteMeeting.isPending}
                  className="flex-1"
                >
                  {t("meetings.actions.confirmDelete")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDeleteConfirming(false)}
                  disabled={deleteMeeting.isPending}
                  className="flex-1"
                >
                  {t("meetings.actions.keepMeeting")}
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirming(true)}
                disabled={isSubmitting}
                className="w-full"
              >
                {t("meetings.actions.deleteMeeting")}
              </Button>
            )
          ) : null}
        </div>
      </BottomSheet>
    </main>
  );
}
