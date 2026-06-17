import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import {
  useBehindScheduleDeals,
  useOverduePayments,
} from "@/hooks/useNeedsAttention";
import { useDeals } from "@/hooks/useDeals";
import { useLocale } from "@/hooks/useLocale";
import { formatSar } from "@/lib/currency";
import {
  formatDualDate,
  formatDualTimestampDate,
  localDayOfIso,
  todayIsoLocal,
} from "@/lib/date";
import { ROUTES } from "@/constants/routes";
import type { Deal } from "@shared/types/deal.types";
import type { Payment } from "@shared/types/payment.types";

function AttentionSkeleton() {
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

const ROW_CLASSES =
  "flex min-h-16 items-center gap-3 rounded-lg border border-border border-s-4 bg-surface px-4 py-3.5 shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// The dashboard Needs-attention panel: overdue payments (past expected_date,
// not received — error stripe per the token table) and deals behind schedule
// (past post_date and un-posted, or past shoot_date and un-shot — the deal
// info stripe). Rows link to the page where the fix happens. Deal titles for
// payment rows resolve from the shared cached deals list (the /payments pattern
// — no join, no N+1). Self-contained: owns its queries and states.
export function NeedsAttentionPanel() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const today = todayIsoLocal();

  const overduePaymentsQuery = useOverduePayments();
  const behindDealsQuery = useBehindScheduleDeals();
  const dealsQuery = useDeals({});

  const dealTitlesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const deal of dealsQuery.data ?? []) {
      map.set(deal.id, deal.title);
    }
    return map;
  }, [dealsQuery.data]);

  const isInitialLoading =
    overduePaymentsQuery.isLoading || behindDealsQuery.isLoading;
  const isAnyLoading =
    overduePaymentsQuery.isLoading || behindDealsQuery.isLoading;
  const isAnyError =
    overduePaymentsQuery.isError || behindDealsQuery.isError;
  const isAllError =
    overduePaymentsQuery.isError && behindDealsQuery.isError;

  const overduePayments = overduePaymentsQuery.data ?? [];
  const behindDeals = behindDealsQuery.data ?? [];
  const hasRows = overduePayments.length > 0 || behindDeals.length > 0;

  function renderPayment(payment: Payment) {
    // The query filters expected_date < today, so it's never null here; the
    // fallback only guards the type.
    const due = payment.expected_date
      ? formatDualDate(payment.expected_date, locale)
      : null;
    return (
      <Link key={`payment-${payment.id}`} to={ROUTES.PAYMENTS} className={`${ROW_CLASSES} border-s-error`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-row font-semibold text-text-primary">
            {dealTitlesById.get(payment.deal_id) ?? "—"}
          </p>
          <p className="truncate text-body text-text-secondary">
            <span className="money">{formatSar(payment.amount_sar, locale)}</span>
            {due ? ` · ${due.primary}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-caption font-medium text-error-foreground">
          {t("dashboard.attention.overduePayment")}
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-text-muted rtl:-scale-x-100"
          aria-hidden="true"
        />
      </Link>
    );
  }

  function renderDeal(deal: Deal) {
    // Post overdue takes precedence over shoot overdue when both apply. shoot/
    // post are timestamptz now — compare by their viewer-LOCAL day (matching the
    // query) and render with the local-tz timestamp formatter.
    const postOverdue =
      deal.post_date !== null && localDayOfIso(deal.post_date) < today;
    const overdueDate = postOverdue ? deal.post_date : deal.shoot_date;
    const formatted = overdueDate
      ? formatDualTimestampDate(overdueDate, locale)
      : null;
    const labelKey = postOverdue
      ? "dashboard.attention.postOverdue"
      : "dashboard.attention.shootOverdue";
    return (
      <Link key={`deal-${deal.id}`} to={ROUTES.DEALS} className={`${ROW_CLASSES} border-s-info`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-row font-semibold text-text-primary">
            {deal.title}
          </p>
          {formatted ? (
            <p className="truncate text-body text-text-secondary">
              {formatted.primary}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-caption font-medium text-info-foreground">
          {t(labelKey)}
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-text-muted rtl:-scale-x-100"
          aria-hidden="true"
        />
      </Link>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-text-primary">
        {t("dashboard.attention.title")}
      </h2>

      {isInitialLoading && !hasRows ? (
        <AttentionSkeleton />
      ) : isAllError ? (
        <Card>
          <p className="text-sm text-error-foreground">
            {t("dashboard.attention.loadError")}
          </p>
        </Card>
      ) : !hasRows && !isAnyError && !isAnyLoading ? (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            message={t("dashboard.attention.empty")}
          />
        </Card>
      ) : (
        <>
          {overduePaymentsQuery.isError ? (
            <Card>
              <p className="text-sm text-error-foreground">
                {t("dashboard.attention.paymentsLoadError")}
              </p>
            </Card>
          ) : (
            overduePayments.map(renderPayment)
          )}
          {behindDealsQuery.isError ? (
            <Card>
              <p className="text-sm text-error-foreground">
                {t("dashboard.attention.dealsLoadError")}
              </p>
            </Card>
          ) : (
            behindDeals.map(renderDeal)
          )}
          {isAnyLoading ? <AttentionSkeleton /> : null}
        </>
      )}
    </section>
  );
}
