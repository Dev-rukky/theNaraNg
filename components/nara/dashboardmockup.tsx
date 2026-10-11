// components/nara/dashboardmockup.tsx
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
import { useLandingData } from "@/lib/nara/uselandingdata";
import type { LandingData } from "@/lib/nara/bayse";
import { fmtVol } from "@/lib/nara/format";
import { cn } from "@/lib/utils";
import { CHART_THEME, ChartTooltip, svgId } from "./chart";
import { BrowserMockup, DataLabel, LiveDot, OddsBar } from "./primitives";

function oddsColor(yes: number) {
  return yes >= 60 ? "text-nara-amber" : yes >= 40 ? "text-nara-green" : "text-nara-red";
}

function signed(n: number) {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function Stat({
  label,
  value,
  sub,
  valColor = "text-nara-text",
  subColor = "text-nara-muted",
}: {
  label: string;
  value: string;
  sub?: string;
  valColor?: string;
  subColor?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-nara-border bg-nara-surface2 p-3.5">
      <span className="mb-1 font-mono text-[9px] uppercase tracking-widest text-nara-muted">{label}</span>
      <span className={cn("font-mono text-xl font-semibold leading-tight tabular-nums", valColor)}>
        {value}
      </span>
      {sub && <span className={cn("mt-0.5 font-mono text-[10px]", subColor)}>{sub}</span>}
    </div>
  );
}

export function DashboardMockup({
  initialData,
  compact = false,
  className,
}: {
  initialData: LandingData;
  compact?: boolean;
  className?: string;
}) {
  const { markets, stats, history, featured } = useLandingData(initialData);

  // Recharts measures the DOM, so the chart renders after mount (skeleton until then).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Unique per instance: two mockups on one page would otherwise share one gradient id.
  const gradientId = svgId("mockup-fill", useId());

  let yMin = 0;
  let yMax = 100;
  if (history.length) {
    const values = history.map((p) => p.crowd);
    yMin = Math.max(0, Math.floor(Math.min(...values) - 5));
    yMax = Math.min(100, Math.ceil(Math.max(...values) + 5));
  }

  const chartHeight = compact ? "h-[100px]" : "h-[140px]";

  return (
    <BrowserMockup url="nara.ng/markets" className={className}>
      {/* nav (decorative: it's a picture of the app, not a working menu) */}
      <div className="flex items-center justify-between border-b border-nara-border bg-nara-black px-5 py-2.5">
        <div className="flex items-center gap-6">
          <span className="font-sans text-[13px] font-bold tracking-tight">
            na<span className="text-nara-amber">ra</span>
          </span>
          <div
            aria-hidden
            className="hidden gap-5 font-mono text-[11px] uppercase tracking-widest text-nara-muted md:flex"
          >
            <span className="text-nara-text">Markets</span>
            <span>Naira</span>
            <span>Sharp Money</span>
            <span>History</span>
          </div>
        </div>
        <LiveDot />
      </div>

      <div className="bg-nara-surface p-4 md:p-5">
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat
            label="Total Volume"
            value={fmtVol(stats.volume)}
            sub={stats.volumeWindow === "7d" ? "rolling 7d" : "all time"}
            subColor="text-nara-green"
          />
          <Stat
            label="Active Markets"
            value={String(stats.markets)}
            sub="open on Bayse"
            subColor="text-nara-green"
          />
          <Stat
            label="Sharpest Move"
            value={signed(stats.sharpest)}
            valColor={stats.sharpest < 0 ? "text-nara-red" : "text-nara-amber"}
            sub="24h move"
          />
          <Stat label="Resolving Soon" value={String(stats.resolvingSoon)} sub="this week" />
        </div>

        <div className="grid gap-2.5 md:grid-cols-[3fr_2fr]">
          {/* featured market chart */}
          <div className="rounded-xl border border-nara-border bg-nara-surface2 p-4">
            <DataLabel className="mb-3 block truncate">{featured.title}</DataLabel>

            <div className={cn("relative w-full", chartHeight, CHART_THEME)}>
              {!mounted ? (
                <div className="h-full w-full animate-pulse rounded-md bg-nara-surface2/20" />
              ) : history.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-nara-muted">
                  No price history yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} minTickGap={24} />
                    <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ stroke: "currentColor", strokeDasharray: 3 }}
                      content={<ChartTooltip />}
                    />
                    <Area
                      type="monotone"
                      dataKey="crowd"
                      stroke="currentColor"
                      strokeWidth={2}
                      fill={`url(#${gradientId})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="font-mono text-lg font-semibold tabular-nums text-nara-amber">
                {featured.yes.toFixed(1)}% YES
              </div>
              <span className="font-mono text-[10px] text-nara-muted">
                VOL {fmtVol(featured.volume)} · Live
              </span>
            </div>
          </div>

          {/* top markets */}
          <div className="rounded-xl border border-nara-border bg-nara-surface2 p-4">
            <DataLabel className="mb-3 block">Top markets by volume</DataLabel>
            <ul className="flex flex-col gap-2">
              {markets.slice(0, compact ? 4 : 5).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-md border border-nara-border bg-nara-black px-3 py-2.5"
                >
                  <span className="flex-1 truncate text-[11px] font-medium text-nara-text">{m.name}</span>
                  <div className="w-12 shrink-0">
                    <OddsBar value={m.yes} />
                  </div>
                  <span
                    className={cn("w-9 text-right font-mono text-[11px] font-semibold tabular-nums", oddsColor(m.yes))}
                  >
                    {m.yes.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </BrowserMockup>
  );
}