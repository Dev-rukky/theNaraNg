"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/nara/gsap"; 
import { DataLabel } from "./primitives";

const PANELS = [
  {
    n: "01",
    title: "The market opens",
    body: "Live odds at 50/50. Volume thin, opinions split. Nigeria wakes up.",
    accent: "text-nara-muted",
    meta: "T-72hrs · 06:00 WAT",
  },
  {
    n: "02",
    title: "Sharp money moves",
    body: "Odds spike to 73%. Volume 4× normal in 47 minutes. Unusual depth on the YES side.",
    accent: "text-nara-red",
    meta: "⚡ Unusual volume detected · 11:42 WAT",
  },
  {
    n: "03",
    title: "The crowd follows",
    body: "Retail traders pile in. Odds reach 79%. Twitter starts noticing — but Nara saw it 3 hours earlier.",
    accent: "text-nara-amber",
    meta: "Crowd momentum building · 14:08 WAT",
  },
  {
    n: "04",
    title: "The event resolves",
    body: "Final print: ₦1,412. Market resolved YES. Crowd accuracy delta: +31% vs analysts.",
    accent: "text-nara-green",
    meta: "Resolved correctly · +31% accuracy delta",
  },
  {
    n: "05",
    title: "The Nara signal was early",
    body: "Nara surfaced this signal at T-72hrs. The first news headline appeared at T-0. Get the signal first.",
    accent: "text-nara-amber",
    meta: "Join early access →",
  },
];

export function SignalTimeline() {
  const containerRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // gsap.matchMedia is the safest way to handle responsive animations in Next.js
    const mm = gsap.matchMedia();

    // Only apply the horizontal scroll on desktop screens (768px and up)
    mm.add("(min-width: 768px)", () => {
      const track = trackRef.current;
      const pinContainer = pinRef.current;
      if (!track || !pinContainer) return;

      gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth), 
        ease: "none",
        scrollTrigger: {
          trigger: pinContainer, 
          pin: true,              
          scrub: 1,               
          start: "top top",       
          end: () => "+=" + (track.scrollWidth - window.innerWidth), 
          invalidateOnRefresh: true, // Recalculates perfectly if the user resizes the window
        },
      });
    });

    // Cleanup is handled automatically by gsap.matchMedia()
  }, { scope: containerRef }); 

  return (
    <section ref={containerRef} className="relative bg-nara-black">
      <div ref={pinRef} className="signal-pin relative overflow-hidden">
        <div className="absolute inset-0 nara-dot-grid opacity-40" />
        
        <div 
          ref={trackRef} 
          className="signal-track flex md:h-screen md:flex-row md:flex-nowrap md:items-stretch flex-col"
        >
          {/* Intro panel */}
          <div className="flex shrink-0 flex-col justify-center px-8 py-20 md:w-screen md:px-24 relative z-10">
            <DataLabel>// Anatomy of a signal</DataLabel>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl md:text-[56px] md:leading-[1.05]">
              How a market becomes <span className="text-nara-amber italic">a signal.</span>
            </h2>
            <p className="mt-5 max-w-md text-base text-nara-muted">
              Scroll through five moments in the life of a Nigerian prediction market — from
              opening tick to resolution.
            </p>
            <span className="mt-8 font-mono text-[11px] uppercase tracking-widest text-nara-muted hidden md:block">
              Scroll →
            </span>
          </div>

          {/* Story Panels */}
          {PANELS.map((p) => (
            <article
              key={p.n}
              className="signal-panel relative z-10 flex shrink-0 flex-col justify-center border-t border-nara-border bg-nara-black/50 backdrop-blur-sm px-8 py-16 md:w-[680px] md:border-l md:border-t-0 md:px-16 md:py-0"
            >
              <span className="font-mono text-[11px] uppercase tracking-widest text-nara-muted">
                Panel {p.n}
              </span>
              <h3 className="mt-3 max-w-md text-2xl font-semibold tracking-[-0.02em] sm:text-3xl md:text-[40px] md:leading-[1.05]">
                {p.title}
              </h3>
              <p className="mt-4 max-w-md text-base text-nara-muted">{p.body}</p>
              <p className={`mt-6 font-mono text-[12px] ${p.accent}`}>{p.meta}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
