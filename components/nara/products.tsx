"use client";

import { useRef, useState, useEffect } from "react";
import { gsap, useGSAP } from "@/lib/nara/gsap"; // The clean GSAP util
import { DataLabel, OddsBar } from "./primitives";
import { BarChart3, Coins, Zap, Mail, Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import { useLandingData } from "@/lib/nara/uselandingdata";
import type { LandingData } from "@/lib/nara/bayse.function"; // For typing initialData

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bento-card group relative flex flex-col gap-4 overflow-hidden p-6 nara-card nara-card-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-9 items-center justify-center rounded-lg border border-nara-border bg-nara-surface2 text-nara-amber">
      {children}
    </span>
  );
}

export function ProductBento({ initialData }: { initialData: LandingData }) {
  // 1. Thread the server data into the hook
  const { history, featured, markets } = useLandingData(initialData);
  
  // 2. Hydration state for recharts
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = history.length ? history : [{ t: "—", crowd: featured.yes || 0 }];
  const featuredDeltaColor = featured.delta >= 0 ? "text-nara-green" : "text-nara-red";
  
  const sharpest = markets.reduce(
    (top, m) => (Math.abs(m.delta) > Math.abs(top.delta) ? m : top),
    markets[0] ?? { name: "—", delta: 0, yes: 0 },
  );

  // 3. Native React Ref for GSAP scoping
  const containerRef = useRef<HTMLElement>(null);

  // 4. Official useGSAP hook
  useGSAP(() => {
    gsap.from(".bento-card", {
      y: 28,
      opacity: 0,
      stagger: 0.08,
      duration: 0.7,
      ease: "power3.out",
      scrollTrigger: { 
        trigger: ".bento-grid", 
        start: "top 80%" 
      },
    });
  }, { scope: containerRef, dependencies: [history.length] });

  return (
    <section
      ref={containerRef}
      id="markets"
      className="mx-auto max-w-7xl scroll-mt-24 px-6 py-28 md:py-36"
    >
      <div className="mb-12 max-w-2xl">
        <DataLabel>// What Nara gives you</DataLabel>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl md:text-[44px]">
          One platform. <span className="text-nara-muted">Three products.</span>{" "}
          <span className="text-nara-amber">One signal.</span>
        </h2>
      </div>

      <div className="bento-grid grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
        {/* Analytics Dashboard - large */}
        <Card className="md:col-span-2 md:row-span-1">
          <div className="flex items-center justify-between">
            <IconBox><BarChart3 className="size-4" /></IconBox>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-nara-green/30 bg-nara-green/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-nara-green">
              <span className="size-1.5 rounded-full bg-nara-green" /> Live
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.02em]">
              Bloomberg for Nigerian prediction markets
            </h3>
            <p className="mt-2 text-sm text-nara-muted">
              Real-time dashboard tracking odds movements, sharp money signals, volume spikes, and
              crowd sentiment across every active Bayse market.
            </p>
          </div>
          <div className="mt-auto h-24 w-full">
            {/* 5. Hydration check for Recharts */}
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="bentoAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF9F27" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#EF9F27" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="crowd" stroke="#EF9F27" strokeWidth={2} fill="url(#bentoAmber)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full bg-nara-surface2/20 animate-pulse rounded-md" />
            )}
          </div>
        </Card>

        {/* Naira tracker */}
        <Card>
          <IconBox><Coins className="size-4" /></IconBox>
          <h3 className="text-lg font-semibold tracking-[-0.02em]">The Naira, crowdsourced</h3>
          <p className="text-sm text-nara-muted">
            Live crowd probability on USD/NGN rate targets.
          </p>
          <div className="mt-auto rounded-xl border border-nara-border bg-nara-black/50 p-3">
            <div className="truncate font-mono text-[10px] uppercase tracking-widest text-nara-muted">
              {featured.title}
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold text-nara-amber tabular-nums" suppressHydrationWarning>
              {featured.yes.toFixed(1)}%{" "}
              <span className={`text-xs ${featuredDeltaColor}`}>
                {featured.delta >= 0 ? "+" : ""}
                {featured.delta.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2"><OddsBar value={featured.yes} /></div>
          </div>
        </Card>

        {/* Sharp Money */}
        <Card>
          <IconBox><Zap className="size-4" /></IconBox>
          <h3 className="text-lg font-semibold tracking-[-0.02em]">Know before the news</h3>
          <p className="text-sm text-nara-muted">
            When odds move 10%+ in under an hour — Nara tells you first.
          </p>
          <div className="mt-auto rounded-xl border-l-2 border-nara-red bg-nara-surface2/60 p-3">
            <div className="truncate font-mono text-[11px] text-nara-text">
              ⚡ {sharpest.name} moved{" "}
              <span className={sharpest.delta >= 0 ? "text-nara-green" : "text-nara-red"}>
                {sharpest.delta >= 0 ? "+" : ""}
                {sharpest.delta.toFixed(1)}%
              </span>{" "}
              in 24h
            </div>
            <div className="font-mono text-[10px] text-nara-muted">
              now @ {sharpest.yes.toFixed(1)}% YES
            </div>
          </div>
        </Card>

        {/* Newsletter */}
        <Card className="md:col-span-1">
          <IconBox><Mail className="size-4" /></IconBox>
          <h3 className="text-lg font-semibold tracking-[-0.02em]">The Signal Drop</h3>
          <p className="text-sm text-nara-muted">
            Every Sunday. Auto-generated from live market data.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest">
            <span className="rounded-full border border-nara-border px-2 py-0.5 text-nara-amber">Free</span>
            <span className="rounded-full border border-nara-border px-2 py-0.5 text-nara-muted">Every Sunday</span>
          </div>
        </Card>

        {/* White-label - large */}
        <Card className="md:col-span-3">
          <div className="flex items-center gap-3">
            <IconBox><Puzzle className="size-4" /></IconBox>
            <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
              <span className="rounded-full border border-nara-border px-2 py-0.5">API</span>
              <span className="rounded-full border border-nara-border px-2 py-0.5">SDK</span>
              <span className="rounded-full border border-nara-amber/40 px-2 py-0.5 text-nara-amber">Revenue Share</span>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.02em]">
              Power your product with Nara's signal layer
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-nara-muted">
              License the full prediction market analytics engine. Embed live odds, charts, and
              signals in any African product — fintech, media, sportsbook, research.
            </p>
          </div>
          <pre className="mt-auto overflow-x-auto rounded-xl border border-nara-border bg-nara-black/70 p-4 font-mono text-[12px] leading-relaxed text-nara-text/90">
{`const nara = new NaraClient({ apiKey: process.env.NARA_KEY })
const signal = await nara.markets.getSignal('usd-ngn')
// → { yes: 73.4, delta: +8.2, sharp: true, ts: '11:42 WAT' }`}
          </pre>
        </Card>
      </div>
    </section>
  );
}