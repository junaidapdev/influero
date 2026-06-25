import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/layout/PageHeader";
import { IncompleteProfileBanner } from "@/components/dashboard/IncompleteProfileBanner";
import { MonthTotalsBar } from "@/components/dashboard/MonthTotalsBar";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { NeedsAttentionPanel } from "@/components/dashboard/NeedsAttentionPanel";
import { useAppUser } from "@/hooks/useAppUser";
import { currentMonth } from "@/features/meetings/calendar";

// The real dashboard (Feature 14): the "Hi, {name}" greeting now leads the
// page's own PageHeader (it used to live in the app shell), and the month label
// sits in the hero pill — so the page is the greeting plus the stacked data
// sections: month totals (hero + tiles), Today, and Needs attention.
export function DashboardRoute() {
  const { t } = useTranslation();
  const appUserQuery = useAppUser();
  const month = currentMonth();

  const greetingName =
    appUserQuery.data?.display_name?.trim() || t("dashboard.greetingFallback");

  return (
    <main className="min-h-dvh bg-background px-4 pb-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <PageHeader eyebrow={t("dashboard.greeting")} title={greetingName} />

        <IncompleteProfileBanner />

        <MonthTotalsBar month={month} />

        <TodayPanel />

        <NeedsAttentionPanel />
      </div>
    </main>
  );
}
