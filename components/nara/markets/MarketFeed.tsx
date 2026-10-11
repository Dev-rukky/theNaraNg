// components/nara/markets/MarketsFeed.tsx
"use client";

import { useCallback, useDeferredValue, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Star,
  X,
} from "lucide-react";
import { DegradedBanner } from "@/components/nara/DegradedBanner";
import { DeltaBadge, OddsBar } from "@/components/nara/primitives";
import { OddsHistoryChart } from "@/components/nara/OddsHistoryChart";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AllMarketsRow, MarketCategory, MarketStatus } from "@/lib/nara/bayse";
import { fmtVol } from "@/lib/nara/format";
import { readStored, useStoredString } from "@/lib/hooks/useStoredString";
import { cn } from "@/lib/utils";
import { useMarketsPolling, type MarketsSnapshot } from "./useMarketsPolling";

/* ------------------------------------------------------------------ config */

const WATCHLIST_KEY = "nara:watchlist";
const REFRESH_KEY = "nara:markets:refresh";
const PAGE_SIZE = 25;

const REFRESH_OPTIONS = [
  { value: 15_000, label: "15s" },
  { value: 30_000, label: "30s" },
  { value: 60_000, label: "60s" },
] as const;
type RefreshMs = (typeof REFRESH_OPTIONS)[number]["value"];
const DEFAULT_REFRESH: RefreshMs = 30_000;

type SortKey = "volume" | "yes" | "delta" | "resolvesAt" | "name";
type SortDir = "asc" | "desc";
type CatFilter = "all" | MarketCategory | "other";

const CATEGORIES: { id: CatFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "naira", label: "Naira" },
  { id: "cbn", label: "CBN" },
  { id: "sports", label: "Sports" },
  { id: "politics", label: "Politics" },
  { id: "crypto", label: "Crypto" },
  { id: "world", label: "World" },
];

const STATUS_STYLES: Record<MarketStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-nara-green/15 text-nara-green border-nara-green/30" },
  resolving_soon: {
    label: "Resolving",
    cls: "bg-nara-amber/15 text-nara-amber border-nara-amber/30",
  },
  resolved: { label: "Resolved", cls: "bg-nara-muted/10 text-nara-muted border-nara-border" },
};

const TONE_TEXT = {
  amber: "text-nara-amber",
  green: "text-nara-green",
  red: "text-nara-red",
  muted: "text-nara-muted",
} as const;

const CHIP =
  "rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors";
const CHIP_ON = "border-nara-amber/50 bg-nara-amber/15 text-nara-amber";
const CHIP_OFF = "border-nara-border bg-nara-surface2 text-nara-muted hover:text-nara-text";
const PAGER_BTN =
  "inline-flex items-center rounded border border-nara-border px-2 py-0.5 hover:text-nara-text disabled:opacity-40";

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Africa/Lagos",
});

/* ----------------------------------------------------------------- helpers */

function toRefreshMs(raw: string | null): RefreshMs {
  const n = Number(raw);
  return REFRESH_OPTIONS.find((o) => o.value === n)?.value ?? DEFAULT_REFRESH;
}

function isMissing(v: unknown) {
  return v == null || (typeof v === "number" && Number.isNaN(v));
}

/** Missing values always sort last; ties fall back to id so rows don't jump on refresh. */
function compareRows(a: AllMarketsRow, b: AllMarketsRow, key: SortKey, dir: 1 | -1) {
  const av: unknown = a[key];
  const bv: unknown = b[key];
  const aMissing = isMissing(av);
  const bMissing = isMissing(bv);

  if (aMissing || bMissing) {
    if (aMissing && bMissing) return collator.compare(String(a.id), String(b.id));
    return aMissing ? 1 : -1;
  }

  const primary =
    typeof av === "string" && typeof bv === "string"
      ? collator.compare(av, bv)
      : Number(av) - Number(bv);

  return primary !== 0 ? primary * dir : collator.compare(String(a.id), String(b.id));
}

function signedPct(n: number) {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

/* ------------------------------------------------------------------- hooks */

function parseIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [],
    );
  } catch {
    return new Set();
  }
}

function useWatchlist() {
  const [raw, setRaw] = useStoredString(WATCHLIST_KEY);
  const ids = useMemo(() => parseIds(raw), [raw]);

  // Reads the latest stored list, so quick repeated taps never use stale state.
  const toggle = useCallback(
    (id: string) => {
      const next = parseIds(readStored(WATCHLIST_KEY));
      if (!next.delete(id)) next.add(id);
      setRaw(JSON.stringify([...next]));
    },
    [setRaw],
  );

  return { ids, toggle };
}

/* ------------------------------------------------------------------- feed */

export function MarketsFeed({ initial }: { initial: MarketsSnapshot }) {
  const [rawRefresh, setRawRefresh] = useStoredString(REFRESH_KEY);
  const refreshMs = toRefreshMs(rawRefresh);
  const { data, fetchedAt, isFetching, error, refresh } = useMarketsPolling(initial, refreshMs);
  const rows = data.rows;
  const watchlist = useWatchlist();

  const [cat, setCat] = useState<CatFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filters reset the page in the same update, instead of an effect one render later.
  const selectCategory = (c: CatFilter) => {
    setCat(c);
    setPage(1);
  };
  const changeSearch = (q: string) => {
    setSearch(q);
    setPage(1);
  };
  const toggleWatchedOnly = () => {
    setWatchedOnly((v) => !v);
    setPage(1);
  };
  const toggleSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  // One pass over the rows for the stat cards and category counts.
  const summary = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    let totalVol = 0;
    let resolvingSoon = 0;
    let sharpest = 0;
    for (const r of rows) {
      counts[r.category] = (counts[r.category] ?? 0) + 1;
      totalVol += r.volume || 0;
      if (r.status === "resolving_soon") resolvingSoon += 1;
      if (r.delta != null && Math.abs(r.delta) > Math.abs(sharpest)) sharpest = r.delta;
    }
    return { counts, totalVol, resolvingSoon, sharpest };
  }, [rows]);

  // Only count watched markets that still exist in the feed.
  const watchedCount = useMemo(
    () => rows.reduce((n, r) => n + (watchlist.ids.has(r.id) ? 1 : 0), 0),
    [rows, watchlist.ids],
  );

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const dir = sortDir === "asc" ? 1 : -1;
    const out = rows.filter(
      (r) =>
        (!watchedOnly || watchlist.ids.has(r.id)) &&
        (cat === "all" || r.category === cat) &&
        (!q || r.name.toLowerCase().includes(q)),
    );
    return out.sort((a, b) => compareRows(a, b, sortKey, dir));
  }, [rows, cat, deferredSearch, sortKey, sortDir, watchedOnly, watchlist.ids]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Looked up from the latest data, so the quick view updates on every refresh.
  const selected = useMemo(
    () => (selectedId ? (rows.find((r) => r.id === selectedId) ?? null) : null),
    [rows, selectedId],
  );

  return (
    <div className="space-y-6">
      {data.degraded && <DegradedBanner />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total volume" value={fmtVol(summary.totalVol)} />
        <StatCard label="Open markets" value={String(data.total)} />
        <StatCard
          label="Sharpest 24h"
          value={signedPct(summary.sharpest)}
          tone={summary.sharpest < 0 ? "down" : "up"}
        />
        <StatCard label="Resolving / 48h" value={String(summary.resolvingSoon)} />
      </div>

      {/* filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-nara-border bg-nara-surface p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCategory(c.id)}
              aria-pressed={cat === c.id}
              className={cn(CHIP, cat === c.id ? CHIP_ON : CHIP_OFF)}
            >
              {c.label}
              <span className="ml-1.5 text-nara-muted/70">{summary.counts[c.id] ?? 0}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={toggleWatchedOnly}
            aria-pressed={watchedOnly}
            title="Show only watched markets"
            className={cn(CHIP, "inline-flex items-center gap-1", watchedOnly ? CHIP_ON : CHIP_OFF)}
          >
            <Star className={cn("size-3", watchedOnly && "fill-nara-amber")} strokeWidth={2} aria-hidden />
            Watched
            <span className="ml-1 text-nara-muted/70">{watchedCount}</span>
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-nara-muted"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search markets…"
            aria-label="Search markets"
            className="h-9 w-full rounded-md border border-nara-border bg-nara-surface2 pl-8 pr-8 font-mono text-[12px] text-nara-text placeholder:text-nara-muted focus:border-nara-amber/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => changeSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-nara-muted hover:text-nara-text"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <section
        aria-label="Markets"
        className="overflow-hidden rounded-2xl border border-nara-border bg-nara-surface"
      >
        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-nara-border px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
          <span>
            {filtered.length} of {data.total} markets · pg {safePage}/{pageCount}
          </span>
          <div className="flex items-center gap-2">
            <span aria-live="polite" className={cn(isFetching && "text-nara-amber", error && "text-nara-red")}>
              {isFetching ? (
                "Refreshing…"
              ) : error ? (
                "Update failed · retrying"
              ) : (
                <time dateTime={new Date(fetchedAt).toISOString()} suppressHydrationWarning>
                  Updated {timeFormatter.format(fetchedAt)}
                </time>
              )}
            </span>
            <div
              className="flex overflow-hidden rounded border border-nara-border"
              role="group"
              aria-label="Auto-refresh interval"
            >
              {REFRESH_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setRawRefresh(String(o.value))}
                  aria-pressed={refreshMs === o.value}
                  className={cn(
                    "px-2 py-0.5 transition-colors",
                    refreshMs === o.value
                      ? "bg-nara-amber/20 text-nara-amber"
                      : "text-nara-muted hover:text-nara-text",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isFetching}
              title="Refresh now"
              className="inline-flex items-center gap-1 rounded border border-nara-border px-2 py-0.5 text-nara-muted transition-colors hover:text-nara-amber disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3", isFetching && "animate-spin")} aria-hidden />
              Refresh
            </button>
          </div>
        </div>

        {/* column headers: same flex + 12-col grid as the rows, so they line up */}
        <div className="hidden items-center gap-3 border-b border-nara-border px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-nara-muted md:flex">
          <span className="flex w-7 shrink-0 justify-center">
            <Star className="size-3" aria-hidden />
            <span className="sr-only">Watch</span>
          </span>
          <div className="grid min-w-0 flex-1 grid-cols-12 gap-3">
            <SortHead className="col-span-5" k="name" sk={sortKey} sd={sortDir} onSort={toggleSort}>
              Market
            </SortHead>
            <span className="col-span-3">Odds</span>
            <SortHead className="col-span-1 justify-end" k="yes" sk={sortKey} sd={sortDir} onSort={toggleSort}>
              YES
            </SortHead>
            <SortHead className="col-span-1 justify-end" k="delta" sk={sortKey} sd={sortDir} onSort={toggleSort}>
              24h
            </SortHead>
            <SortHead className="col-span-1 justify-end" k="volume" sk={sortKey} sd={sortDir} onSort={toggleSort}>
              Vol
            </SortHead>
            <SortHead
              className="col-span-1 justify-end"
              k="resolvesAt"
              sk={sortKey}
              sd={sortDir}
              onSort={toggleSort}
            >
              Resolves
            </SortHead>
          </div>
        </div>

        <ul className="divide-y divide-nara-border">
          {pageRows.length === 0 && (
            <li className="px-5 py-12 text-center font-mono text-[12px] text-nara-muted">
              {watchedOnly && watchedCount === 0
                ? "No watched markets yet. Tap the star on any row to add it."
                : "No markets match your filters."}
            </li>
          )}
          {pageRows.map((m) => (
            <MarketRow
              key={m.id}
              market={m}
              watched={watchlist.ids.has(m.id)}
              onToggleWatch={watchlist.toggle}
              onOpen={setSelectedId}
            />
          ))}
        </ul>

        {filtered.length > PAGE_SIZE && (
          <nav
            aria-label="Pagination"
            className="flex items-center justify-between gap-3 border-t border-nara-border px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted"
          >
            <span>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(1)} disabled={safePage === 1} className={PAGER_BTN}>
                First
              </button>
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 1}
                aria-label="Previous page"
                className={PAGER_BTN}
              >
                <ChevronLeft className="size-3" />
              </button>
              <span className="px-2 text-nara-text">
                {safePage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage === pageCount}
                aria-label="Next page"
                className={PAGER_BTN}
              >
                <ChevronRight className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => setPage(pageCount)}
                disabled={safePage === pageCount}
                className={PAGER_BTN}
              >
                Last
              </button>
            </div>
          </nav>
        )}
      </section>

      <QuickViewPanel row={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

/* ------------------------------------------------------------- components */

function MarketRow({
  market: m,
  watched,
  onToggleWatch,
  onOpen,
}: {
  market: AllMarketsRow;
  watched: boolean;
  onToggleWatch: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-nara-surface2/60">
      {/* Separate from the row button: a button inside a button is invalid HTML. */}
      <button
        type="button"
        onClick={() => onToggleWatch(m.id)}
        aria-pressed={watched}
        aria-label={`Watch ${m.name}`}
        className={cn(
          "flex w-7 shrink-0 justify-center rounded p-1 transition-colors",
          watched ? "text-nara-amber" : "text-nara-muted hover:text-nara-amber",
        )}
      >
        <Star className={cn("size-4", watched && "fill-nara-amber")} strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={() => onOpen(m.id)}
        className="grid min-w-0 flex-1 grid-cols-12 items-center gap-3 text-left"
      >
        <span className="col-span-12 min-w-0 md:col-span-5">
          <span className="flex items-center gap-2">
            <StatusBadge status={m.status} />
            <span className="truncate text-[13px] text-nara-text">{m.name}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-nara-muted">
            <CategoryChip cat={m.category} />
            <span>Resolves {m.resolves}</span>
          </span>
        </span>
        <span className="col-span-9 md:col-span-3">
          <OddsBar value={m.yes} />
        </span>
        <span className="col-span-3 text-right md:col-span-1">
          <span
            className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              m.yes >= 60 ? "text-nara-amber" : m.yes >= 40 ? "text-nara-green" : "text-nara-red",
            )}
          >
            {m.yes.toFixed(1)}%
          </span>
        </span>
        <span className="hidden justify-end md:col-span-1 md:flex">
          {m.delta == null ? (
            <span className="font-mono text-[11px] text-nara-muted" title="No 24h history">
              —
            </span>
          ) : (
            <DeltaBadge value={m.delta} />
          )}
        </span>
        <span className="hidden text-right font-mono text-[11px] text-nara-muted md:col-span-1 md:block">
          {m.volume > 0 ? fmtVol(m.volume) : "—"}
        </span>
        <span className="hidden truncate text-right font-mono text-[10px] text-nara-muted md:col-span-1 md:block">
          {m.resolves}
        </span>
      </button>
    </li>
  );
}

function SortHead({
  children,
  k,
  sk,
  sd,
  onSort,
  className,
}: {
  children: ReactNode;
  k: SortKey;
  sk: SortKey;
  sd: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sk === k;
  const Icon = sd === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(k)}
      aria-label={
        active ? `Sorted by ${String(children)}, ${sd === "asc" ? "ascending" : "descending"}` : undefined
      }
      className={cn(
        "flex items-center gap-1 uppercase tracking-widest transition-colors hover:text-nara-text",
        active && "text-nara-amber",
        className,
      )}
    >
      {children}
      {active && <Icon className="size-3" strokeWidth={2.5} aria-hidden />}
    </button>
  );
}

function StatusBadge({ status }: { status: MarketStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.active;
  return (
    <span
      className={cn(
        "shrink-0 rounded-sm border px-1.5 py-px font-mono text-[9px] uppercase tracking-widest",
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}

function CategoryChip({ cat }: { cat: MarketCategory | "other" }) {
  return (
    <span className="rounded-sm border border-nara-border bg-nara-surface2 px-1.5 py-px text-[9px] uppercase tracking-widest text-nara-muted">
      {cat === "other" ? "Misc" : cat.toUpperCase()}
    </span>
  );
}

function QuickViewPanel({ row, onClose }: { row: AllMarketsRow | null; onClose: () => void }) {
  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-nara-border bg-nara-surface text-nara-text sm:max-w-xl"
      >
        {row && (
          <>
            <SheetHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2">
                <StatusBadge status={row.status} />
                <CategoryChip cat={row.category} />
              </div>
              <SheetTitle className="text-base font-medium text-nara-text">{row.name}</SheetTitle>
              <SheetDescription className="font-mono text-[11px] text-nara-muted">
                Resolves {row.resolves} · Vol {fmtVol(row.volume)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <MiniStat label="YES" value={`${row.yes.toFixed(1)}%`} tone={row.yes >= 50 ? "amber" : "red"} />
              <MiniStat label="NO" value={`${(100 - row.yes).toFixed(1)}%`} tone="muted" />
              <MiniStat
                label="24h"
                value={row.delta == null ? "—" : signedPct(row.delta)}
                tone={row.delta == null ? "muted" : row.delta >= 0 ? "green" : "red"}
              />
            </div>

            <div className="mt-5">
              <OddsHistoryChart
                eventId={row.id}
                title={row.name}
                initialSeries={[]}
                initialYes={row.yes}
                initialDelta={row.delta ?? 0}
              />
            </div>

            <div className="mt-5 rounded-xl border border-nara-border bg-nara-surface2/60 p-4">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
                Orderbook · indicative
              </div>
              <MockOrderbook yes={row.yes} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof TONE_TEXT;
}) {
  return (
    <div className="rounded-lg border border-nara-border bg-nara-surface2/60 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">{label}</div>
      <div className={cn("mt-1 font-mono text-lg font-semibold tabular-nums", TONE_TEXT[tone])}>
        {value}
      </div>
    </div>
  );
}

function MockOrderbook({ yes }: { yes: number }) {
  const mid = yes / 100;
  const levels = Array.from({ length: 5 }, (_, i) => {
    const offset = (i + 1) * 0.01;
    return {
      bid: Math.max(0.01, mid - offset),
      ask: Math.min(0.99, mid + offset),
      bidSize: Math.round(1200 / (i + 1)) * 100,
      askSize: Math.round(900 / (i + 1)) * 100,
    };
  });

  return (
    <div className="grid grid-cols-2 gap-3 font-mono text-[11px] tabular-nums">
      <BookSide title="Bid" tone="text-nara-green" levels={levels.map((l) => [l.bid, l.bidSize])} />
      <BookSide title="Ask" tone="text-nara-red" levels={levels.map((l) => [l.ask, l.askSize])} />
    </div>
  );
}

function BookSide({
  title,
  tone,
  levels,
}: {
  title: string;
  tone: string;
  levels: [price: number, size: number][];
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[9px] uppercase tracking-widest text-nara-muted">
        <span>{title}</span>
        <span>Size</span>
      </div>
      {levels.map(([price, size], i) => (
        <div key={i} className={cn("flex justify-between py-0.5", tone)}>
          <span>{(price * 100).toFixed(1)}¢</span>
          <span className="text-nara-muted">₦{size.toLocaleString("en-NG")}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "up" | "down";
}) {
  return (
    <div className="rounded-xl border border-nara-border bg-nara-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">{label}</div>
      <div
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          tone === "up" && "text-nara-green",
          tone === "down" && "text-nara-red",
          tone === "neutral" && "text-nara-amber",
        )}
      >
        {value}
      </div>
    </div>
  );
}