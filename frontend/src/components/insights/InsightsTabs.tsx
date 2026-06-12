import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { FilterChips } from "@/components/ui/FilterChips";
import { ROUTES } from "@/constants/routes";

// The "Insights" segmented control shared by /reports and /analytics/snap — the
// two halves of the Insights tab (ui-rules: "Reports / Snap Analytics"). Reuses
// the canonical FilterChips segmented control, but each segment NAVIGATES
// between the two existing routes instead of toggling local state. Active value
// follows the current path. Rendered at the top of both pages.
export function InsightsTabs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const value =
    pathname === ROUTES.ANALYTICS_SNAP ? ROUTES.ANALYTICS_SNAP : ROUTES.REPORTS;

  return (
    <FilterChips
      items={[
        { value: ROUTES.REPORTS, label: t("reports.title") },
        { value: ROUTES.ANALYTICS_SNAP, label: t("snap.title") },
      ]}
      value={value}
      onChange={(next) => {
        if (next !== value) navigate(next);
      }}
      label={t("nav.insights")}
    />
  );
}
