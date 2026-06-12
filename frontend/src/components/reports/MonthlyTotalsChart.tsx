import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLocale } from "@/hooks/useLocale";
import { formatSar } from "@/lib/currency";
import { formatCompactNumber } from "@/lib/numbers";
import { formatMonthShort } from "@/lib/date";
import type { MonthlyTotal } from "@/features/reports/report";

type Props = {
  // Last 12 months, oldest first. The caller (route now, hook later) owns order.
  data: MonthlyTotal[];
};

// Chart colors come from the design tokens as CSS variables — recharts paints
// SVG fills/strokes from real color values, so ui-tokens' "Charts (Recharts)"
// row is referenced via var() (the sanctioned token form) rather than Tailwind
// utility classes, which don't apply to SVG attributes.
const COLOR = {
  invoiced: "var(--color-accent)",
  collected: "var(--color-success)",
  grid: "var(--color-border)",
  axis: "var(--color-text-muted)",
} as const;

const CHART_TICK = { fontSize: 12, fill: COLOR.axis } as const;

function LegendSwatch({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <span className={`size-2.5 rounded-sm ${swatch}`} aria-hidden="true" />
      {label}
    </span>
  );
}

// The monthly invoiced-vs-collected bar chart (Feature 16). Presentational —
// the route supplies the data. RTL-tolerant per ui-tokens: in Arabic the X axis
// reverses and the Y axis moves to the trailing (right) edge so the chart reads
// right-to-left. Recharts v3 enables its accessibility layer by default
// (keyboard-navigable tooltips); the textual legend + tooltip carry the meaning.
export function MonthlyTotalsChart({ data }: Props) {
  const { t } = useTranslation();
  const { locale, isArabic } = useLocale();

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        label: formatMonthShort(row.month, locale),
        invoiced: row.invoicedSar,
        collected: row.collectedSar,
      })),
    [data, locale],
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        <LegendSwatch swatch="bg-accent" label={t("reports.monthly.invoiced")} />
        <LegendSwatch swatch="bg-success" label={t("reports.monthly.collected")} />
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={COLOR.grid}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              reversed={isArabic}
              tick={CHART_TICK}
              tickLine={false}
              axisLine={{ stroke: COLOR.grid }}
              interval="preserveStartEnd"
            />
            <YAxis
              orientation={isArabic ? "right" : "left"}
              tick={CHART_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => formatCompactNumber(value, locale)}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-secondary)" }}
              formatter={(value) => formatSar(Number(value), locale)}
              contentStyle={{
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="invoiced"
              name={t("reports.monthly.invoiced")}
              fill={COLOR.invoiced}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="collected"
              name={t("reports.monthly.collected")}
              fill={COLOR.collected}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
