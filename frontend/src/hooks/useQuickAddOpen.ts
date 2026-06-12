import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Opens a route's Add sheet when the page was reached via the FAB Quick Add,
// which navigates with location.state.quickAdd = true. Effect-based (not
// mount-time) on purpose: tapping Quick Add → Deal while ALREADY on /deals
// pushes a new history entry without remounting the route, so a useState seed
// would miss it — the effect re-fires on the location change instead. The signal
// is consumed immediately (replace with state:null) so a refresh or a back-nav
// doesn't re-pop the sheet.
//
// `onOpen` must be stable (wrap in useCallback) — it's an effect dependency.
export function useQuickAddOpen(onOpen: () => void): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const requested = (location.state as { quickAdd?: boolean } | null)?.quickAdd;
    if (requested) {
      onOpen();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, onOpen]);
}
