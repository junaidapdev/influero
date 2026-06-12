type Props = {
  // The series to plot, oldest-first.
  values: number[];
  // Accessible description — the hero's invoiced number is the content; the
  // sparkline adds trend, so it's a labelled img rather than decorative.
  label: string;
  // Mirror horizontally for RTL so the timeline flows right-to-left (the latest
  // month sits at the trailing/left edge in Arabic).
  reversed?: boolean;
};

// Normalized coordinate space; preserveAspectRatio="none" stretches it to the
// hero's full width at a fixed CSS height, and non-scaling-stroke keeps the line
// crisp regardless of that stretch.
const VIEW_W = 100;
const VIEW_H = 32;
const PAD_Y = 4;

// A tiny hand-rolled trend line for the dashboard hero (Feature 16). Deliberately
// NOT recharts: pulling the lazy chart chunk onto the landing page for a 12-point
// line would defeat the reason it's lazy-loaded — and the CompletionRing already
// sets the hand-rolled-SVG precedent here. Presentational; the caller supplies
// the series (the shared useMonthlyTotals invoiced series) and the locale mirror.
// Stroke is currentColor so it inherits the hero's on-accent text color.
export function Sparkline({ values, label, reversed = false }: Props) {
  if (values.length < 2) return null;

  const series = reversed ? [...values].reverse() : values;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min;

  const points = series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * VIEW_W;
      // Flat line through the middle when every value is equal (e.g. all zero).
      const ratio = span === 0 ? 0.5 : (value - min) / span;
      const y = VIEW_H - PAD_Y - ratio * (VIEW_H - PAD_Y * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className="h-9 w-full text-text-on-accent"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.85}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
