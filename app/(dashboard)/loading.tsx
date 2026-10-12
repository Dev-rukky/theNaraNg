// app/(dashboard)/dashboard/loading.tsx
// Shown automatically by Next.js while page.tsx is fetching on the server.
import { PageHeader } from "@/components/nara/PageHeader";

export default function MarketsLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Live"
        title={<>Markets feed.</>}
        description="Every open NGN-denominated event on Bayse. Sortable, filterable, live."
      />
      <div className="space-y-6" aria-busy="true" aria-label="Loading markets">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse rounded-xl border border-nara-border bg-nara-surface"
            />
          ))}
        </div>
        <div className="h-[60px] animate-pulse rounded-2xl border border-nara-border bg-nara-surface" />
        <div className="h-[640px] animate-pulse rounded-2xl border border-nara-border bg-nara-surface" />
      </div>
    </>
  );
} 