type Props = {
  // 0–100. Clamped defensively so a bad ratio can't overflow the track.
  percent: number;
  // accent = activity progress (deliverables); success = money realized
  // (collection rate, Feature 16). Same physical bar — the fill color tells
  // the user which one they're looking at (ui-rules "Progress Indicators").
  fill?: "accent" | "success";
};

const FILL_CLASS: Record<NonNullable<Props["fill"]>, string> = {
  accent: "bg-accent",
  success: "bg-success",
};

// The shared 6px progress track. Decorative (aria-hidden) — the adjacent text
// label ("2/4", "32%") carries the meaning for assistive tech.
export function ProgressBar({ percent, fill = "accent" }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="h-1.5 w-full rounded-full bg-border-light" aria-hidden="true">
      <div
        className={`h-full rounded-full ${FILL_CLASS[fill]} transition-[width] duration-300 motion-reduce:transition-none`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
