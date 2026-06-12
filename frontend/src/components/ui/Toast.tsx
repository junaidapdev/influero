import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

import type { ToastVariant } from "@/lib/toastContext";

type Props = {
  messageKey: string;
  variant: ToastVariant;
  onDismiss: () => void;
};

const VARIANT: Record<ToastVariant, { icon: typeof CheckCircle2; accent: string }> = {
  success: { icon: CheckCircle2, accent: "text-success-foreground" },
  error: { icon: AlertCircle, accent: "text-error-foreground" },
  info: { icon: Info, accent: "text-info-foreground" },
};

// Non-blocking confirmation/error toast. Fixed to the bottom of the viewport
// (position:fixed is necessary for an overlay; ui-rules' fixed-element list
// predates this toast — see ui-registry note). role="status" + aria-live polite
// so screen readers announce it without stealing focus.
export function Toast({ messageKey, variant, onDismiss }: Props) {
  const { t } = useTranslation();
  const { icon: Icon, accent } = VARIANT[variant];

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto inline-flex max-w-[400px] items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary shadow-card">
        <Icon className={`size-5 shrink-0 ${accent}`} aria-hidden />
        <span className="min-w-0">{t(messageKey)}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("common.dismiss")}
          className="ms-1 grid size-6 shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
