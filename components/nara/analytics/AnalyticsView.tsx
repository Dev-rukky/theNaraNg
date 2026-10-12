// components/nara/analytics/AnalyticsView.tsx
"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Radio } from "lucide-react";
import { DegradedBanner } from "@/components/nara/DegradedBanner";
import { DeltaBadge } from "@/components/nara/primitives";
import { CHART_THEME, ChartTooltip, svgId } from "@/components/nara/chart";
import { gsap, useGSAP } from "@/lib/nara/gsap";
import type { AnalyticsSummary, Bucket, RankRow } from "@/lib/nara/analytics";
import { fmtDelta, fmtVol } from "@/lib/nara/format";
import { cn } from "@/lib/utils";

// Hidden before first paint (when motion is allowed) so sections don't flash and
// then jump; the reveal animation un-hides them. <noscript> keeps them visible.
const PRE_ANIMATION_CSS = "@media (prefers-reduced-motion: no-preference){.an-reveal{visibility:hidden}}";

const BAR_FILL: Record<Bucket["tone"], string> = {
  red: "var(--nara-red)",
  green: "var(--nara-green)",
  amber: "var(--nara-amber)",
};

const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Lagos",
});

export function AnalyticsView({ summary }: { summary: AnalyticsSummary }) {
  const scope = useRef<HTMLDivElement>(null);
  const gradientId = svgId("analytics-fill", useId());
  const { stats, featured, distribution, topMovers, volumeLeaders } = summary;

  // Runs once. Scoped to this page, and useGSAP cleans up only its own
  // animations (the old version killed every ScrollTrigger on the site).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".an-reveal").forEach((el) => {
          gsap.from(el, {
            y: 28,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });
        gsap.set(".an-reveal", { visibility: "visible" });
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="space-y-10">
      <style>{PRE_ANIMATION_CSS}</style>
      <noscript>
        <style>{".an-reveal{visibility:visible!important}"}</style>
      </noscript>

      {summary.degraded && <DegradedBanner />}

      <div className="an-reveal flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-nara-red">
          <Radio className="size-3 animate-pulse motion-reduce:animate-none" aria-hidden />
          Live · refreshes every minute
        </div>
        <time
          dateTime={summary.asOf}
          suppressHydrationWarning
          className="font-mono text-[10px] uppercase tracking-widest text-nara-muted"
        >
          Data as of {timeFormatter.format(new Date(summary.asOf))} WAT
        </time>
      </div>

      {/* stats */}
      <div className="an-reveal grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={stats.volumeWindow === "7d" ? "7d notional" : "Total volume"} tone="amber">
          <CountUp value={stats.volume} format={fmtVol} />
        </Stat>
        <Stat label="Open markets">
          <CountUp value={stats.openMarkets} format={(n) => Math.round(n).toLocaleString("en-NG")} />
        </Stat>
        <Stat label="Sharpest 24h move" tone={stats.sharpest != null && stats.sharpest < 0 ? "red" : "green"}>
          {stats.sharpest == null ? "—" : `${fmtDelta(stats.sharpest)}`}
        </Stat>
        <Stat label="Resolving this week">
          <CountUp value={stats.resolvingThisWeek} format={(n) => Math.round(n).toLocaleString("en-NG")} />
        </Stat>
      </div>

      {/* featured market */}
      <section aria-label="Featured market" className="an-reveal rounded-2xl border border-nara-border bg-nara-surface">
        <div className="flex items-center justify-between gap-4 border-b border-nara-border px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
          <span className="shrink-0">Featured · YES probability · 7 days</span>
          <span className="truncate text-nara-text/70">{featured.title}</span>
        </div>
        <div className={cn("h-[280px] p-3", CHART_THEME)}>
          {featured.history.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={featured.history}>
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  width={36}
                />
                <Tooltip cursor={{ stroke: "currentColor", strokeDasharray: 3 }} content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="crowd"
                  stroke="currentColor"
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty>No price history for this market yet</Empty>
          )}
        </div>
      </section>

      {/* distribution */}
      <section aria-label="YES probability distribution" className="an-reveal rounded-2xl border border-nara-border bg-nara-surface">
        <div className="border-b border-nara-border px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
          How confident is the crowd? · {stats.openMarkets} open markets by YES probability
        </div>
        <div className={cn("h-[220px] p-3", CHART_THEME)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
              <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} content={<BucketTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={800}>
                {distribution.map((b) => (
                  <Cell key={b.range} fill={BAR_FILL[b.tone]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* rankings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankCard
          title="Top movers · 24h"
          note={`Of the ${summary.trackedMovers} most-traded markets`}
          rows={topMovers}
          empty="No 24h moves available right now"
          extra={(r) => (r.delta == null ? <span className="text-nara-muted">—</span> : <DeltaBadge value={r.delta} />)}
        />
        <RankCard
          title="Volume leaders"
          rows={volumeLeaders}
          empty="No markets open right now"
          extra={(r) => <span className="font-mono text-[12px] tabular-nums text-nara-amber">{fmtVol(r.volume)}</span>}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

function Stat({
  label,
  children,
  tone = "neutral",
}: {
  label: string;
  children: ReactNode;
  tone?: "neutral" | "amber" | "green" | "red";
}) {
  return (
    <div className="rounded-xl border border-nara-border bg-nara-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">{label}</div>
      <div
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          tone === "amber" && "text-nara-amber",
          tone === "green" && "text-nara-green",
          tone === "red" && "text-nara-red",
          tone === "neutral" && "text-nara-text",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Counts up to `value` (from 0 on first view, then from the previous value when
 * the data refreshes). Rendered by React, so later updates always show.
 * The server-rendered HTML already contains the final number.
 */
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(value);
  const shown = useRef(0);

  useEffect(() => {
    const from = shown.current;
    if (from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 1000;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const current = from + (value - from) * (1 - (1 - p) ** 3);
      shown.current = current;
      setDisplay(current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{format(display)}</>;
}

function BucketTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Bucket }>;
}) {
  const b = payload?.[0]?.payload;
  if (!active || !b) return null;
  return (
    <div className="rounded-lg border border-nara-border bg-nara-surface2 px-2.5 py-1.5 font-mono text-[11px] shadow-lg">
      <div className="text-nara-muted">{b.range} YES</div>
      <div className="text-nara-text">
        {b.count} market{b.count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function RankCard({
  title,
  note,
  rows,
  empty,
  extra,
}: {
  title: string;
  note?: string;
  rows: RankRow[];
  empty: string;
  extra: (r: RankRow) => ReactNode;
}) {
  return (
    <section aria-label={title} className="an-reveal overflow-hidden rounded-2xl border border-nara-border bg-nara-surface">
      <div className="flex items-center justify-between gap-3 border-b border-nara-border px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
        <span>{title}</span>
        {note && <span className="normal-case tracking-normal text-nara-muted/70">{note}</span>}
      </div>
      {rows.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <ol className="divide-y divide-nara-border">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3">
              <span aria-hidden className="w-5 font-mono text-[11px] tabular-nums text-nara-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-nara-text">{r.name}</span>
              <span className="font-mono text-[12px] tabular-nums text-nara-muted">{r.yes.toFixed(1)}%</span>
              <span className="flex w-20 justify-end">{extra(r)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center px-5 py-8 font-mono text-[11px] uppercase tracking-widest text-nara-muted">
      {children}
    </div>
  );
}