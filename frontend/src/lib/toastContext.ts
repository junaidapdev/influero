import { createContext } from "react";

export type ToastVariant = "success" | "error" | "info";

// messageKey is an i18n catalog key, resolved with t() inside the toast — so
// every toast is localized and nothing raw ever reaches the screen.
export type ShowToast = (messageKey: string, variant?: ToastVariant) => void;

// `undefined` means "no ToastProvider above me" — useToast throws on that, which
// is a wiring bug, not a state.
export const ToastContext = createContext<ShowToast | undefined>(undefined);
