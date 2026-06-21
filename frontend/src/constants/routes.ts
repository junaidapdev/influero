// Every route path in one place — never hard-coded in components, hooks, or
// navigation. The full map is declared up front so later features wire links
// without editing call sites.
export const ROUTES = {
  ROOT: "/",
  LOGIN: "/login",
  AUTH_CALLBACK: "/auth-callback",
  DASHBOARD: "/dashboard",
  DEALS: "/deals",
  BRANDS: "/brands",
  // React Router pattern for the detail route; build a concrete path with
  // brandPath(id). The :id segment is the first parametrized route in the app.
  BRAND_DETAIL: "/brands/:id",
  PAYMENTS: "/payments",
  EXPENSES: "/expenses",
  MEETINGS: "/meetings",
  ANALYTICS_SNAP: "/analytics/snap",
  REPORTS: "/reports",
  SETTINGS: "/settings",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

// Concrete path builder for the brand detail route — used by links/navigation so
// the :id pattern never gets interpolated by hand at a call site.
export function brandPath(id: string): string {
  return `${ROUTES.BRANDS}/${id}`;
}
