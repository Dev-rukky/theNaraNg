// components/nara/chart.tsx
// Shared Recharts styling, so every chart follows the light/dark theme.
import { cn } from "@/lib/utils";

/**
 * Put this on the element wrapping <ResponsiveContainer>. The area, gradient and
 * cursor use `currentColor` (text-nara-amber); grid, axis lines and tick labels
 * are coloured by these classes instead of hard-coded hex.
 */
export const CHART_THEME = cn(
  "font-mono text-nara-amber",
  "[&_.recharts-cartesian-grid_line]:stroke-nara-border",
  "[&_.recharts-cartesian-axis-line]:stroke-nara-border",
  "[&_.recharts-cartesian-axis-tick-value]:fill-nara-muted",
);

/** Theme-aware tooltip: "14:00 · 45.2% YES". Use as <Tooltip content={<ChartTooltip />} />. */
export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
}) {
  const value = payload?.[0]?.value;
  if (!active || typeof value !== "number") return null;
  return (
    <div className="rounded-lg border border-nara-border bg-nara-surface2 px-2.5 py-1.5 font-mono text-[11px] shadow-lg">
      <div className="text-nara-muted">{label}</div>
      <div className="text-nara-amber">{value.toFixed(1)}% YES</div>
    </div>
  );
}

/** SVG-safe id from React's useId() (which can contain ":" or "«»"). */
export function svgId(prefix: string, reactId: string) {
  return `${prefix}-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}