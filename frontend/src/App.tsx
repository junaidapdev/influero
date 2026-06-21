import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { EntryRoute } from "@/routes/index";
import { LoginRoute } from "@/routes/login";
import { AuthCallbackRoute } from "@/routes/auth-callback";
import { DashboardRoute } from "@/routes/dashboard";
import { SettingsRoute } from "@/routes/settings";
import { DealsRoute } from "@/routes/deals";
import { PaymentsRoute } from "@/routes/payments";
import { ExpensesRoute } from "@/routes/expenses";
import { MeetingsRoute } from "@/routes/meetings";
import { BrandsRoute } from "@/routes/brands/index";
import { BrandDetailRoute } from "@/routes/brands/[id]";
import { SnapAnalyticsRoute } from "@/routes/analytics/snap";
import { ReportsRoute } from "@/routes/reports";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// One layout route gates auth once and wraps every in-app page in the shell
// (bottom tab bar + FAB Quick Add + profile menu). Login / entry / callback stay
// outside it — no chrome on the auth screens.
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <Routes>
      <Route path={ROUTES.ROOT} element={<EntryRoute />} />
      <Route path={ROUTES.LOGIN} element={<LoginRoute />} />
      <Route path={ROUTES.AUTH_CALLBACK} element={<AuthCallbackRoute />} />

      <Route element={<ProtectedLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardRoute />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsRoute />} />
        <Route path={ROUTES.DEALS} element={<DealsRoute />} />
        <Route path={ROUTES.PAYMENTS} element={<PaymentsRoute />} />
        <Route path={ROUTES.EXPENSES} element={<ExpensesRoute />} />
        <Route path={ROUTES.MEETINGS} element={<MeetingsRoute />} />
        <Route path={ROUTES.BRANDS} element={<BrandsRoute />} />
        <Route path={ROUTES.BRAND_DETAIL} element={<BrandDetailRoute />} />
        <Route path={ROUTES.ANALYTICS_SNAP} element={<SnapAnalyticsRoute />} />
        <Route path={ROUTES.REPORTS} element={<ReportsRoute />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.ROOT} replace />} />
    </Routes>
  );
}
