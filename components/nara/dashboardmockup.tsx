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
  valColor,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valColor?: string;
  subColor?: string;
}) {
  return (
    <div className="bg-nara-surface2 border border-nara-border rounded-lg p-3.5 flex flex-col justify-between">
      <span className="font-mono text-[9px] uppercase tracking-widest text-nara-muted mb-1">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-xl font-semibold leading-tight tabular-nums",
          valColor || "text-nara-text"
        )}
        suppressHydrationWarning
      >
        {value}
      </span>
      {sub && (
        <span
          className={cn(
            "font-mono text-[10px] mt-0.5",
            subColor || "text-nara-muted"
          )}
        >
          {sub}
        </span>
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

  // FIX: Look up the volume from the markets array safely
  const featuredVolume = markets.find((m) => m.id === featured.id)?.volume || 0;

  return (
    <BrowserMockup url="nara.ng/markets" className={className}>
      {/* Dashboard Nav Layer */}
      <div className="flex items-center justify-between border-b border-nara-border bg-nara-black px-5 py-2.5">
        <div className="flex items-center gap-6">
          <span className="font-sans text-[13px] font-bold tracking-tight">
            na<span className="text-nara-amber">ra</span>
          </span>
          <nav className="hidden gap-5 font-mono text-[11px] uppercase tracking-widest text-nara-muted md:flex">
            <span className="text-nara-text">Markets</span>
            <span className="hover:text-nara-text/80 transition-colors cursor-pointer">Naira</span>
            <span className="hover:text-nara-text/80 transition-colors cursor-pointer">Sharp Money</span>
            <span className="hover:text-nara-text/80 transition-colors cursor-pointer">History</span>
          </nav>
        </div>
        <LiveDot />
      </div>

      {/* Dashboard Body Layer */}
      <div className="bg-nara-surface p-4 md:p-5">
        {/* Stats Grid */}
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat 
            label="Total Volume" 
            value={fmtVol(stats.volume)} 
            sub="rolling 7d" 
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
            value={`${stats.sharpest >= 0 ? "+" : ""}${stats.sharpest}%`}
            valColor="text-nara-amber"
            sub="24h move"
          />
          <Stat
            label="Resolving Soon"
            value={String(stats.resolvingSoon)}
            sub="this week"
          />
        </div>

        {/* Main Grid: Chart + Markets */}
        <div
          className={cn(
            "grid gap-2.5 md:grid-cols-[3fr_2fr]",
            compact ? "md:[grid-template-rows:auto]" : ""
          )}
        >
          {/* Chart Area */}
          <div className="bg-nara-surface2 border border-nara-border rounded-xl p-4">
            <DataLabel className="mb-3 block truncate">
              {featured.title}
            </DataLabel>
            
            <div className={cn("w-full relative", compact ? "h-[100px]" : "h-[140px]")}>
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF9F27" stopOpacity={0.25} />
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
                      tick={{ fill: "#8A8490", fontSize: 10, fontFamily: "Geist Mono" }}
                      axisLine={{ stroke: "#2A2A38" }}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={[yMin, yMax]}
                      tick={{ fill: "#8A8490", fontSize: 10, fontFamily: "Geist Mono" }}
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

            <div className="mt-3 flex items-center justify-between">
              <div
                className="font-mono text-lg font-semibold text-nara-amber tabular-nums"
                suppressHydrationWarning
              >
                {featured.yes.toFixed(1)}% YES
              </div>
              <span className="font-mono text-[10px] text-nara-muted">
                VOL ₦{fmtVol(featuredVolume)} · Live
              </span>
            </div>
          </div>

          {/* Top Markets List */}
          <div className="bg-nara-surface2 border border-nara-border rounded-xl p-4">
            <DataLabel className="mb-3 block">Top markets by volume</DataLabel>
            <ul className="flex flex-col gap-2">
              {markets.slice(0, compact ? 4 : 5).map((m) => {
                const oddsColor = m.yes >= 60 ? "text-nara-amber" : m.yes >= 40 ? "text-nara-green" : "text-nara-red";
                return (
                  <li 
                    key={m.id} 
                    className="bg-nara-black border border-nara-border rounded-md px-3 py-2.5 flex items-center gap-3"
                  >
                    <span className="truncate text-[11px] font-medium text-nara-text flex-1">
                      {m.name}
                    </span>
                    <div className="w-12 shrink-0">
                      <OddsBar value={m.yes} />
                    </div>
                    <span className={cn("font-mono text-[11px] font-semibold w-9 text-right tabular-nums", oddsColor)}>
                      {m.yes.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </BrowserMockup>
  );
}
