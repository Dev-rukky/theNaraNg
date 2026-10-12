// components/nara/sharp/SharpMoney.tsx
"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { DegradedBanner } from "@/components/nara/DegradedBanner";
import { DeltaBadge } from "@/components/nara/primitives";
import { useMarketsPolling, type MarketsSnapshot } from "@/components/nara/markets/useMarketsPolling";
import type { AllMarketsRow } from "@/lib/nara/bayse";
import { fmtVol } from "@/lib/nara/format";

/** A 24h move of this many percentage points or more is a "sharp" alert. */
const SHARP_THRESHOLD_PTS = 10;
const POLL_MS = 60_000;

type TrackedRow = AllMarketsRow & { delta: number };

const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Lagos",
});

export function SharpMoney({ initial }: { initial: MarketsSnapshot }) {
  const { data, fetchedAt, isFetching, error } = useMarketsPolling(initial, POLL_MS);

  // Only markets with a known 24h move can be ranked; biggest move first.
  const { sharp, rest } = useMemo(() => {
    const tracked = data.rows
      .filter((r): r is TrackedRow => r.delta != null && r.status !== "resolved")
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return {
      sharp: tracked.filter((m) => Math.abs(m.delta) >= SHARP_THRESHOLD_PTS),
      rest: tracked.filter((m) => Math.abs(m.delta) < SHARP_THRESHOLD_PTS),
    };
  }, [data.rows]);

  const trackedCount = sharp.length + rest.length;

  return (
    <div className="space-y-8">
      {data.degraded && <DegradedBanner />}

      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
        <span>
          Tracking 24h moves on the {trackedCount} most-traded markets
        </span>
        <span aria-live="polite" className={isFetching ? "text-nara-amber" : error ? "text-nara-red" : undefined}>
          {isFetching ? (
            "Refreshing…"
          ) : error ? (
            "Update failed · retrying"
          ) : (
            <time suppressHydrationWarning>Updated {timeFormatter.format(fetchedAt)} WAT</time>
          )}
        </span>
      </div>

      {/* sharp alerts */}
      <section aria-labelledby="sharp-heading">
        <h2
          id="sharp-heading"
          className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-nara-red"
        >
          <AlertTriangle className="size-3.5" aria-hidden /> Sharp alerts · {sharp.length}
        </h2>
        {sharp.length === 0 ? (
          <div className="rounded-2xl border border-nara-border bg-nara-surface p-8 text-center text-sm text-nara-muted">
            Nothing has moved {SHARP_THRESHOLD_PTS}+ points in the last 24h. Quiet tape.
          </div>
        ) : (
          <ul className="space-y-3">
            {sharp.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border-l-2 border-nara-red bg-nara-surface px-5 py-4 shadow-[0_0_40px_-20px_rgba(216,90,48,0.5)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[13px] text-nara-text">{m.name}</div>
                    <div className="mt-1 font-mono text-[10px] text-nara-muted">
                      Volume {fmtVol(m.volume)} · resolves {m.resolves}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-xl font-semibold tabular-nums text-nara-amber">{m.yes.toFixed(1)}%</div>
                    <DeltaBadge value={m.delta} className="mt-0.5" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* everything else that's tracked */}
      {rest.length > 0 && (
        <section aria-labelledby="rest-heading">
          <h2 id="rest-heading" className="mb-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
            Below the threshold · biggest moves first
          </h2>
          <div className="overflow-hidden rounded-2xl border border-nara-border bg-nara-surface">
            <ul className="divide-y divide-nara-border">
              {rest.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-nara-text">{m.name}</div>
                    <div className="font-mono text-[10px] text-nara-muted">
                      {fmtVol(m.volume)} · {m.resolves}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="font-mono text-sm tabular-nums text-nara-amber">{m.yes.toFixed(1)}%</span>
                    <DeltaBadge value={m.delta} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <p className="font-mono text-[11px] leading-relaxed text-nara-muted">
        Moves are in percentage points of YES probability over 24 hours (40% → 52% is +12 pts).
      </p>
    </div>
  );
}