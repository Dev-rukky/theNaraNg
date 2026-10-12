// components/nara/naira/NairaTracker.tsx
"use client";

import { useMemo, useState } from "react";
import { DegradedBanner } from "@/components/nara/DegradedBanner";
import { OddsHistoryChart } from "@/components/nara/OddsHistoryChart";
import { DeltaBadge } from "@/components/nara/primitives";
import { useMarketsPolling, type MarketsSnapshot } from "@/components/nara/markets/useMarketsPolling";
import type { AllMarketsRow } from "@/lib/nara/bayse";
import { fmtDelta, fmtVol } from "@/lib/nara/format";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;
const TRACKED_CATEGORIES = new Set<AllMarketsRow["category"]>(["naira", "cbn"]);

const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Lagos",
});

function oddsColor(yes: number) {
  return yes >= 60 ? "text-nara-amber" : yes >= 40 ? "text-nara-green" : "text-nara-red";
}

export function NairaTracker({ initial }: { initial: MarketsSnapshot }) {
  const { data, fetchedAt, isFetching, error } = useMarketsPolling(initial, POLL_MS);

  // Naira and CBN markets only, biggest first.
  const markets = useMemo(
    () =>
      data.rows
        .filter((r) => TRACKED_CATEGORIES.has(r.category) && r.status !== "resolved")
        .sort((a, b) => b.volume - a.volume),
    [data.rows],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Falls back to the biggest market, and recovers if the selected one closes.
  const selected = markets.find((m) => m.id === selectedId) ?? markets[0] ?? null;

  const summary = useMemo(() => {
    let volume = 0;
    let biggestMove: AllMarketsRow | null = null;
    for (const m of markets) {
      volume += m.volume;
      if (m.delta != null && (!biggestMove || Math.abs(m.delta) > Math.abs(biggestMove.delta ?? 0))) {
        biggestMove = m;
      }
    }
    return { volume, biggestMove };
  }, [markets]);

  return (
    <div className="space-y-8">
      {data.degraded && <DegradedBanner />}

      {markets.length === 0 ? (
        <div className="rounded-2xl border border-nara-border bg-nara-surface px-6 py-16 text-center">
          <p className="text-sm text-nara-text">No Naira or CBN markets are open on Bayse right now.</p>
          <p className="mt-1 font-mono text-[11px] text-nara-muted">
            This page updates automatically when new ones open.
          </p>
        </div>
      ) : (
        <>
          {/* summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Open Naira & CBN markets" value={String(markets.length)} />
            <Stat label="Volume across them" value={fmtVol(summary.volume)} />
            <div className="rounded-2xl border border-nara-border bg-nara-surface p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">Biggest 24h move</div>
              {summary.biggestMove ? (
                <>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={cn(
                        "font-mono text-2xl font-semibold tabular-nums",
                        (summary.biggestMove.delta ?? 0) < 0 ? "text-nara-red" : "text-nara-green",
                      )}
                    >
                      {fmtDelta(summary.biggestMove.delta ?? 0)}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">pts</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(summary.biggestMove!.id)}
                    className="mt-1 line-clamp-2 text-left text-[12px] text-nara-muted hover:text-nara-text"
                  >
                    {summary.biggestMove.name}
                  </button>
                </>
              ) : (
                <div className="mt-2 font-mono text-2xl text-nara-muted">—</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* chart for the selected market; key resets its range toggle when switching */}
            <div className="lg:col-span-2">
              {selected && (
                <OddsHistoryChart
                  key={selected.id}
                  eventId={selected.id}
                  title={selected.name}
                  eyebrow={`${selected.category === "cbn" ? "CBN" : "Naira"} market · odds history`}
                  initialYes={selected.yes}
                  initialDelta={selected.delta ?? 0}
                />
              )}
            </div>

            {/* market list */}
            <section
              aria-label="Naira and CBN markets"
              className="flex max-h-[420px] flex-col overflow-hidden rounded-2xl border border-nara-border bg-nara-surface"
            >
              <div className="flex items-center justify-between border-b border-nara-border px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
                <span>Markets</span>
                <span aria-live="polite" className={cn(isFetching && "text-nara-amber", error && "text-nara-red")}>
                  {isFetching ? (
                    "Refreshing…"
                  ) : error ? (
                    "Update failed · retrying"
                  ) : (
                    <time suppressHydrationWarning>Updated {timeFormatter.format(fetchedAt)} WAT</time>
                  )}
                </span>
              </div>
              <ul className="divide-y divide-nara-border overflow-y-auto">
                {markets.map((m) => {
                  const active = m.id === selected?.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          active ? "bg-nara-amber/10" : "hover:bg-nara-surface2/60",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={cn("line-clamp-2 text-[13px]", active ? "text-nara-amber" : "text-nara-text")}>
                            {m.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest text-nara-muted">
                            {m.category === "cbn" ? "CBN" : "Naira"} · {m.volume > 0 ? fmtVol(m.volume) : "—"} · {m.resolves}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className={cn("font-mono text-sm font-semibold tabular-nums", oddsColor(m.yes))}>
                            {m.yes.toFixed(1)}%
                          </span>
                          {m.delta == null ? (
                            <span className="font-mono text-[10px] text-nara-muted">—</span>
                          ) : (
                            <DeltaBadge value={m.delta} />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <p className="font-mono text-[11px] leading-relaxed text-nara-muted">
            Each figure is the crowd&apos;s probability that a market resolves YES (for example, &ldquo;Will ₦/USD close
            above ₦1,600 by Friday?&rdquo;). It is not an exchange rate. 24h moves are in percentage points.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-nara-border bg-nara-surface p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-nara-amber">{value}</div>
    </div>
  );
}