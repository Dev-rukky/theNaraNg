"use client";

import { useRef } from "react";
import { Check } from "lucide-react";
import { AmberButton, DataLabel } from "./primitives";
import { gsap, useGSAP } from "@/lib/nara/gsap"; // Importing the official GSAP hook
import { cn } from "@/lib/utils";

type Tier = {
  name: string;
  price: string;
  priceSub?: string;
  features: string[];
  cta: string;
  variant: "free" | "pro" | "api";
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "₦0",
    priceSub: "forever",
    features: [
      "Live market feed — 10 markets max",
      "Naira rate tracker (live)",
      "Weekly Signal Drop newsletter",
      "Basic 7-day odds chart",
      "Market calendar (resolve dates)",
      "Public leaderboard — top 10 only",
      "Signal archive — read only",
      "Mobile app — read only view",
    ],
    cta: "Sign up",
    variant: "free",
  },
  {
    name: "Pro",
    price: "₦5,000",
    priceSub: "/month",
    features: [
      "Everything in Free",
      "All 377+ active markets",
      "Sharp money alerts — real-time",
      "Full 90-day price history",
      "Orderbook depth view",
      "Custom alert builder",
      "Daily Signal brief (email + WhatsApp)",
      "Full leaderboard + trader profiles",
      "Resolution accuracy tracker",
      "Market comparison tool (up to 5)",
      "CSV and PNG data export",
      "Early access to new features",
    ],
    cta: "Go Pro →",
    variant: "pro",
  },
  {
    name: "API / White-Label",
    price: "₦30,000",
    priceSub: "/mo + rev share",
    features: [
      "Everything in Pro",
      "Full REST + WebSocket API access",
      "White-label embed SDK",
      "Revenue share on embedded volume",
      "Custom market creation",
      "Webhook delivery for any event",
      "Priority Slack support",
      "Custom branding on embedded widgets",
      "Multiple team seats",
      "SLA uptime guarantee",
    ],
    cta: "Talk to us",
    variant: "api",
  },
];

export function PricingSection() {
  // 1. Create a native React ref for GSAP scoping
  const containerRef = useRef<HTMLElement>(null);

  // 2. Use the official useGSAP hook
  useGSAP(() => {
    gsap.from(".price-card", {
      y: 30,
      opacity: 0,
      stagger: 0.1,
      duration: 0.7,
      ease: "power3.out",
      scrollTrigger: { 
        trigger: ".price-grid", 
        start: "top 80%" 
      },
    });
  }, { scope: containerRef }); // Scope the animation so it only affects this component

  return (
    <section ref={containerRef} id="pricing" className="scroll-mt-24 py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div id="api" className="mx-auto max-w-2xl scroll-mt-24 text-center">
          <DataLabel>// For builders</DataLabel>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl md:text-[44px]">
            Add the signal to your product.
          </h2>
          <p className="mt-5 text-base text-nara-muted">
            License Nara's prediction market analytics engine. One API. Embeddable anywhere in
            Africa.
          </p>
        </div>

        <div className="price-grid mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={cn(
                "price-card relative flex flex-col gap-6 rounded-2xl p-7 transition-colors",
                t.variant === "free" && "border border-nara-border bg-nara-surface",
                t.variant === "pro" &&
                  "scale-[1.015] border border-nara-amber/60 bg-nara-surface shadow-[0_0_60px_-15px_rgba(239,159,39,0.35)]",
                t.variant === "api" && "border border-nara-border bg-nara-surface2",
              )}
            >
              {t.variant === "pro" && (
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-nara-amber to-transparent" />
              )}
              {t.variant === "pro" && (
                <span className="absolute right-5 top-5 rounded-full border border-nara-amber/50 bg-nara-amber/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-nara-amber">
                  Most signal
                </span>
              )}
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-nara-muted">
                  {t.name}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-semibold tracking-[-0.02em] text-nara-text tabular-nums">
                    {t.price}
                  </span>
                  {t.priceSub && (
                    <span className="font-mono text-xs text-nara-muted">{t.priceSub}</span>
                  )}
                </div>
              </div>
              <ul className="space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-nara-text/90">
                    <Check className="mt-0.5 size-4 shrink-0 text-nara-amber" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              
              <AmberButton
                size="lg"
                variant={t.variant === "pro" ? "amber" : "ghost"}
                className="mt-auto w-full"
                as="a"
                href="#newsletter"
              >
                {t.cta}
              </AmberButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}