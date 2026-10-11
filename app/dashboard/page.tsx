// app/(dashboard)/dashboard/page.tsx
// Server Component: the first batch of markets is fetched on the server, so the
// page arrives with data instead of a skeleton. The client then keeps it fresh.
import type { Metadata } from "next";
import { PageHeader } from "@/components/nara/PageHeader";
import { MarketsFeed } from "@/components/nara/markets/MarketFeed";
import { getAllMarkets } from "@/lib/nara/bayse";

export const metadata: Metadata = { title: "Markets" };
export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const data = await getAllMarkets();

  return (
    <>
      <PageHeader
        eyebrow="Live"
        title={<>Markets feed.</>}
        description="Every open NGN-denominated event on Bayse. Sortable, filterable, live."
      />
      <MarketsFeed initial={{ data, fetchedAt: Date.now() }} />
    </>
  );
}