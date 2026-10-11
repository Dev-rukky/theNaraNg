// components/nara/Hero.tsx
"use client";

import { useRef, type MouseEvent } from "react";
import { gsap, useGSAP } from "@/lib/nara/gsap";
import type { LandingData } from "@/lib/nara/bayse";
import { AmberButton, DataLabel } from "./primitives";
import { DashboardMockup } from "./dashboardmockup";

type Magnet = { x: gsap.QuickToFunc; y: gsap.QuickToFunc };

// Hides the animated pieces before the first paint (only for users who allow
// motion), so the server-rendered text doesn't flash and then jump.
// The animation reveals them; <noscript> keeps them visible without JS.
const PRE_ANIMATION_CSS =
  "@media (prefers-reduced-motion: no-preference){.hero-anim{visibility:hidden}}";

export function Hero({ initialData }: { initialData: LandingData }) {
  const container = useRef<HTMLElement>(null);
  const magnetEnabled = useRef(false);
  const magnets = useRef(new WeakMap<HTMLElement, Magnet>());

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Everything below is skipped for users who prefer reduced motion.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.from(".hero-label", { y: 12, opacity: 0, duration: 0.6 }, 0.2)
          .from(".hero-word", { y: 60, opacity: 0, stagger: 0.08, duration: 0.9, ease: "power4.out" }, 0.35)
          .from(".hero-sub", { y: 16, opacity: 0, duration: 0.7 }, 0.85)
          .from(".hero-cta", { y: 16, opacity: 0, stagger: 0.08, duration: 0.6 }, 1.0)
          .from(".hero-proof", { opacity: 0, duration: 0.6 }, 1.25)
          .from(".hero-mock", { y: 80, opacity: 0, duration: 1.1, ease: "power4.out" }, 1.0);

        // The tweens above have already set their start state, so revealing now can't flash.
        gsap.set(".hero-anim", { visibility: "visible" });

        // Parallax runs on a separate wrapper, so it never fights the intro tween over `y`.
        gsap.to(".hero-parallax", {
          y: -100,
          ease: "none",
          scrollTrigger: {
            trigger: container.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      });

      // Magnetic buttons only for real pointers (not touch) with motion allowed.
      mm.add("(hover: hover) and (prefers-reduced-motion: no-preference)", () => {
        magnetEnabled.current = true;
        return () => {
          magnetEnabled.current = false;
        };
      });
    },
    { scope: container },
  );

  // quickTo reuses one tween per axis instead of creating a new tween on every mousemove.
  function getMagnet(el: HTMLElement): Magnet {
    let m = magnets.current.get(el);
    if (!m) {
      m = {
        x: gsap.quickTo(el, "x", { duration: 0.4, ease: "power2.out" }),
        y: gsap.quickTo(el, "y", { duration: 0.4, ease: "power2.out" }),
      };
      magnets.current.set(el, m);
    }
    return m;
  }

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!magnetEnabled.current) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const m = getMagnet(el);
    m.x((e.clientX - rect.left - rect.width / 2) * 0.25);
    m.y((e.clientY - rect.top - rect.height / 2) * 0.25);
  };

  const handleMouseLeave = (e: MouseEvent<HTMLElement>) => {
    if (!magnetEnabled.current) return;
    const el = e.currentTarget;
    magnets.current.delete(el); // fresh quickTo next time, since this tween replaces it
    gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.5)", overwrite: true });
  };

  return (
    <section
      ref={container}
      className="relative isolate flex min-h-[100svh] flex-col items-center justify-end overflow-hidden pt-32"
    >
      <style>{PRE_ANIMATION_CSS}</style>
      <noscript>
        <style>{".hero-anim{visibility:visible!important}"}</style>
      </noscript>

      <div aria-hidden className="absolute inset-0 -z-10 nara-dot-grid opacity-60" />
      <div aria-hidden className="absolute inset-0 -z-10 nara-amber-glow" />
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 -z-10 h-px bg-gradient-to-r from-transparent via-nara-border to-transparent"
      />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
        <div className="hero-label hero-anim">
          <DataLabel>{"// Nigeria's prediction market intelligence layer"}</DataLabel>
        </div>

        <h1 className="mt-6 max-w-4xl text-balance text-[44px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-[96px]">
          <span className="block">
            <span className="hero-word hero-anim inline-block">The</span>{" "}
            <span className="hero-word hero-anim inline-block">signal</span>
          </span>
          <span className="block italic text-nara-amber">
            <span className="hero-word hero-anim inline-block">must</span>{" "}
            <span className="hero-word hero-anim inline-block">flow.</span>
          </span>
        </h1>

        <p className="hero-sub hero-anim mt-7 max-w-xl text-pretty text-base text-nara-muted sm:text-lg md:text-xl">
          Decode what Nigeria&apos;s traders believe about the Naira, the CBN, and the economy —
          before it makes the news.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <div className="hero-cta hero-anim">
            <AmberButton
              variant="amber"
              size="lg"
              as="a"
              href="#newsletter"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              Get early access <span aria-hidden>→</span>
            </AmberButton>
          </div>
          <div className="hero-cta hero-anim">
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

        <p className="hero-proof hero-anim mt-6 font-mono text-[11px] uppercase tracking-widest text-nara-muted">
          Powered by Bayse Markets · Live market data · 0% platform fee
        </p>
      </div>

      {/* Three layers: static offset → scroll parallax → intro animation. Each owns its own transform. */}
      <div className="relative z-10 mx-auto mt-16 w-full max-w-6xl translate-y-20 px-6 sm:translate-y-24">
        <div className="hero-parallax">
          <div className="hero-mock hero-anim">
            <DashboardMockup compact initialData={initialData} />
          </div>
        </div>
      </div>
    </section>
  );
}