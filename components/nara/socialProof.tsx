"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/nara/gsap"; // Importing from our clean GSAP utility
import { fmtVol } from "@/lib/nara/format";
import { useLandingData } from "@/lib/nara/uselandingdata";
import type { LandingData } from "@/lib/nara/bayse.function";

export function SocialProof({ initialData }: { initialData: LandingData }) {
  // 1. Thread the server data into the hook
  const { stats } = useLandingData(initialData);
  
  // 2. Native React Ref for GSAP scoping
  const containerRef = useRef<HTMLElement>(null);

  // 3. Official useGSAP hook
  useGSAP(() => {
    gsap.utils.toArray<HTMLElement>(".stat-num").forEach((el) => {
      const target = Number(el.dataset.target || "0");
      if (!target) return;
      
      const obj = { v: 0 };
      
      gsap.to(obj, {
        v: target,
        duration: 2,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
        onUpdate: () => {
          // GSAP directly modifies the DOM text content here
          if (el.dataset.fmt === "vol") el.textContent = fmtVol(obj.v) + "+";
          else if (el.dataset.fmt === "pct") el.textContent = obj.v.toFixed(1) + "%";
          else el.textContent = Math.round(obj.v).toString();
        },
      });
    });
  }, { 
    scope: containerRef, 
    dependencies: [stats.volume, stats.markets, stats.accuracy] 
  });

  return (
    <section ref={containerRef} className="border-y border-nara-border bg-nara-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-3 md:gap-6">
        <div data-stat>
          <CountStatWrapper
            value={stats.volume}
            fmt="vol"
            label="Open interest across active Bayse markets"
          />
        </div>
        <div>
          <CountStatWrapper 
            value={stats.markets} 
            label="Open markets on Bayse right now" 
          />
        </div>
        <div>
          <CountStatWrapper 
            value={stats.accuracy} 
            fmt="pct" 
            label="Average accuracy of crowd signal" 
          />
        </div>
      </div>

      <div className="border-t border-nara-border py-6 text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-nara-muted">
          Join <span className="text-nara-amber">500+ early readers</span> · The signal must flow.
        </p>
      </div>
    </section>
  );
}

function CountStatWrapper({
  value,
  label,
  fmt,
}: {
  value: number;
  label: string;
  fmt?: "vol" | "pct";
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        data-target={value}
        data-fmt={fmt}
        // 4. suppressHydrationWarning is critical here because GSAP takes over the text content
        suppressHydrationWarning 
        className="stat-num font-mono text-5xl font-semibold tracking-[-0.02em] text-nara-amber tabular-nums sm:text-6xl md:text-7xl"
      >
        {/* Render the final target value for the initial server pass */}
        {fmt === "vol"
          ? fmtVol(value) + "+"
          : fmt === "pct"
            ? value.toFixed(1) + "%"
            : Math.round(value).toString()}
      </div>
      <div className="mt-3 max-w-[220px] font-sans text-sm text-nara-muted">{label}</div>
    </div>
  );
}