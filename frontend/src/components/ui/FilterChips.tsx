type ChipItem<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  items: ChipItem<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
};

// The segmented control as a horizontally scrollable filter row (ui-rules:
// the All Deals chips — See all · In progress · …). Same container/active/
// inactive classes as LocaleToggle, the canonical segmented pattern; this
// variant scrolls when the chips outgrow a 375px screen — no wrap, no
// truncation of the active chip. `label` names the group for assistive tech.
export function FilterChips<T extends string>({
  items,
  value,
  onChange,
  label,
}: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex overflow-x-auto rounded-md bg-surface-muted p-1"
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={isActive}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive ? "bg-surface text-accent shadow-card" : "text-text-secondary"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
