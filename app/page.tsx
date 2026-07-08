import { getLandingData } from "@/lib/nara/bayse.function";
import Navbar from "@/components/nara/navbar";
import { Hero } from "@/components/nara/hero";
import { MarketTicker } from "@/components/nara/marketTicker";
import { ProductBento } from "@/components/nara/products";
import { SignalTimeline } from "@/components/nara/signalTimeline";
import { SocialProof } from "@/components/nara/socialProof";

export default async function HomePage() {
  // 1. Fetch the data on the SERVER. This is instantly rendered into the HTML.
  const initialLandingData = await getLandingData();

  return (
    <main>
      <Navbar />
      {/* 2. Pass the server data down to your client components */}
      <Hero initialData={initialLandingData} />
      <MarketTicker initialData={initialLandingData} />
      <ProductBento initialData={initialLandingData} />
      <SignalTimeline />
      <SocialProof initialData={initialLandingData} />
      
    </main>
  );
}