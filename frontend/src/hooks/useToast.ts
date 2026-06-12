import { useContext } from "react";

import { ToastContext, type ShowToast } from "@/lib/toastContext";

// Reads the app-wide toast trigger from ToastProvider. Throwing when the
// provider is missing turns a silently-dropped toast into a loud wiring error.
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return show;
}
