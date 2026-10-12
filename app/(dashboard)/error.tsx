// app/(dashboard)/dashboard/error.tsx
// Shown if the first server-side fetch of markets fails.
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function MarketsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  console.error("Markets page failed:", error);

  return (
    <div className="rounded-2xl border border-nara-border bg-nara-surface px-5 py-12 text-center">
      <p className="font-mono text-[12px] text-nara-muted">Couldn&apos;t load markets right now.</p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            // Re-runs the server fetch, then clears the error.
            router.refresh();
            reset();
          })
        }
        className="mt-4 rounded border border-nara-border px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-nara-muted transition-colors hover:text-nara-amber disabled:opacity-50"
      >
        {isPending ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}