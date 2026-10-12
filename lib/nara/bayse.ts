// lib/nara/bayse.ts
// Server-only Bayse data layer. Replaces bayse.function.ts.
// Import from Server Components and route handlers. Client components that need
// price history import from "./bayse.actions" instead.
import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { MARKETS, STATS, TICKER, USDNGN_HISTORY } from "./mock";
import { BayseError, bayseFetch } from "./bayse-client";

/* =============================================================== settings */

const OPEN_EVENTS_REVALIDATE_S = 30; // the shared event list both pages build from
const ALL_MARKETS_REVALIDATE_S = 30;
const LANDING_REVALIDATE_S = 60;
const EVENT_HISTORY_REVALIDATE_S = 120;
const ROLLING_VOLUME_REVALIDATE_S = 600;

const MAX_CONCURRENT_CALLS = 4;
const BREAKER_MS = 60_000; // after a rate limit (429)
const OUTAGE_BREAKER_MS = 30_000; // after a timeout / network error / 5xx

// Budget for each page of the event list (~650 KB per 100 events). Generous enough
// for a slow connection; normally only the very first load waits on it, because
// after that the cache serves stored data and refreshes in the background.
const EVENTS_PAGE_CALL = { attempts: 2, timeoutMs: 12_000, overallDeadlineMs: 15_000 } as const;
const RESOLVING_SOON_MS = 48 * 3600 * 1000;
const WEEK_MS = 7 * 24 * 3600 * 1000;
const DELTA_EVENTS = 12; // how many top events get a 24h history lookup
const EVENTS_PAGE_SIZE = 100;
const MAX_EVENT_PAGES = 10; // up to 1,000 open events (Bayse had 575 when this was written)
const DESCRIPTION_CHARS = 300; // enough for categorising; keeps the cached list small

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

/** Thrown instead of calling Bayse while the breaker is open. Expected, so never logged as an error. */
class BreakerOpenError extends Error {
  constructor() {
    super("Bayse temporarily paused after a failure — serving cached data");
    this.name = "BreakerOpenError";
  }
}

let breakerOpenUntil = 0;
const breakerIsOpen = () => Date.now() < breakerOpenUntil;
function tripBreaker(ms = BREAKER_MS) {
  breakerOpenUntil = Date.now() + ms;
  console.warn(`[bayse] Bayse unreachable or rate-limited; pausing calls for ${ms / 1000}s and serving cached data`);
}
function looksLikeRateLimit(err: unknown) {
  return /429|rate.?limit|too many requests/i.test(errMsg(err));
}
/** Bayse unreachable or failing on its side (not a bad request from us). */
function looksLikeOutage(err: unknown, countServerErrors: boolean) {
  if (err instanceof BayseError && err.status !== undefined) return countServerErrors && err.status >= 500;
  return /timed out|fetch failed|network|ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|socket/i.test(errMsg(err));
}
function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function guardedBayseFetch<T>(
  path: string,
  opts: Parameters<typeof bayseFetch>[1],
): Promise<T> {
  if (breakerIsOpen()) throw new BreakerOpenError();
  return bayseLimit(async () => {
    // Re-check: the breaker may have tripped while this call waited in the queue.
    if (breakerIsOpen()) throw new BreakerOpenError();
    try {
      return await bayseFetch<T>(path, opts);
    } catch (err) {
      // Either way, stop calling Bayse for a while so every page and poll fails
      // fast (and falls back) instead of each one waiting out the timeouts.
      if (looksLikeRateLimit(err)) tripBreaker(BREAKER_MS);
      // Timeouts/network errors mean Bayse is unreachable. A 5xx only counts when
      // the main events list fails; one event's history erroring shouldn't block the site.
      else if (looksLikeOutage(err, opts?.integration === "list-events")) tripBreaker(OUTAGE_BREAKER_MS);
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
  /** The specific market the YES price belongs to (events can hold several). Null for mock data. */
  marketId: string | null;
  marketTitle: string | null;
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
  /** True when the plan cap trimmed `rows` (free users); `total` is still the full count. */
  limited?: boolean;
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

/**
 * Bayse's page-size parameter is `size`. Any other name (perPage, limit, pageSize)
 * is silently ignored and Bayse returns EVERY open event (~3.7 MB, 10–30 s).
 */
function eventsPath(page: number, size: number) {
  return `/pm/events?currency=NGN&size=${size}&page=${page}&status=open`;
}

/**
 * Keeps only what naraNg uses. A full event carries every outcome's market
 * (~6.5 KB on average, 30+ KB for multi-candidate events); we only ever use the
 * primary market. This keeps the cached list far under Next.js's 2 MB cache limit.
 */
function slimEvent(ev: BayseEvent): BayseEvent | null {
  const pm = pickPrimaryMarket(ev);
  if (ev.status !== "open" || !pm) return null;
  return {
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    description: ev.description?.slice(0, DESCRIPTION_CHARS),
    category: ev.category,
    status: ev.status,
    resolutionDate: ev.resolutionDate,
    closingDate: ev.closingDate,
    liquidity: ev.liquidity,
    totalVolume: ev.totalVolume,
    totalOrders: ev.totalOrders,
    supportedCurrencies: ev.supportedCurrencies,
    markets: [
      {
        id: pm.id,
        title: pm.title,
        status: pm.status,
        outcome1Label: pm.outcome1Label,
        outcome1Price: pm.outcome1Price,
        outcome2Price: pm.outcome2Price,
      },
    ],
  };
}

type OpenEvents = { events: BayseEvent[]; failedPages: number };

/**
 * Every open NGN event, fetched once and shared by the landing page and the
 * markets feed. Page 1 must succeed; later pages that fail are skipped and reported.
 */
const cachedOpenEvents = unstable_cache(
  async (): Promise<OpenEvents> => {
    const call = { ...EVENTS_PAGE_CALL, integration: "list-events" as const };
    const first = await guardedBayseFetch<BayseEventsResponse>(eventsPath(1, EVENTS_PAGE_SIZE), call);
    const raw = [...(first?.events ?? [])];
    const totalCount = first?.pagination?.totalCount ?? raw.length;

    // If Bayse ever ignores `size` again, page 1 already holds everything:
    // don't download the same list several more times.
    const lastPage =
      raw.length >= totalCount ? 1 : Math.min(first?.pagination?.lastPage ?? 1, MAX_EVENT_PAGES);

    let failedPages = 0;
    if (lastPage > 1) {
      const results = await Promise.allSettled(
        Array.from({ length: lastPage - 1 }, (_, i) =>
          guardedBayseFetch<BayseEventsResponse>(eventsPath(i + 2, EVENTS_PAGE_SIZE), call),
        ),
      );
      for (const r of results) {
        if (r.status === "fulfilled") raw.push(...(r.value?.events ?? []));
        else failedPages++;
      }
    }

    // De-duplicate by id: pages can overlap if events open or close mid-fetch.
    const byId = new Map<string, BayseEvent>();
    for (const ev of raw) {
      if (!ev?.id || byId.has(ev.id)) continue;
      const slim = slimEvent(ev);
      if (slim) byId.set(ev.id, slim);
    }

    const events = [...byId.values()];
    if (!events.length) throw new Error("Bayse returned no open events");
    return { events, failedPages };
  },
  ["bayse-open-events-v3"],
  { revalidate: OPEN_EVENTS_REVALIDATE_S },
);

/** The dashboard layout and page ask at the same moment; on a cold cache they share one download. */
const getOpenEvents = () => coalesce("open-events", () => cachedOpenEvents());

/* ===================================================== 7-day notional volume */

// Throws on failure so a failed rollup isn't cached as 0 for 10 minutes.
const cachedRolling7dNotional = unstable_cache(
  async (): Promise<number> => {
    const fromDate = new Date(Date.now() - WEEK_MS).toISOString();
    const res = await guardedBayseFetch<BayseTradesResponse>(
      `/pm/trades?size=50&fromDate=${encodeURIComponent(fromDate)}`,
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
    if (!(err instanceof BreakerOpenError)) console.warn("[bayse] trades volume rollup failed:", errMsg(err));
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
    marketId: null,
    marketTitle: null,
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
    // Built from the full shared list, so "featured", the stats and "resolving
    // soon" consider every open market, not just the first page.
    const { events } = await getOpenEvents();

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
  ["bayse-landing-data-v3"],
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
    if (!(err instanceof BreakerOpenError)) console.warn("[bayse] landing data failed:", reason);
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
    if (!(err instanceof BreakerOpenError)) console.warn(`[bayse] history for ${data.eventId} failed:`, errMsg(err));
    return [];
  }
}

/* ========================================================== all markets */

const cachedAllMarkets = unstable_cache(
  async (): Promise<AllMarketsData> => {
    const { events: open, failedPages } = await getOpenEvents();

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
        marketId: pm?.id ?? null,
        marketTitle: pm?.title ?? null,
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
  ["bayse-all-markets-v4"],
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
    if (!(err instanceof BreakerOpenError)) console.warn("[bayse] getAllMarkets failed:", reason);
    if (lastGoodAllMarkets) {
      return { ...lastGoodAllMarkets, degraded: true, degradedReason: reason };
    }
    return buildMockAllMarkets(reason);
  }
});