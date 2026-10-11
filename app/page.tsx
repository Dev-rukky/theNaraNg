// app/page.tsx
import type { Metadata } from "next";
import { getLandingData } from "@/lib/nara/bayse";
import Navbar from "@/components/nara/navbar";
import { Hero } from "@/components/nara/hero";
import { MarketTicker } from "@/components/nara/marketTicker";
import { ProductBento } from "@/components/nara/products";
import { SignalTimeline } from "@/components/nara/signalTimeline";
import { SocialProof } from "@/components/nara/socialProof";
import { NewsletterCTA } from "@/components/nara/newsletter";
import { PricingSection } from "@/components/nara/pricingSection";
import { Footer } from "@/components/nara/footer";

// Rebuild the page in the background at most once a minute (matches the
// landing-data cache). Visitors always get a fast, pre-rendered page, and the
// numbers in it are never more than ~1 minute old before live polling takes over.
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "naraNg — Nigeria's prediction market intelligence" },
  description:
    "Decode what Nigeria's traders believe about the Naira, the CBN, and the economy — before it makes the news.",
};

export default async function HomePage() {
  const initialLandingData = await getLandingData();

  return (
    <div className="min-h-screen bg-nara-black text-nara-text selection:bg-nara-amber selection:text-nara-black">
      <Navbar />
      {/* Navbar and Footer sit outside <main>, so screen readers can jump straight to the content. */}
      <main>
        <Hero initialData={initialLandingData} />
        <MarketTicker initialData={initialLandingData} />
        <ProductBento initialData={initialLandingData} />
        <SignalTimeline />
        <SocialProof initialData={initialLandingData} />
        <NewsletterCTA />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}