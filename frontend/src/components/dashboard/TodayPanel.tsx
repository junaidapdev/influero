import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useTodayMeetings, useTodayReminders } from "@/hooks/useTodayItems";
import { useDismissReminder } from "@/hooks/useReminders";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { formatTime } from "@/lib/date";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/constants/routes";
import {
  isTodayItemOverdue,
  mergeTodayItems,
  type TodayItem,
} from "@/features/dashboard/todayItems";
import {
  REMINDER_KIND,
  REMINDER_REF_TABLE,
  type Reminder,
} from "@shared/types/reminder.types";

const MINUTE_MS = 60 * 1000;
const MIN_CLOCK_DELAY_MS = 1 * 1000;
const CLOCK_SETTLE_MS = 100;

// Leading-edge stripe per row kind — the ui-tokens "Row-Card Left Stripe"
// table: meeting=accent, payment due=warning, overdue payment=error, deal
// reminders (deliverable/shoot/post)=info. A custom reminder has no table row;
// it rides the meeting/default accent.
function reminderStripe(reminder: Reminder, overdue: boolean): string {
  if (reminder.kind === REMINDER_KIND.PAYMENT) {
    return overdue ? "border-s-error" : "border-s-warning";
  }
  if (
    reminder.kind === REMINDER_KIND.DELIVERABLE ||
    reminder.kind === REMINDER_KIND.SHOOT ||
    reminder.kind === REMINDER_KIND.POST
  ) {
    return "border-s-info";
  }
  return "border-s-accent";
}

// The neutral type badge (build-plan: "type badges (meeting / payment /
// deliverable)") — a chip, not a status pill: the stripe carries the color
// semantics, so this stays in the neutral family like the profile banner tags.
function TypeBadge({ labelKey }: { labelKey: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex shrink-0 rounded-full border border-border-light bg-surface-secondary px-2.5 py-1 text-micro font-medium text-text-secondary">
      {t(labelKey)}
    </span>
  );
}

// Time pill: the meeting time-pill family (info) while upcoming; the error
// pairing once past due, labelled "Overdue" — a stale clock time would mislead.
function TimePill({ label, overdue }: { label: string; overdue: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-1 text-body font-semibold ${
        overdue
          ? "bg-error-light text-error-foreground"
          : "bg-info-light text-info-foreground"
      }`}
    >
      {label}
    </span>
  );
}

const REMINDER_TYPE_KEY: Record<Reminder["kind"], string> = {
  meeting: "dashboard.today.type.meeting",
  payment: "dashboard.today.type.payment",
  deliverable: "dashboard.today.type.deliverable",
  custom: "dashboard.today.type.custom",
  shoot: "dashboard.today.type.shoot",
  post: "dashboard.today.type.post",
};

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function addPendingId(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids);
  next.add(id);
  return next;
}

function removePendingId(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids);
  next.delete(id);
  return next;
}

function isSameLocalDate(leftIso: string, rightIso: string): boolean {
  const left = new Date(leftIso);
  const right = new Date(rightIso);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function nextClockDelay(items: TodayItem[], nowIso: string): number {
  const now = new Date(nowIso).getTime();
  const nextDue = items
    .map((item) => new Date(item.dueAt).getTime())
    .filter((dueAt) => dueAt > now)
    .sort((a, b) => a - b)[0];
  const nextMinute = Math.ceil(now / MINUTE_MS) * MINUTE_MS;
  const nextTick = Math.min(nextDue ?? nextMinute, nextMinute);
  return Math.max(
    MIN_CLOCK_DELAY_MS,
    Math.min(nextTick - now + CLOCK_SETTLE_MS, MINUTE_MS),
  );
}

function reminderRoute(reminder: Reminder): string | null {
  if (
    reminder.kind === REMINDER_KIND.PAYMENT ||
    reminder.ref_table === REMINDER_REF_TABLE.PAYMENTS
  ) {
    return ROUTES.PAYMENTS;
  }
  if (
    reminder.kind === REMINDER_KIND.DELIVERABLE ||
    reminder.kind === REMINDER_KIND.SHOOT ||
    reminder.kind === REMINDER_KIND.POST ||
    reminder.ref_table === REMINDER_REF_TABLE.AD_DEALS
  ) {
    return ROUTES.DEALS;
  }
  if (
    reminder.kind === REMINDER_KIND.MEETING ||
    reminder.ref_table === REMINDER_REF_TABLE.MEETINGS
  ) {
    return ROUTES.MEETINGS;
  }
  // A user-authored quick reminder — its management surface is the /reminders
  // page (edit / delete / re-open all live there).
  if (reminder.kind === REMINDER_KIND.CUSTOM) {
    return ROUTES.REMINDERS;
  }
  return null;
}

// The dashboard Today panel — meetings + reminders due in the next 24h (plus
// past-due undismissed reminders), one chronological list of row cards.
// Meeting rows link to /meetings; reminder rows carry the bilingual message
// and a Done (dismiss) action — the is_done writer decided in Feature 14.
// Self-contained: owns its queries, loading/error/empty states, and toasts.
export function TodayPanel() {
  const { t } = useTranslation();
  const { isArabic, locale } = useLocale();
  const navigate = useNavigate();
  const showToast = useToast();
  const meetingsQuery = useTodayMeetings();
  const remindersQuery = useTodayReminders();
  const dismissReminder = useDismissReminder();
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const [dismissingReminderIds, setDismissingReminderIds] = useState(
    () => new Set<string>(),
  );

  const items = useMemo(
    () => mergeTodayItems(meetingsQuery.data ?? [], remindersQuery.data ?? []),
    [meetingsQuery.data, remindersQuery.data],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setNowIso(new Date().toISOString());
    }, nextClockDelay(items, nowIso));

    return () => window.clearTimeout(timeout);
  }, [items, nowIso]);

  function handleDismiss(reminder: Reminder): void {
    if (dismissingReminderIds.has(reminder.id)) return;

    setDismissingReminderIds((ids) => addPendingId(ids, reminder.id));
    dismissReminder.mutate(reminder, {
      onError: (error) => {
        logger.error("TodayPanel.dismiss", error);
        showToast("dashboard.toast.dismissError", "error");
      },
      onSettled: () => {
        setDismissingReminderIds((ids) => removePendingId(ids, reminder.id));
      },
    });
  }

  function handleReminderKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    route: string,
  ): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navigate(route);
  }

  function upcomingTimeLabel(dueAt: string): string {
    const time = formatTime(dueAt, locale);
    return isSameLocalDate(dueAt, nowIso)
      ? time
      : t("dashboard.today.tomorrowTime", { time });
  }

  function renderItem(item: TodayItem) {
    const overdue = isTodayItemOverdue(item, nowIso);

    if (item.type === "meeting") {
      return (
        <Link
          key={`meeting-${item.meeting.id}`}
          to={ROUTES.MEETINGS}
          className="flex min-h-16 items-center gap-3 rounded-lg border border-border border-s-4 border-s-accent bg-surface px-4 py-3.5 shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <TimePill label={upcomingTimeLabel(item.dueAt)} overdue={false} />
          <p className="min-w-0 flex-1 truncate text-row font-semibold text-text-primary">
            {item.meeting.title}
          </p>
          <TypeBadge labelKey="dashboard.today.type.meeting" />
          <ChevronRight
            className="size-5 shrink-0 text-text-muted rtl:-scale-x-100"
            aria-hidden="true"
          />
        </Link>
      );
    }

    const { reminder } = item;
    const route = reminderRoute(reminder);
    const isDismissing = dismissingReminderIds.has(reminder.id);
    const message = isArabic ? reminder.message_ar : reminder.message_en;
    const rowClassName = `flex min-h-16 items-center gap-3 rounded-lg border border-border border-s-4 bg-surface px-4 py-3.5 shadow-card ${reminderStripe(reminder, overdue)} ${
      route
        ? "cursor-pointer transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        : ""
    }`;

    return (
      <div
        key={`reminder-${reminder.id}`}
        role={route ? "link" : undefined}
        tabIndex={route ? 0 : undefined}
        aria-label={
          route
            ? t("dashboard.today.openReminderAria", { title: message })
            : undefined
        }
        onClick={route ? () => navigate(route) : undefined}
        onKeyDown={
          route ? (event) => handleReminderKeyDown(event, route) : undefined
        }
        className={rowClassName}
      >
        <TimePill
          label={
            overdue
              ? t("dashboard.today.overdueAt", {
                  time: formatTime(item.dueAt, locale),
                })
              : upcomingTimeLabel(item.dueAt)
          }
          overdue={overdue}
        />
        <p className="min-w-0 flex-1 truncate text-row font-semibold text-text-primary">
          {message}
        </p>
        <TypeBadge labelKey={REMINDER_TYPE_KEY[reminder.kind]} />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleDismiss(reminder);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          disabled={isDismissing}
          aria-label={t("dashboard.today.doneAria", { title: message })}
          className="grid size-11 shrink-0 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary hover:text-success-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
        >
          <Check className="size-5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-text-primary">
        {t("dashboard.today.title")}
      </h2>

      {meetingsQuery.isLoading && remindersQuery.isLoading ? (
        <TodaySkeleton />
      ) : meetingsQuery.isError && remindersQuery.isError ? (
        <Card>
          <p className="text-sm text-error-foreground">
            {t("dashboard.today.loadError")}
          </p>
        </Card>
      ) : items.length === 0 &&
        (meetingsQuery.isLoading || remindersQuery.isLoading) ? (
        <TodaySkeleton />
      ) : items.length === 0 &&
        !meetingsQuery.isError &&
        !remindersQuery.isError ? (
        <Card>
          <EmptyState icon={CheckCircle2} message={t("dashboard.today.empty")} />
        </Card>
      ) : (
        <>
          {meetingsQuery.isError ? (
            <Card>
              <p className="text-sm text-error-foreground">
                {t("dashboard.today.meetingsLoadError")}
              </p>
            </Card>
          ) : null}
          {remindersQuery.isError ? (
            <Card>
              <p className="text-sm text-error-foreground">
                {t("dashboard.today.remindersLoadError")}
              </p>
            </Card>
          ) : null}
          {items.map(renderItem)}
        </>
      )}
    </section>
  );
}
