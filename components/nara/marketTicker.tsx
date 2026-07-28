"use client";

import { useRef } from "react";
import { useLandingData } from "@/lib/nara/uselandingdata";
import { gsap, useGSAP } from "@/lib/nara/gsap";
import type { LandingData } from "@/lib/nara/bayse.function";

export function MarketTicker({ initialData }: { initialData: LandingData }) {
  const { ticker } = useLandingData(initialData);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ticker.length) return;

      gsap.to(".nara-ticker-track", {
        xPercent: -50,
        duration: 60,
        ease: "none",
        repeat: -1,
      });
    },
    {
      scope: containerRef,
      dependencies: [ticker.length],
    },
  );

  if (!ticker.length) {
    return (
      <div className="border-y border-nara-border bg-nara-surface py-3 text-center font-mono text-[11px] uppercase tracking-widest text-nara-muted">
        Waiting for Bayse signal…
      </div>
    );
  }

  const items = [...ticker, ...ticker, ...ticker, ...ticker];

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden border-y border-nara-border bg-nara-surface"
      aria-label="Live market ticker"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-nara-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-nara-surface to-transparent" />

      <div className="nara-ticker-track flex w-max items-center gap-8 py-3 pr-8 font-mono text-[12px]">
        {items.map((m, i) => {
          const up = m.delta >= 0;
          return (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap">
              <span className="text-nara-text/90">{m.name}</span>
              <span className="text-nara-amber tabular-nums">
                {m.yes.toFixed(1)}% YES
              </span>
              <span
                className={
                  up
                    ? "text-nara-green tabular-nums"
                    : "text-nara-red tabular-nums"
                }
              >
                {up ? "+" : ""}
                {m.delta.toFixed(1)}% {up ? "↑" : "↓"}
              </span>
              <span className="text-nara-amber/60">·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
