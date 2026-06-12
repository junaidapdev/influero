import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

// The app's reusable overlay-form container. Slides up from the bottom edge over
// a scrim; the FAB's future Quick Add sheet reuses it too. Dismisses via the
// scrim, Escape, or the close button. While open it locks body scroll, traps
// Tab focus, and moves focus inside. position: fixed is sanctioned by ui-rules'
// fixed-element allowlist (the bottom-sheet scrim). Capped at 640px and centered
// to stay phone-shaped on wider screens.
export function BottomSheet({ open, onClose, title, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [entered, setEntered] = useState(false);
  const { t } = useTranslation();

  // Keep the latest onClose without making it an effect dependency — otherwise a
  // parent re-render (e.g. a mutation flipping isPending while the sheet is open)
  // would re-run the open effect and steal focus back to the first field.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    // The element that opened the sheet (captured before focus moves inside), so
    // focus returns to it on close — keyboard/SR users aren't dropped to <body>.
    const trigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function handleEscape(event: globalThis.KeyboardEvent): void {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", handleEscape);

    // Animate in on the next frame (mounted at translate-y-full, then to 0) and
    // move focus to the first field inside the sheet.
    const enterFrame = requestAnimationFrame(() => setEntered(true));
    const focusFrame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });

    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
      cancelAnimationFrame(enterFrame);
      cancelAnimationFrame(focusFrame);
      setEntered(false);
      trigger?.focus();
    };
  }, [open]);

  function handleTabTrap(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusables || focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-scrim" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleTabTrap}
        className={`relative w-full max-w-[640px] rounded-t-2xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-card transition-transform duration-300 motion-reduce:transition-none ${
          entered ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-muted"
          aria-hidden="true"
        />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-base font-semibold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="-me-2 -mt-1 grid size-9 place-items-center rounded-md text-text-secondary hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
