import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  // Accessible label — the button is icon-only, so this is the only name.
  label: string;
  onClick: () => void;
  // Accent the button (border + glyph) to signal an active state — e.g. the
  // Deals filter funnel when any filter is applied.
  active?: boolean;
  // Mirror the glyph under RTL (chevrons / directional arrows). Off for
  // symmetric icons like the plus or the funnel.
  mirror?: boolean;
  disabled?: boolean;
};

// The square white icon-button in the page header (back chevron, filter funnel,
// add) — the secondary-Button surface (bg-surface + border) shaped as a 48px
// rounded square so it balances the solid-accent ProfileAvatar beside it.
export function HeaderIconButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  mirror = false,
  disabled = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      className={`grid size-12 shrink-0 place-items-center rounded-2xl border bg-surface shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60 ${
        active ? "border-accent text-accent" : "border-border text-text-primary"
      }`}
    >
      <Icon
        className={`size-5 ${mirror ? "rtl:-scale-x-100" : ""}`}
        aria-hidden="true"
      />
    </button>
  );
}
