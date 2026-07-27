"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/nara/gsap";
import { AmberButton, DataLabel } from "./primitives";
import { DashboardMockup } from "./dashboardmockup";
import type { LandingData } from "@/lib/nara/bayse.function";

export function Hero({ initialData }: { initialData: LandingData }) {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-label", { y: 12, opacity: 0, duration: 0.6 }, 0.2)
        .from(
          ".hero-word",
          {
            y: 60,
            opacity: 0,
            stagger: 0.08,
            duration: 0.9,
            ease: "power4.out",
          },
          0.35,
        )
        .from(".hero-sub", { y: 16, opacity: 0, duration: 0.7 }, 0.85)
        .from(
          ".hero-cta",
          { y: 16, opacity: 0, stagger: 0.08, duration: 0.6 },
          1.0,
        )
        .from(".hero-proof", { opacity: 0, duration: 0.6 }, 1.25)
        .from(
          ".hero-mock",
          { y: 80, opacity: 0, duration: 1.1, ease: "power4.out" },
          1.0,
        );

      gsap.to(".hero-mock", {
        y: -100, 
        ease: "none",
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.8, 
        },
      });
    },
    { scope: container },
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.4, ease: "power2.out" });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.5)" });
  };

  return (
    <section
      ref={container}
      className="relative isolate flex min-h-screen flex-col items-center justify-end overflow-hidden pt-32 pb-0"
    >
      <div className="absolute inset-0 -z-10 nara-dot-grid opacity-60" />
      <div className="absolute inset-0 -z-10 nara-amber-glow" />
      <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-gradient-to-r from-transparent via-nara-border to-transparent" />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
        <div className="hero-label">
          <DataLabel>
            // Nigeria's prediction market intelligence layer
          </DataLabel>
        </div>

        <h1 className="mt-6 max-w-4xl text-balance text-[44px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-[96px]">
          <span className="block">
            <span className="hero-word inline-block">The</span>{" "}
            <span className="hero-word inline-block">signal</span>
          </span>
          <span className="block italic text-nara-amber">
            <span className="hero-word inline-block">must</span>{" "}
            <span className="hero-word inline-block">flow.</span>
          </span>
        </h1>

        <p className="hero-sub mt-7 max-w-xl text-pretty text-base text-nara-muted sm:text-lg md:text-xl">
          Decode what Nigeria's traders believe about the Naira, the CBN, and
          the economy — before it makes the news.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <div className="hero-cta">
            <AmberButton 
              variant="amber" 
              size="lg" 
              as="a" 
              href="#newsletter"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              Get early access →
            </AmberButton>
          </div>
          <div className="hero-cta">
            <AmberButton 
              variant="ghost" 
              size="lg" 
              as="a" 
              href="#dashboard"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              View live markets
            </AmberButton>
          </div>
        </div>

        <p className="hero-proof mt-6 font-mono text-[11px] uppercase tracking-widest text-nara-muted">
          Powered by Bayse Markets · Live market data · 0% platform fee
        </p>
      </div>

      <div className="hero-mock relative z-10 mx-auto mt-16 w-full max-w-6xl translate-y-20 px-6 sm:translate-y-24">
        <DashboardMockup compact initialData={initialData} />
      </div>
    </section>
  );
}
