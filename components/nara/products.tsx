// components/nara/products.tsx
"use client";

import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { BarChart3, Coins, Mail, Puzzle, Zap } from "lucide-react";
import { gsap, useGSAP } from "@/lib/nara/gsap";
import { useLandingData } from "@/lib/nara/uselandingdata";
import type { LandingData } from "@/lib/nara/bayse";
import { fmtDelta } from "@/lib/nara/format";
import { cn } from "@/lib/utils";
import { CHART_THEME, svgId } from "./chart";
import { DataLabel, OddsBar } from "./primitives";

// Hides the cards before first paint (only when motion is allowed), so they don't
// flash visible and then jump when the reveal starts. The animation un-hides them;
// <noscript> keeps them visible without JS.
const PRE_ANIMATION_CSS =
  "@media (prefers-reduced-motion: no-preference){.bento-card{visibility:hidden}}";

// Below this, a "move" is just noise and not worth headlining.
const MIN_NOTEWORTHY_MOVE = 0.5;

function Card({ className, children }: { className?: string; children: ReactNode }) {
  const frame = useRef<number | null>(null);

  // Spotlight follows the cursor. Batched to one style update per frame
  // instead of one per mousemove event.
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const { clientX, clientY } = e;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${clientX - rect.left}px`);
      card.style.setProperty("--mouse-y", `${clientY - rect.top}px`);
    });
  };

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn(
        "bento-card group relative flex flex-col gap-4 overflow-hidden p-6 nara-card nara-card-hover",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(239,159,39,0.06), transparent 40%)",
        }}
      />
      {children}
    </div>
  );
}

function IconBox({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-9 items-center justify-center rounded-lg border border-nara-border bg-nara-surface2 text-nara-amber transition-colors group-hover:border-nara-amber/40"
    >
      {children}
    </span>
  );
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-nara-border bg-nara-surface2 px-2.5 py-1 text-nara-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProductBento({ initialData }: { initialData: LandingData }) {
  const { history, featured, markets } = useLandingData(initialData);
  const containerRef = useRef<HTMLElement>(null);
  const gradientId = svgId("bento-fill", useId());

  // Recharts measures the DOM, so the sparkline renders after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sharpest = markets.reduce<(typeof markets)[number] | null>(
    (top, m) => (!top || Math.abs(m.delta) > Math.abs(top.delta) ? m : top),
    null,
  );
  const hasSharpMove = !!sharpest && Math.abs(sharpest.delta) >= MIN_NOTEWORTHY_MOVE;

  // No dependencies: the reveal runs once. (Re-running it on every data refresh
  // made the cards blink each time the landing data updated.)
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".bento-card", {
          y: 28,
          opacity: 0,
          stagger: 0.08,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: ".bento-grid", start: "top 80%", once: true },
        });
        // The tween has set its start state, so revealing now can't flash.
        gsap.set(".bento-card", { visibility: "visible" });
      });
    },
    { scope: containerRef },
  );

  return (
    <section ref={containerRef} id="products" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-28 md:py-36">
      <style>{PRE_ANIMATION_CSS}</style>
      <noscript>
        <style>{".bento-card{visibility:visible!important}"}</style>
      </noscript>

      <div className="mb-12 max-w-2xl">
        <DataLabel>{"// What Nara gives you"}</DataLabel>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl md:text-[44px]">
          One platform. <span className="text-nara-muted">Three products.</span>{" "}
          <span className="text-nara-amber">One signal.</span>
        </h2>
      </div>

      <div className="bento-grid grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
        {/* Analytics dashboard */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between">
            <IconBox>
              <BarChart3 className="size-4" />
            </IconBox>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-nara-green/30 bg-nara-green/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-nara-green">
              <span aria-hidden className="nara-live-dot size-1.5" /> Live
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.02em]">
              Bloomberg for Nigerian prediction markets
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-nara-muted">
              Real-time dashboard tracking odds movements, sharp money signals, volume spikes, and crowd
              sentiment across every active Bayse market.
            </p>
          </div>
          <div className={cn("mt-auto h-24 w-full", CHART_THEME)} aria-hidden>
            {mounted && history.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="crowd"
                    stroke="currentColor"
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div
                className={cn("h-full w-full rounded-md bg-nara-surface2/20", !mounted && "animate-pulse")}
              />
            )}
          </div>
        </Card>

        {/* Naira tracker */}
        <Card>
          <IconBox>
            <Coins className="size-4" />
          </IconBox>
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.02em]">The Naira, crowdsourced</h3>
            <p className="mt-1 text-sm text-nara-muted">Live crowd probability on USD/NGN rate targets.</p>
          </div>
          <div className="relative z-10 mt-auto rounded-xl border border-nara-border bg-nara-black/50 p-3.5">
            <div className="truncate font-mono text-[10px] uppercase tracking-widest text-nara-muted">
              {featured.title}
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-nara-amber">
              {featured.yes.toFixed(1)}%{" "}
              <span className={cn("text-xs", featured.delta >= 0 ? "text-nara-green" : "text-nara-red")}>
                {fmtDelta(featured.delta)}
              </span>{" "}
              {/* The featured market's change is measured over its 1-week history. */}
              <span className="text-[10px] font-normal uppercase tracking-widest text-nara-muted">7d</span>
            </div>
            <div className="mt-2.5">
              <OddsBar value={featured.yes} />
            </div>
          </div>
        </Card>

        {/* Sharp money */}
        <Card>
          <IconBox>
            <Zap className="size-4" />
          </IconBox>
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.02em]">Know before the news</h3>
            <p className="mt-1 text-sm text-nara-muted">
              When odds move 10%+ in under an hour — Nara tells you first.
            </p>
          </div>
          <div className="relative z-10 mt-auto rounded-xl border-l-2 border-nara-red bg-nara-surface2/60 p-3">
            {hasSharpMove && sharpest ? (
              <>
                <div className="truncate font-mono text-[11px] font-medium text-nara-text">
                  <span aria-hidden>⚡ </span>
                  {sharpest.name} moved{" "}
                  <span className={sharpest.delta >= 0 ? "text-nara-green" : "text-nara-red"}>
                    {fmtDelta(sharpest.delta)}
                  </span>{" "}
                  in 24h
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-nara-muted">
                  now @ {sharpest.yes.toFixed(1)}% YES
                </div>
              </>
            ) : (
              <div className="font-mono text-[11px] text-nara-muted">
                Markets are quiet right now. No big moves in the last 24h.
              </div>
            )}
          </div>
        </Card>

        {/* Newsletter */}
        <Card>
          <div className="flex items-center justify-between">
            <IconBox>
              <Mail className="size-4" />
            </IconBox>
            <span className="rounded-full border border-nara-amber/30 bg-nara-amber/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-nara-amber">
              Free
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.02em]">The Signal Drop</h3>
            <p className="mt-1 text-sm leading-relaxed text-nara-muted">
              Every Sunday. Auto-generated from live market data.
            </p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest">
            <Pill className="text-nara-amber">Free</Pill>
            <Pill>Every Sunday</Pill>
          </div>
        </Card>

        {/* White-label */}
        <Card className="md:col-span-3">
          <div className="flex items-center justify-between">
            <IconBox>
              <Puzzle className="size-4" />
            </IconBox>
            <div className="flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-widest">
              <Pill>API</Pill>
              <Pill>SDK</Pill>
              <Pill className="border-[#4A9EFF]/30 bg-[#4A9EFF]/10 text-[#4A9EFF]">Revenue Share</Pill>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.02em]">
              Power your product with Nara&apos;s signal layer
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nara-muted">
              License the full prediction market analytics engine. Embed live odds, charts, and signals in
              any African product — fintech, media, sportsbook, research.
            </p>
          </div>
          {/* tabIndex lets keyboard users scroll the code sideways on small screens. */}
          <pre
            tabIndex={0}
            aria-label="Example API usage"
            className="mt-auto overflow-x-auto rounded-xl border border-nara-border bg-nara-black/80 p-4 font-mono text-[12px] leading-relaxed text-nara-text/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nara-amber/60"
          >
            {`const nara = new NaraClient({ apiKey: process.env.NARA_KEY })
const signal = await nara.markets.getSignal('usd-ngn')
// → { yes: 73.4, delta: +8.2, sharp: true, ts: '11:42 WAT' }`}
          </pre>
        </Card>
      </div>
    </section>
  );
}