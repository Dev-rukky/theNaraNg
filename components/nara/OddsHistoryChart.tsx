// components/nara/OddsHistoryChart.tsx
"use client";

import { useEffect, useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getEventHistory } from "@/lib/nara/bayse-actions";
import type { HistoryPoint, HistoryRange } from "@/lib/nara/bayse";
import { fmtDelta } from "@/lib/nara/format";
import { cn } from "@/lib/utils";
import { CHART_THEME, ChartTooltip, svgId } from "./chart";
import { DeltaBadge } from "./primitives";

const RANGES: { id: HistoryRange; label: string }[] = [
  { id: "1W", label: "7D" },
  { id: "1M", label: "30D" },
];

/**
 * Loads each event + range once and keeps it, so switching 7D ↔ 30D and back
 * is instant. `initialSeries` (if non-empty) is used as the 7D data.
 */
function useEventHistory(eventId: string, range: HistoryRange, initialSeries: HistoryPoint[]) {
  const key = `${eventId}:${range}`;
  const [byKey, setByKey] = useState<Record<string, HistoryPoint[]>>({});
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const seeded = range === "1W" && initialSeries.length > 0 ? initialSeries : undefined;
  const series = byKey[key] ?? seeded;
  const hasData = series !== undefined;

  useEffect(() => {
    if (!eventId || hasData) return;
    let cancelled = false; // ignore a response that arrives after the user moved on
    setFailedKey(null);

    getEventHistory({ eventId, range })
      .then((res) => {
        if (!cancelled) setByKey((prev) => ({ ...prev, [key]: res }));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch odds history:", err);
        setFailedKey(key);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, range, key, hasData]);

  return {
    series: series ?? [],
    isLoading: !hasData && failedKey !== key,
    isError: failedKey === key,
  };
}

export function OddsHistoryChart({
  eventId,
  title,
  initialSeries = [],
  initialYes,
  initialDelta,
  eyebrow = "Odds history",
}: {
  eventId: string;
  title: string;
  initialSeries?: HistoryPoint[];
  /** Current YES %, shown as the headline number. */
  initialYes: number;
  /** Shown until history loads (and if it can't). */
  initialDelta: number;
  eyebrow?: string;
}) {
  const [range, setRange] = useState<HistoryRange>("1W");
  const { series, isLoading, isError } = useEventHistory(eventId, range, initialSeries);
  const gradientId = svgId("odds-fill", useId());

  // Change over the selected range, in percentage points (same unit as the rest of the app).
  const rangeDelta =
    series.length >= 2
      ? Math.round((series[series.length - 1].crowd - series[0].crowd) * 10) / 10
      : null;
  const rangeLabel = RANGES.find((r) => r.id === range)?.label ?? range;

  return (
    <section className="rounded-2xl border border-nara-border bg-nara-surface p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">{eyebrow}</div>
          <div className="mt-1 text-lg font-medium">{title}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-3xl font-semibold tabular-nums text-nara-amber">
              {initialYes.toFixed(1)}%
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <DeltaBadge value={rangeDelta ?? initialDelta} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">
                {rangeDelta === null ? "24h" : rangeLabel}
              </span>
            </div>
          </div>
          <RangeToggle value={range} onChange={setRange} />
        </div>
      </div>

      <div
        className={cn("relative h-[260px] transition-opacity", CHART_THEME, isLoading && "opacity-60")}
        aria-busy={isLoading}
      >
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} minTickGap={32} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ stroke: "currentColor", strokeDasharray: 3 }} content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="crowd"
                stroke="currentColor"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[11px] uppercase tracking-widest text-nara-muted">
            {isLoading ? "Loading history…" : isError ? "Couldn't load history" : "No price history yet"}
          </div>
        )}
      </div>

      {rangeDelta !== null && (
        <p className="sr-only">
          {title}: {initialYes.toFixed(1)}% YES, {fmtDelta(rangeDelta)} over {rangeLabel}.
        </p>
      )}
    </section>
  );
}

function RangeToggle({ value, onChange }: { value: HistoryRange; onChange: (r: HistoryRange) => void }) {
  return (
    <div
      role="group"
      aria-label="History range"
      className="flex overflow-hidden rounded-md border border-nara-border bg-nara-surface2 font-mono text-[11px] uppercase tracking-widest"
    >
      {RANGES.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "px-3 py-1.5 transition-colors",
            value === o.id ? "bg-nara-amber/15 text-nara-amber" : "text-nara-muted hover:text-nara-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}