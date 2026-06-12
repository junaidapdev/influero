import { useCallback, useRef, useState, type ReactNode } from "react";

import { Toast } from "@/components/ui/Toast";
import { ToastContext, type ShowToast, type ToastVariant } from "@/lib/toastContext";

type ActiveToast = { id: number; messageKey: string; variant: ToastVariant };

const AUTO_DISMISS_MS = 3000;

// Holds the app's single toast slot. One toast at a time (latest wins) is enough
// for v1 — every mutation surfaces its own success/error and they don't stack.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((messageKey, variant = "success") => {
    nextId.current += 1;
    const id = nextId.current;
    setToast({ id, messageKey, variant });

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // Only clear if a newer toast hasn't replaced this one.
      setToast((current) => (current?.id === id ? null : current));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Toast
          messageKey={toast.messageKey}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </ToastContext.Provider>
  );
}
