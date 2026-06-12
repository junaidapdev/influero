import { IncompleteProfileBanner } from "@/components/dashboard/IncompleteProfileBanner";
import { MonthTotalsBar } from "@/components/dashboard/MonthTotalsBar";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { NeedsAttentionPanel } from "@/components/dashboard/NeedsAttentionPanel";
import { currentMonth } from "@/features/meetings/calendar";

// The real dashboard (Feature 14; top section redesigned in F17): the greeting
// header (avatar + "Hi, {name}" + search/bell) now lives in the app shell and
// the month label moved into the hero pill, so the page is just the stacked
// data sections — month totals (hero + tiles), Today, and Needs attention.
export function DashboardRoute() {
  const month = currentMonth();

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <IncompleteProfileBanner />

        <MonthTotalsBar month={month} />

        <TodayPanel />

        <NeedsAttentionPanel />
      </div>
    </main>
  );
}
