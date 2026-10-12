// app/(dashboard)/dashboard/page.tsx   →  /dashboard  (Markets)
// Free: top 10 markets by volume. Pro / API / admin: every market.
import type { Metadata } from "next";
import { PageHeader } from "@/components/nara/PageHeader";
import { MarketsFeed } from "@/components/nara/markets/MarketFeed";
import { marketsCapFor } from "@/lib/auth/access";
import { checkAccess } from "@/lib/auth/checkAccess";
import { getAllMarkets } from "@/lib/nara/bayse";
import { limitMarkets } from "@/lib/nara/limitMarket";
import { getMyOpenCalls } from "@/lib/nara/predictions";

export const metadata: Metadata = { title: "Markets" };

export default async function MarketsPage() {
  const [{ plan, isAdmin }, all, myCalls] = await Promise.all([
    checkAccess("/dashboard"),
    getAllMarkets(),
    getMyOpenCalls(),
  ]);
  const data = limitMarkets(all, marketsCapFor(plan, isAdmin));

  return (
    <>
      <PageHeader
        eyebrow="Live"
        title={<>Markets feed.</>}
        description="Every open NGN-denominated event on Bayse. Sortable, filterable, live."
      />
      <MarketsFeed initial={{ data, fetchedAt: Date.now() }} myCalls={myCalls} />
    </>
  );
}