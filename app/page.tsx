import { getLandingData } from "@/lib/nara/bayse.function";
import Navbar from "@/components/nara/navbar";
import { Hero } from "@/components/nara/hero";
import { MarketTicker } from "@/components/nara/marketTicker";
import { ProductBento } from "@/components/nara/products";
import { SignalTimeline } from "@/components/nara/signalTimeline";
import { SocialProof } from "@/components/nara/socialProof";
import { NewsletterCTA } from "@/components/nara/newsletter";
import { PricingSection } from "@/components/nara/pricingSection";
import { Footer } from "@/components/nara/footer";

export default async function HomePage() {
  const initialLandingData = await getLandingData();

  return (
    <main className="min-h-screen bg-nara-black text-nara-text selection:bg-nara-amber selection:text-nara-black">
      <Navbar />
      <Hero initialData={initialLandingData} />
      <MarketTicker initialData={initialLandingData} /> 
      <ProductBento initialData={initialLandingData} />
      <SignalTimeline />
      <SocialProof initialData={initialLandingData} />
      <NewsletterCTA /> 
      <PricingSection />
      <Footer />
    </main>
  );
}
