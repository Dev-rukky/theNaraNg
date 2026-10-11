// lib/nara/bayse.ts
// Server-only Bayse data layer. Replaces bayse.function.ts.
// Import from Server Components and route handlers. Client components that need
// price history import from "./bayse.actions" instead.
import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { MARKETS, STATS, TICKER, USDNGN_HISTORY } from "./mock";
import { bayseFetch } from "./bayse-client";

/* =============================================================== settings */

const ALL_MARKETS_REVALIDATE_S = 30;
const LANDING_REVALIDATE_S = 60;
const EVENT_HISTORY_REVALIDATE_S = 120;
const ROLLING_VOLUME_REVALIDATE_S = 600;

const MAX_CONCURRENT_CALLS = 4;
const BREAKER_MS = 60_000;
const RESOLVING_SOON_MS = 48 * 3600 * 1000;
const WEEK_MS = 7 * 24 * 3600 * 1000;
const DELTA_EVENTS = 12; // how many top events get a 24h history lookup
const PER_PAGE = 100;
const MAX_PAGES = 6;

const EVENT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/* ================================================= rate limiting & safety */

function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const pump = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    queue.shift()!();
  };
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        // Promise.resolve().then(fn) also catches a synchronous throw,
        // which would otherwise leave the slot permanently "active".
        Promise.resolve()
          .then(fn)
          .then(resolve, reject)
          .finally(() => {
            active--;
            pump();
          });
      });
      pump();
    });
  };
}

const bayseLimit = createLimiter(MAX_CONCURRENT_CALLS);

const inflight = new Map<string, Promise<unknown>>();
function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

let breakerOpenUntil = 0;
const breakerIsOpen = () => Date.now() < breakerOpenUntil;
function tripBreaker(ms = BREAKER_MS) {
  breakerOpenUntil = Date.now() + ms;
  console.warn(`[bayse] circuit breaker tripped for ${ms}ms`);
}
function looksLikeRateLimit(err: unknown) {
  return /429|rate.?limit|too many requests/i.test(errMsg(err));
}
function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function guardedBayseFetch<T>(
  path: string,
  opts: Parameters<typeof bayseFetch>[1],
): Promise<T> {
  if (breakerIsOpen()) throw new Error("bayse circuit breaker open — skipping call");
  return bayseLimit(async () => {
    // Re-check: the breaker may have tripped while this call waited in the queue.
    if (breakerIsOpen()) throw new Error("bayse circuit breaker open — skipping call");
    try {
      return await bayseFetch<T>(path, opts);
    } catch (err) {
      if (looksLikeRateLimit(err)) tripBreaker();
      throw err;
    }
  });
}

/* ============================================================ Bayse types */

type BayseMarket = {
  id: string;
  title: string;
  status: string;
  outcome1Label: string;
  outcome1Price: number;
  outcome2Price: number;
  feePercentage?: number;
  totalOrders?: number;
};

type BayseEvent = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category?: string;
  type?: string;
  engine?: string;
  status: string;
  resolutionDate?: string;
  closingDate?: string;
  imageUrl?: string;
  liquidity?: number;
  totalVolume?: number;
  totalOrders?: number;
  supportedCurrencies?: string[];
  markets: BayseMarket[];
};

type BayseEventsResponse = {
  events: BayseEvent[];
  pagination?: { page: number; size: number; lastPage: number; totalCount: number };
};

type BaysePricePoint = { e: number; p: number };
type BaysePriceHistory = {
  eventId: string;
  eventTitle: string;
  markets: { marketId: string; title: string; priceHistory: BaysePricePoint[] }[];
};

type BayseTrade = {
  id: string;
  marketId: string;
  size: number;
  takerPrice: number;
  createdAt: string;
};
type BayseTradesResponse = {
  data: BayseTrade[];
  pagination: { page: number; size: number; totalCount: number; lastPage: number };
};

type TimePeriod = "12H" | "24H" | "1W" | "1M";

/* ========================================================== public types */

export type LandingMarket = {
  id: string;
  slug: string;
  name: string;
  yes: number;
  delta: number;
  volume: number;
  resolves: string;
};
export type HistoryPoint = { t: string; crowd: number };
export type LandingData = {
  markets: LandingMarket[];
  ticker: { name: string; yes: number; delta: number }[];
  history: HistoryPoint[];
  featured: { id: string; slug: string; title: string; yes: number; delta: number; volume: number };
  stats: {
    volume: number;
    /** What `volume` covers: the rolling 7-day estimate, or all-time totals as a fallback. */
    volumeWindow: "7d" | "all-time";
    markets: number;
    /** Largest 24h move among the top markets, signed (percentage points). */
    sharpest: number;
    resolvingSoon: number;
    accuracy: number;
  };
  asOf: string;
  source: "bayse" | "mock";
  degraded: boolean;
  degradedReason?: string;
};

export type HistoryRange = "1W" | "1M";

export type MarketStatus = "active" | "resolving_soon" | "resolved";
export type MarketCategory = "naira" | "cbn" | "sports" | "politics" | "crypto" | "world";

export type AllMarketsRow = {
  id: string;
  slug: string;
  name: string;
  category: MarketCategory | "other";
  /** YES probability, 0–100. */
  yes: number;
  /** 24h change in percentage points; null when history wasn't fetched. */
  delta: number | null;
  volume: number;
  resolves: string;
  /** Close time in epoch ms; null when unknown. */
  resolvesAt: number | null;
  status: MarketStatus;
};
export type AllMarketsData = {
  rows: AllMarketsRow[];
  total: number;
  asOf: string;
  source: "bayse" | "mock";
  degraded: boolean;
  degradedReason?: string;
};

/* ================================================================ helpers */

const resolveFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Lagos",
});

const historyFormatters: Record<TimePeriod, Intl.DateTimeFormat> = {
  "12H": new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Lagos" }),
  "24H": new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Lagos" }),
  "1W": new Intl.DateTimeFormat("en-NG", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Lagos" }),
  "1M": new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }),
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const clampPct = (n: number) => Math.min(100, Math.max(0, n));

function parseTime(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/** Includes the date, so markets more than a week out aren't ambiguous. */
function fmtResolve(ms: number | null): string {
  return ms === null ? "TBA" : `${resolveFormatter.format(ms)} WAT`;
}

/** Bayse timestamps may be seconds or milliseconds. */
function toMs(e: number) {
  return e < 1e12 ? e * 1000 : e;
}

function pickPrimaryMarket(ev: BayseEvent): BayseMarket | undefined {
  return ev.markets?.find((m) => m.status === "open") ?? ev.markets?.[0];
}

/** Uses the YES side even if Bayse lists NO as outcome 1. */
function yesPercent(m: BayseMarket | undefined): number {
  if (!m) return 0;
  const price = /^no$/i.test(m.outcome1Label?.trim() ?? "") ? m.outcome2Price : m.outcome1Price;
  return Number.isFinite(price) ? round1(clampPct(price * 100)) : 0;
}

function scoreFeatured(ev: BayseEvent): number {
  const t = `${ev.title} ${ev.category ?? ""} ${ev.description ?? ""}`.toLowerCase();
  let s = 0;
  if (/naira|ngn|usd\/?ngn|cbn|inflation|mpr|petrol|dangote|nigeria/.test(t)) s += 50;
  if (ev.supportedCurrencies?.includes("NGN")) s += 10;
  if ((ev.totalVolume ?? 0) > 0) s += Math.log10((ev.totalVolume ?? 0) + 1);
  return s;
}

function categorize(ev: BayseEvent): MarketCategory | "other" {
  const hay = `${ev.title} ${ev.category ?? ""} ${ev.description ?? ""}`.toLowerCase();
  if (/\bcbn\b|central bank|\bmpr\b|interest rate|monetary policy/.test(hay)) return "cbn";
  if (/naira|\bngn\b|usd\/?ngn|inflation|petrol|dangote|nigeria/.test(hay)) return "naira";
  if (/bitcoin|\bbtc\b|ethereum|\beth\b|crypto|solana|\bsol\b|altcoin/.test(hay)) return "crypto";
  if (/politic|president|election|tinubu|atiku|peter obi|senate|assembly/.test(hay)) return "politics";
  if (/football|soccer|\bnba\b|\bnfl\b|\bepl\b|premier league|champions|\bcup\b|\bmatch\b|cricket|tennis/.test(hay))
    return "sports";
  if (/world|global|china|russia|ukraine|opec|\bwar\b|summit/.test(hay)) return "world";
  return "other";
}

function statusOf(ev: BayseEvent, closeMs: number | null, now: number): MarketStatus {
  if (ev.status !== "open") return "resolved";
  if (closeMs !== null && closeMs > now && closeMs - now < RESOLVING_SOON_MS) return "resolving_soon";
  return "active";
}

function pickHistoryMarket(history: BaysePriceHistory | null, marketId?: string) {
  if (!history?.markets?.length) return undefined;
  return (marketId && history.markets.find((x) => x.marketId === marketId)) || history.markets[0];
}

/**
 * Change over the window in percentage points (e.g. 40% → 46% = +6.0).
 * Null when there isn't enough history to say.
 */
function computeDelta(history: BaysePriceHistory | null, marketId?: string): number | null {
  const pts = pickHistoryMarket(history, marketId)?.priceHistory ?? [];
  if (pts.length < 2) return null;
  return round1((pts[pts.length - 1].p - pts[0].p) * 100);
}

/** Downsamples to ~24 points, always keeping the latest one. */
function historyToSeries(
  history: BaysePriceHistory | null,
  range: TimePeriod,
  marketId?: string,
): HistoryPoint[] {
  const pts = pickHistoryMarket(history, marketId)?.priceHistory ?? [];
  if (!pts.length) return [];

  const fmt = historyFormatters[range];
  const toPoint = (p: BaysePricePoint): HistoryPoint => ({
    t: fmt.format(toMs(p.e)),
    crowd: Number((p.p * 100).toFixed(2)),
  });

  const step = Math.max(1, Math.floor(pts.length / 24));
  const out: HistoryPoint[] = [];
  let lastIndex = -1;
  for (let i = 0; i < pts.length; i += step) {
    out.push(toPoint(pts[i]));
    lastIndex = i;
  }
  if (lastIndex !== pts.length - 1) out.push(toPoint(pts[pts.length - 1]));
  return out;
}

/* ======================================================= upstream calls */

/** Coalesced + limited + breaker-protected. Throws on failure (so failures are never cached). */
function fetchPriceHistory(eventId: string, timePeriod: TimePeriod = "24H") {
  return coalesce(`ph:${eventId}:${timePeriod}`, () =>
    guardedBayseFetch<BaysePriceHistory>(
      `/pm/events/${encodeURIComponent(eventId)}/price-history?timePeriod=${timePeriod}&outcome=YES`,
      { attempts: 2, baseMs: 400, timeoutMs: 4000, integration: "price-history" },
    ),
  );
}

/** Same, but resolves to null instead of throwing — for "nice to have" lookups. */
async function tryPriceHistory(eventId: string, timePeriod: TimePeriod) {
  try {
    return await fetchPriceHistory(eventId, timePeriod);
  } catch {
    return null;
  }
}

async function fetchHistoryMap(ids: Iterable<string>, periodFor: (id: string) => TimePeriod) {
  const entries = await Promise.all(
    Array.from(ids, async (id) => [id, await tryPriceHistory(id, periodFor(id))] as const),
  );
  return new Map(entries);
}

function eventsPath(page: number, perPage: number) {
  return `/pm/events?currency=NGN&perPage=${perPage}&page=${page}&status=open`;
}

/* ===================================================== 7-day notional volume */

// Throws on failure so a failed rollup isn't cached as 0 for 10 minutes.
const cachedRolling7dNotional = unstable_cache(
  async (): Promise<number> => {
    const fromDate = new Date(Date.now() - WEEK_MS).toISOString();
    const res = await guardedBayseFetch<BayseTradesResponse>(
      `/pm/trades?perPage=50&fromDate=${encodeURIComponent(fromDate)}`,
      { attempts: 2, baseMs: 400, timeoutMs: 5000, integration: "list-events" },
    );
    const sample = res.data ?? [];
    if (!sample.length || !res.pagination?.totalCount) return 0;
    // Estimate: average notional of the latest 50 trades × total trade count.
    const avg = sample.reduce((s, t) => s + (t.size || 0) * (t.takerPrice || 0), 0) / sample.length;
    return Math.max(0, Math.round(avg * res.pagination.totalCount));
  },
  ["bayse-rolling-volume-v2"],
  { revalidate: ROLLING_VOLUME_REVALIDATE_S },
);

async function getRolling7dNotional(): Promise<number> {
  try {
    return await cachedRolling7dNotional();
  } catch (err) {
    console.error("[bayse] trades volume rollup failed:", errMsg(err));
    return 0;
  }
}

/* ================================================================ mocks */

function buildMockLanding(reason: string): LandingData {
  const markets: LandingMarket[] = MARKETS.map((m) => ({
    id: m.id,
    slug: m.id,
    name: m.name,
    yes: m.yes,
    delta: m.delta,
    volume: m.volume,
    resolves: m.resolves,
  }));
  const featured = MARKETS[0];
  return {
    markets,
    ticker: TICKER.map((t) => ({ name: t.name, yes: t.yes, delta: t.delta })),
    history: USDNGN_HISTORY.map((p) => ({ t: p.t, crowd: p.crowd })),
    featured: {
      id: featured.id,
      slug: featured.id,
      title: featured.name,
      yes: featured.yes,
      delta: featured.delta,
      volume: featured.volume,
    },
    stats: { ...STATS, volumeWindow: "7d" },
    asOf: new Date().toISOString(),
    source: "mock",
    degraded: true,
    degradedReason: reason,
  };
}

function buildMockAllMarkets(reason: string): AllMarketsData {
  const rows: AllMarketsRow[] = buildMockLanding(reason).markets.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    category: "other",
    yes: m.yes,
    delta: m.delta,
    volume: m.volume,
    resolves: m.resolves,
    resolvesAt: null,
    status: "active",
  }));
  return {
    rows,
    total: rows.length,
    asOf: new Date().toISOString(),
    source: "mock",
    degraded: true,
    degradedReason: reason,
  };
}

/* ============================================================== landing */

const cachedLandingData = unstable_cache(
  async (): Promise<LandingData> => {
    const payload = await guardedBayseFetch<BayseEventsResponse>(eventsPath(1, 30), {
      integration: "list-events",
    });

    const events = (payload?.events ?? []).filter((e) => e.status === "open" && e.markets?.length);
    if (!events.length) throw new Error("Bayse returned no open events");

    const featuredEv = [...events].sort((a, b) => scoreFeatured(b) - scoreFeatured(a))[0];
    const featuredMarket = pickPrimaryMarket(featuredEv);
    const topEvents = [...events]
      .sort((a, b) => (b.totalVolume ?? 0) - (a.totalVolume ?? 0))
      .slice(0, 6);

    const ids = new Set([...topEvents.map((e) => e.id), featuredEv.id]);
    const [histMap, sevenDayVolume] = await Promise.all([
      fetchHistoryMap(ids, (id) => (id === featuredEv.id ? "1W" : "24H")),
      getRolling7dNotional(),
    ]);

    const markets: LandingMarket[] = topEvents.map((ev) => {
      const pm = pickPrimaryMarket(ev);
      return {
        id: ev.id,
        slug: ev.slug,
        name: ev.title,
        yes: yesPercent(pm),
        delta: computeDelta(histMap.get(ev.id) ?? null, pm?.id) ?? 0,
        volume: Math.round(ev.totalVolume ?? 0),
        resolves: fmtResolve(parseTime(ev.closingDate ?? ev.resolutionDate)),
      };
    });

    const featuredHistory = histMap.get(featuredEv.id) ?? null;
    const totalVolume = events.reduce((s, e) => s + (e.totalVolume ?? 0), 0);
    const now = Date.now();
    const resolvingSoon = events.filter((e) => {
      const c = parseTime(e.closingDate);
      return c !== null && c > now && c - now < WEEK_MS;
    }).length;
    const sharpest = markets.reduce((s, m) => (Math.abs(m.delta) > Math.abs(s) ? m.delta : s), 0);

    return {
      markets,
      ticker: markets.map((m) => ({ name: m.name, yes: m.yes, delta: m.delta })),
      history: historyToSeries(featuredHistory, "1W", featuredMarket?.id),
      featured: {
        id: featuredEv.id,
        slug: featuredEv.slug,
        title: featuredEv.title,
        yes: yesPercent(featuredMarket),
        delta: computeDelta(featuredHistory, featuredMarket?.id) ?? 0,
        volume: Math.round(featuredEv.totalVolume ?? 0),
      },
      stats: {
        volume: sevenDayVolume > 0 ? sevenDayVolume : Math.round(totalVolume),
        volumeWindow: sevenDayVolume > 0 ? "7d" : "all-time",
        markets: events.length,
        sharpest: round1(sharpest),
        resolvingSoon,
        accuracy: 73.4, // TODO: hard-coded, not computed from Bayse data
      },
      asOf: new Date().toISOString(),
      source: "bayse",
      degraded: false,
    };
  },
  ["bayse-landing-data-v2"],
  { revalidate: LANDING_REVALIDATE_S },
);

let lastGoodLanding: LandingData | null = null;

/** Live landing data; falls back to the last good copy, then to mock data. */
export const getLandingData = cache(async (): Promise<LandingData> => {
  try {
    const data = await cachedLandingData();
    lastGoodLanding = data;
    return data;
  } catch (err) {
    const reason = errMsg(err);
    console.error("[bayse] landing data failed:", reason);
    if (lastGoodLanding) return { ...lastGoodLanding, degraded: true, degradedReason: reason };
    return buildMockLanding(reason);
  }
});

/* ======================================================= event history */

const cachedEventHistory = unstable_cache(
  async (eventId: string, range: HistoryRange) =>
    historyToSeries(await fetchPriceHistory(eventId, range), range),
  ["bayse-event-history-v2"],
  { revalidate: EVENT_HISTORY_REVALIDATE_S },
);

/** Price series for one event. Returns [] for invalid ids or when Bayse fails. */
export async function getEventHistory(data: {
  eventId: string;
  range?: HistoryRange;
}): Promise<HistoryPoint[]> {
  if (!EVENT_ID_RE.test(data.eventId)) return [];
  const range: HistoryRange = data.range === "1M" ? "1M" : "1W";
  try {
    return await cachedEventHistory(data.eventId, range);
  } catch (err) {
    console.error(`[bayse] history for ${data.eventId} failed:`, errMsg(err));
    return [];
  }
}

/* ========================================================== all markets */

const cachedAllMarkets = unstable_cache(
  async (): Promise<AllMarketsData> => {
    // Page 1 must succeed; otherwise throw and let the caller fall back.
    const first = await guardedBayseFetch<BayseEventsResponse>(eventsPath(1, PER_PAGE), {
      integration: "list-events",
      attempts: 2,
      timeoutMs: 6000,
    });
    const events = [...(first?.events ?? [])];
    const lastPage = Math.min(first?.pagination?.lastPage ?? 1, MAX_PAGES);

    // Later pages: keep whatever succeeds instead of failing the whole list.
    let failedPages = 0;
    if (lastPage > 1 && events.length >= PER_PAGE) {
      const results = await Promise.allSettled(
        Array.from({ length: lastPage - 1 }, (_, i) =>
          guardedBayseFetch<BayseEventsResponse>(eventsPath(i + 2, PER_PAGE), {
            integration: "list-events",
            attempts: 2,
            timeoutMs: 6000,
          }),
        ),
      );
      for (const r of results) {
        if (r.status === "fulfilled") events.push(...(r.value?.events ?? []));
        else failedPages++;
      }
    }

    const open = events.filter((e) => e.status === "open" && e.markets?.length);
    if (!open.length) throw new Error("Bayse returned no open markets");

    const topForDelta = [...open]
      .sort((a, b) => (b.totalVolume ?? 0) - (a.totalVolume ?? 0))
      .slice(0, DELTA_EVENTS);
    const histMap = await fetchHistoryMap(
      topForDelta.map((e) => e.id),
      () => "24H",
    );

    const now = Date.now();
    const rows: AllMarketsRow[] = open.map((ev) => {
      const pm = pickPrimaryMarket(ev);
      const closeMs = parseTime(ev.closingDate ?? ev.resolutionDate);
      const hist = histMap.get(ev.id);
      // NOTE: falls back to liquidity / an order-count estimate when totalVolume is low.
      const volume = Math.max(
        Math.round(ev.totalVolume ?? 0),
        Math.round(ev.liquidity ?? 0),
        (ev.totalOrders ?? 0) * 500,
      );
      return {
        id: ev.id,
        slug: ev.slug,
        name: ev.title,
        category: categorize(ev),
        yes: yesPercent(pm),
        delta: hist ? computeDelta(hist, pm?.id) : null,
        volume,
        resolves: fmtResolve(closeMs),
        resolvesAt: closeMs,
        status: statusOf(ev, closeMs, now),
      };
    });

    return {
      rows,
      total: rows.length,
      asOf: new Date().toISOString(),
      source: "bayse",
      degraded: failedPages > 0,
      degradedReason: failedPages > 0 ? `${failedPages} page(s) failed to load` : undefined,
    };
  },
  ["bayse-all-markets-v2"],
  { revalidate: ALL_MARKETS_REVALIDATE_S },
);

let lastGoodAllMarkets: AllMarketsData | null = null;

/** Every open NGN market; falls back to the last good copy, then to mock data. */
export const getAllMarkets = cache(async (): Promise<AllMarketsData> => {
  try {
    const data = await cachedAllMarkets();
    lastGoodAllMarkets = data;
    return data;
  } catch (err) {
    const reason = errMsg(err);
    console.error("[bayse] getAllMarkets failed:", reason);
    if (lastGoodAllMarkets) {
      return { ...lastGoodAllMarkets, degraded: true, degradedReason: reason };
    }
    return buildMockAllMarkets(reason);
  }
});