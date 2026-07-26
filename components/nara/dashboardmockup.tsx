"use client";

import { useEffect, useState } from "react";
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
import { BrowserMockup, DataLabel, LiveDot, OddsBar } from "./primitives";
import { fmtVol } from "@/lib/nara/format";
import { cn } from "@/lib/utils";
import type { LandingData } from "@/lib/nara/bayse.function";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-r border-nara-border px-4 py-3 last:border-r-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">
        {label}
      </span>
      <span
        className="font-mono text-lg font-semibold text-nara-amber tabular-nums"
        suppressHydrationWarning
      >
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[10px] text-nara-muted">{sub}</span>
      )}
    </div>
  );
}

export function DashboardMockup({
  initialData,
  compact = false,
  className = "",
}: {
  initialData: LandingData;
  compact?: boolean;
  className?: string;
}) {
  const { markets, stats, history, featured } = useLandingData(initialData);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = mounted && history.length ? history : [];
  const yesValues = chartData.map((p) => p.crowd);
  const yMin = yesValues.length
    ? Math.max(0, Math.floor(Math.min(...yesValues) - 5))
    : 0;
  const yMax = yesValues.length
    ? Math.min(100, Math.ceil(Math.max(...yesValues) + 5))
    : 100;
  const deltaColor = featured.delta >= 0 ? "text-nara-green" : "text-nara-red";
  const deltaSign = featured.delta >= 0 ? "+" : "";

  return (
    <BrowserMockup url="nara.ng/markets" className={className}>
      <div className="flex items-center justify-between border-b border-nara-border px-5 py-3">
        <div className="flex items-center gap-6">
          <span className="font-sans text-[13px] font-semibold tracking-tight">
            na<span className="text-nara-amber">ra</span>
          </span>
          <nav className="hidden gap-5 font-mono text-[11px] uppercase tracking-widest text-nara-muted md:flex">
            <span className="text-nara-text">Markets</span>
            <span>Naira</span>
            <span>Sharp Money</span>
            <span>History</span>
          </nav>
        </div>
        <LiveDot />
      </div>

      <div className="grid grid-cols-2 border-b border-nara-border sm:grid-cols-4">
        <Stat label="Volume" value={fmtVol(stats.volume)} sub="rolling 7d" />
        <Stat
          label="Markets"
          value={String(stats.markets)}
          sub="open on Bayse"
        />
        <Stat
          label="Sharpest"
          value={`${stats.sharpest >= 0 ? "+" : ""}${stats.sharpest}%`}
          sub="24h move"
        />
        <Stat
          label="Resolving"
          value={String(stats.resolvingSoon)}
          sub="this week"
        />
      </div>

      <div
        className={cn(
          "grid gap-0 md:grid-cols-5",
          compact ? "md:[grid-template-rows:auto]" : "",
        )}
      >
        {/* Chart Area */}
        <div className="border-b border-nara-border p-5 md:col-span-3 md:border-b-0 md:border-r">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <DataLabel className="truncate">{featured.title}</DataLabel>
              <div
                className="mt-1 font-mono text-2xl font-semibold text-nara-amber tabular-nums"
                suppressHydrationWarning
              >
                {featured.yes.toFixed(1)}%{" "}
                <span className={`ml-1 font-mono text-xs ${deltaColor}`}>
                  {deltaSign}
                  {featured.delta.toFixed(1)}%
                </span>
              </div>
            </div>
            <span className="nara-amber-dot" />
          </div>

          <div className={cn("w-full", compact ? "h-[140px]" : "h-[200px]")}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#EF9F27"
                        stopOpacity={0.35}
                      />
                      <stop offset="100%" stopColor="#EF9F27" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#2A2A38"
                    strokeOpacity={0.4}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="t"
                    tick={{
                      fill: "#8A8490",
                      fontSize: 10,
                      fontFamily: "Geist Mono",
                    }}
                    axisLine={{ stroke: "#2A2A38" }}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    tick={{
                      fill: "#8A8490",
                      fontSize: 10,
                      fontFamily: "Geist Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "#EF9F27", strokeDasharray: 3 }}
                    contentStyle={{
                      background: "#1E1E28",
                      border: "1px solid #2A2A38",
                      borderRadius: 8,
                      fontFamily: "Geist Mono",
                      fontSize: 11,
                      color: "#F5F0E8",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="crowd"
                    stroke="#EF9F27"
                    strokeWidth={2}
                    fill="url(#amberFill)"
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full bg-nara-surface2/20 animate-pulse rounded-md" />
            )}
          </div>
        </div>

        <div className="p-5 md:col-span-2">
          <DataLabel>Top Markets</DataLabel>
          <ul className="mt-3 space-y-3">
            {markets.slice(0, compact ? 4 : 6).map((m) => (
              <li key={m.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[12px] text-nara-text">
                    {m.name}
                  </span>
                  <span className="font-mono text-[12px] font-semibold text-nara-amber tabular-nums">
                    {m.yes.toFixed(1)}%
                  </span>
                </div>
                <OddsBar value={m.yes} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </BrowserMockup>
  );
}
