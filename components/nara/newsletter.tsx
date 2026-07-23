"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AmberButton, DataLabel } from "./primitives";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) return;
    
    setSubmitting(true);
    
    const { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email: email.toLowerCase().trim(), source: "landing" }, { onConflict: "email" });
      
    setSubmitting(false);
    
    if (dbError) {
      setError("Could not subscribe. Try again in a moment.");
      return;
    }
    
    setDone(true);
  };

  return (
    <section
      id="newsletter"
      className="relative scroll-mt-24 overflow-hidden py-28 md:py-36"
    >
      {/* amber beams */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 600px 280px at 50% 0%, rgba(239,159,39,0.16) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-nara-amber/60 to-transparent"
      />
      <div className="absolute inset-0 -z-20 nara-dot-grid opacity-40" />

      <div className="mx-auto max-w-[760px] px-6 text-center">
        <DataLabel>// The weekly signal drop</DataLabel>
        <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl md:text-[52px]">
          Every Sunday. <span className="text-nara-muted">Free.</span>{" "}
          <span className="text-nara-amber">No noise.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-nara-muted sm:text-lg">
          Nara reads Nigeria's prediction markets so you don't have to guess. The crowd's signal —
          decoded, every week. Skin in the game? You get the deeper cut.
        </p>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-10 flex w-full max-w-xl flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 flex-1 rounded-lg border border-nara-border bg-nara-surface px-4 font-mono text-sm text-nara-text placeholder:text-nara-muted/70 outline-none transition-all focus:border-nara-amber focus:ring-2 focus:ring-nara-amber/30"
          />
          <AmberButton size="lg" type="submit" className="h-14 px-6" disabled={submitting}>
            {done ? "Subscribed ✓" : submitting ? "Subscribing…" : "Get the signal →"}
          </AmberButton>
        </form>

        {error && (
          <p className="mt-3 font-mono text-[11px] text-nara-red">{error}</p>
        )}

        <p className="mt-5 font-sans text-xs text-nara-muted">
          Free every Sunday. No spam. Unsubscribe anytime.
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-nara-amber">
          The signal must flow.
        </p>
      </div>
    </section>
  );
}