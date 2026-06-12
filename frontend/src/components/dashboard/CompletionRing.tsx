type Props = {
  percent: number; // 0–100, drives the arc length
  label: string; // pre-formatted + localized (e.g. "50%" / "٥٠٪")
  size?: number;
  strokeWidth?: number;
  // "default" = accent-on-surface (the profile banner); "onAccent" = white
  // stroke on a translucent white track, for the violet hero card (Feature 14
  // — ui-tokens: "inner ring: white stroke on a translucent track").
  tone?: "default" | "onAccent";
  // Optional second line under the percent (the hero ring's "Collection rate"
  // — F17). When set, the label shifts up to make room.
  caption?: string;
  // Percent text size; defaults to the small banner size. The big hero ring
  // passes a larger token (e.g. "text-2xl font-bold").
  labelClassName?: string;
};

const TONE = {
  default: {
    track: "stroke-border-light",
    progress: "stroke-accent",
    text: "fill-text-primary",
    trackOpacity: undefined,
  },
  onAccent: {
    track: "stroke-text-on-accent",
    progress: "stroke-text-on-accent",
    text: "fill-text-on-accent",
    trackOpacity: 0.3,
  },
} as const;

// Small circular progress ring for the profile-completion banner and the hero
// card's collection rate. Presentational only — the caller computes the
// percent and formats the label. Decorative (aria-hidden): the surrounding
// text carries the meaning for screen readers, so the ring doesn't
// double-announce.
export function CompletionRing({
  percent,
  label,
  size = 52,
  strokeWidth = 5,
  tone = "default",
  caption,
  labelClassName = "text-micro font-semibold",
}: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);
  const colors = TONE[tone];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-hidden
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeOpacity={colors.trackOpacity}
        className={colors.track}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${center} ${center})`}
        className={`${colors.progress} transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none`}
      />
      {caption ? (
        <>
          <text
            x={center}
            y={center - size * 0.06}
            dominantBaseline="middle"
            textAnchor="middle"
            className={`${colors.text} ${labelClassName}`}
          >
            {label}
          </text>
          <text
            x={center}
            y={center + size * 0.15}
            dominantBaseline="middle"
            textAnchor="middle"
            className={`${colors.text} text-micro opacity-80`}
          >
            {caption}
          </text>
        </>
      ) : (
        <text
          x={center}
          y={center}
          dominantBaseline="central"
          textAnchor="middle"
          className={`${colors.text} ${labelClassName}`}
        >
          {label}
        </text>
      )}
    </svg>
  );
}
