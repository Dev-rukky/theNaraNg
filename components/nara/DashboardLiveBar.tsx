// components/nara/DashboardLiveBar.tsx
"use client";

import { Banknote, Radio } from "lucide-react";
import Link from "next/link";
import { useLandingData } from "@/lib/nara/uselandingdata";
import type { LandingData } from "@/lib/nara/bayse";
import { fmtDelta } from "@/lib/nara/format";
import { cn } from "@/lib/utils";

/**
 * Sticky bar under the dashboard header: the featured (Naira-focused) market on
 * the left, a scrolling ticker of the top markets on the right.
 * Starts from server-rendered data and stays live via the shared landing poller.
 */
export function DashboardLiveBar({ initialData }: { initialData: LandingData }) {
  const { featured, markets } = useLandingData(initialData);
  const up = featured.delta >= 0;

  return (
    <div className="sticky top-14 z-10 grid grid-cols-[auto_1fr] items-stretch border-b border-nara-border bg-nara-surface/95 backdrop-blur">
      <Link
        href="/naira"
        title={featured.title}
        className="group flex max-w-[45vw] items-center gap-3 border-r border-nara-border px-4 py-2 transition-colors hover:bg-nara-surface2 sm:max-w-xs"
      >
        <Banknote className="size-4 shrink-0 text-nara-amber" aria-hidden />
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="hidden truncate font-mono text-[10px] uppercase tracking-widest text-nara-muted sm:inline">
            {featured.title}
          </span>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-nara-amber">
            {featured.yes.toFixed(1)}%
          </span>
          <span className={cn("font-mono text-[11px] tabular-nums", up ? "text-nara-green" : "text-nara-red")}>
            {fmtDelta(featured.delta)}
          </span>
        </div>
      </Link>

      <Link href="/dashboard" aria-label="Open the markets feed" className="group relative overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-full items-center gap-1.5 bg-gradient-to-r from-nara-surface via-nara-surface to-transparent pl-3 pr-6">
          <Radio className="size-3 animate-pulse text-nara-red motion-reduce:animate-none" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-widest text-nara-red">Live</span>
        </div>

        {markets.length === 0 ? (
          <div className="py-2 pl-24 pr-4 font-mono text-[12px] text-nara-muted">No live markets right now</div>
        ) : (
          // Reduced motion: no scrolling; the list can be scrolled by hand instead.
          <div className="flex w-max animate-[ticker_60s_linear_infinite] items-center whitespace-nowrap py-2 pl-24 pr-4 font-mono text-[12px] tabular-nums hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:overflow-x-auto">
            <TickerItems markets={markets} />
            {/* Second copy makes the loop seamless; hidden from screen readers and when motion is off. */}
            <span aria-hidden className="flex items-center motion-reduce:hidden">
              <TickerItems markets={markets} />
            </span>
          </div>
        )}
      </Link>
    </div>
  );
}

function TickerItems({ markets }: { markets: LandingData["markets"] }) {
  return (
    <>
      {markets.map((m) => (
        <span key={m.id} className="mr-6 flex items-center gap-2">
          <span aria-hidden className="text-nara-muted/70">
            ·
          </span>
          <span className="text-nara-text/85">{m.name}</span>
          <span className="text-nara-amber">{m.yes.toFixed(1)}%</span>
          <span className={m.delta >= 0 ? "text-nara-green" : "text-nara-red"}>{fmtDelta(m.delta)}</span>
        </span>
      ))}
    </>
  );
}