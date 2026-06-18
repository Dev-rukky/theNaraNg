import { createServerFn } from "@tanstack/react-start";
import { MARKETS, STATS, TICKER, USDNGN_HISTORY } from "./mock";
import { bayseFetch } from "./bayse-client";


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

// Bayse's totalVolume on events is always 0, so we derive the rolling 7d
// notional by sampling the trades feed (1.4M+ rows) and extrapolating from
// pagination.totalCount. Cached per isolate for 5 min — best-effort.
let volumeCache: { value: number; at: number } | null = null;
const VOLUME_TTL_MS = 5 * 60 * 1000;

async function fetchRolling7dNotional(): Promise<number> {
  if (volumeCache && Date.now() - volumeCache.at < VOLUME_TTL_MS) {
    return volumeCache.value;
  }
  const fromDate = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  try {
    const res = await bayseFetch<BayseTradesResponse>(
      `/pm/trades?perPage=50&fromDate=${encodeURIComponent(fromDate)}`,
      { attempts: 2, baseMs: 200, timeoutMs: 5000, integration: "list-events" },
    );
    const sample = res.data ?? [];
    if (!sample.length || !res.pagination?.totalCount) return volumeCache?.value ?? 0;
    const avg =
      sample.reduce((s, t) => s + (t.size || 0) * (t.takerPrice || 0), 0) /
      sample.length;
    const value = Math.max(0, Math.round(avg * res.pagination.totalCount));
    volumeCache = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.error("[bayse] trades volume rollup failed:", err);
    return volumeCache?.value ?? 0;
  }
}

export type LandingMarket = {
  id: string;
  slug: string;
  name: string;
  yes: number; // 0-100
  delta: number; // %, 24h
  volume: number;
  resolves: string;
};

export type HistoryPoint = { t: string; crowd: number };

export type LandingData = {
  markets: LandingMarket[];
  ticker: { name: string; yes: number; delta: number }[];
  history: HistoryPoint[];
  featured: {
    id: string;
    slug: string;
    title: string;
    yes: number;
    delta: number;
  };
  stats: {
    volume: number;
    markets: number;
    sharpest: number;
    resolvingSoon: number;
    accuracy: number;
  };
  asOf: string;
  source: "bayse" | "mock";
  degraded: boolean;
  degradedReason?: string;
};

// ---- mock fallback (used when Bayse relay is down) ----
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
  const ticker = TICKER.map((t) => ({ name: t.name, yes: t.yes, delta: t.delta }));
  const history: HistoryPoint[] = USDNGN_HISTORY.map((p) => ({
    t: p.t,
    crowd: p.crowd,
  }));
  const featured = MARKETS[0];
  return {
    markets,
    ticker,
    history,
    featured: {
      id: featured.id,
      slug: featured.id,
      title: featured.name,
      yes: featured.yes,
      delta: featured.delta,
    },
    stats: { ...STATS },
    asOf: new Date().toISOString(),
    source: "mock",
    degraded: true,
    degradedReason: reason,
  };
}




function fmtResolve(iso?: string): string {
  if (!iso) return "TBA";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBA";
  return d.toLocaleString("en-NG", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Lagos",
  }) + " WAT";
}

function pickPrimaryMarket(ev: BayseEvent): BayseMarket | undefined {
  return ev.markets?.find((m) => m.status === "open") ?? ev.markets?.[0];
}

function scoreFeatured(ev: BayseEvent): number {
  const t = `${ev.title} ${ev.category ?? ""} ${ev.description ?? ""}`.toLowerCase();
  let s = 0;
  if (/naira|ngn|usd\/?ngn|cbn|inflation|mpr|petrol|dangote|nigeria/.test(t)) s += 50;
  if (ev.supportedCurrencies?.includes("NGN")) s += 10;
  if ((ev.totalVolume ?? 0) > 0) s += Math.log10((ev.totalVolume ?? 0) + 1);
  return s;
}

async function fetchPriceHistory(
  eventId: string,
  timePeriod: "12H" | "24H" | "1W" | "1M" = "24H",
): Promise<BaysePriceHistory | null> {
  try {
    return await bayseFetch<BaysePriceHistory>(
      `/pm/events/${eventId}/price-history?timePeriod=${timePeriod}&outcome=YES`,
      { attempts: 2, baseMs: 200, timeoutMs: 4000, integration: "price-history" },
    );
  } catch {
    return null;
  }
}

function computeDelta(history: BaysePriceHistory | null, marketId?: string): number {
  if (!history || !history.markets?.length) return 0;
  const m = marketId
    ? history.markets.find((x) => x.marketId === marketId) ?? history.markets[0]
    : history.markets[0];
  const pts = m?.priceHistory ?? [];
  if (pts.length < 2) return 0;
  const first = pts[0].p;
  const last = pts[pts.length - 1].p;
  if (!first) return 0;
  return ((last - first) / first) * 100;
}

function historyToSeries(
  history: BaysePriceHistory | null,
  marketId?: string,
): HistoryPoint[] {
  if (!history || !history.markets?.length) return [];
  const m = marketId
    ? history.markets.find((x) => x.marketId === marketId) ?? history.markets[0]
    : history.markets[0];
  const pts = m?.priceHistory ?? [];
  if (!pts.length) return [];
  // downsample to ~24 points
  const step = Math.max(1, Math.floor(pts.length / 24));
  const out: HistoryPoint[] = [];
  for (let i = 0; i < pts.length; i += step) {
    const p = pts[i];
    const d = new Date(p.e);
    const label = d.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Africa/Lagos",
    });
    out.push({ t: label, crowd: Number((p.p * 100).toFixed(2)) });
  }
  // ensure last point included
  const last = pts[pts.length - 1];
  if (out[out.length - 1]?.crowd !== Number((last.p * 100).toFixed(2))) {
    const d = new Date(last.e);
    out.push({
      t: d.toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Africa/Lagos",
      }),
      crowd: Number((last.p * 100).toFixed(2)),
    });
  }
  return out;
}

export const getLandingData = createServerFn({ method: "GET" }).handler(
  async (): Promise<LandingData> => {
    const path = `/pm/events?currency=NGN&perPage=30&page=1&status=open`;
    let payload: BayseEventsResponse;
    try {
      payload = await bayseFetch<BayseEventsResponse>(path, { integration: "list-events" });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown error";
      console.error("[bayse] list-events failed after retries:", reason);
      return buildMockLanding(reason);
    }

    if (!payload?.events?.length) {
      return buildMockLanding("Bayse returned no open events");
    }

    const events = (payload.events ?? []).filter(
      (e) => e.status === "open" && e.markets?.length,
    );

    // featured = highest scoring event
    const ranked = [...events].sort((a, b) => scoreFeatured(b) - scoreFeatured(a));
    const featuredEv = ranked[0];
    const featuredMarket = featuredEv ? pickPrimaryMarket(featuredEv) : undefined;

    // pick top markets by volume for the landing
    const topEvents = [...events]
      .sort((a, b) => (b.totalVolume ?? 0) - (a.totalVolume ?? 0))
      .slice(0, 8);

    // fetch 24h price history in parallel for delta computation
    const ids = new Set<string>();
    topEvents.forEach((e) => ids.add(e.id));
    if (featuredEv) ids.add(featuredEv.id);

    const histArr = await Promise.all(
      Array.from(ids).map(async (id) => {
        const h = await fetchPriceHistory(
          id,
          id === featuredEv?.id ? "1W" : "24H",
        );
        return [id, h] as const;
      }),
    );
    const histMap = new Map(histArr);

    const markets: LandingMarket[] = topEvents.map((ev) => {
      const pm = pickPrimaryMarket(ev);
      const yes = pm ? pm.outcome1Price * 100 : 0;
      const delta = computeDelta(histMap.get(ev.id) ?? null, pm?.id);
      return {
        id: ev.id,
        slug: ev.slug,
        name: ev.title,
        yes: Number(yes.toFixed(1)),
        delta: Number(delta.toFixed(1)),
        volume: Math.round(ev.totalVolume ?? 0),
        resolves: fmtResolve(ev.closingDate ?? ev.resolutionDate),
      };
    });

    const ticker = markets.map((m) => ({ name: m.name, yes: m.yes, delta: m.delta }));

    const featuredHistory = featuredEv ? histMap.get(featuredEv.id) ?? null : null;
    const history = historyToSeries(featuredHistory, featuredMarket?.id);
    const featuredYes = featuredMarket ? featuredMarket.outcome1Price * 100 : 0;
    const featuredDelta = computeDelta(featuredHistory, featuredMarket?.id);

    const [totalVolume, sevenDayVolume] = [
      events.reduce((s, e) => s + (e.totalVolume ?? 0), 0),
      await fetchRolling7dNotional(),
    ];
    const volume = sevenDayVolume > 0 ? sevenDayVolume : Math.round(totalVolume);
    const now = Date.now();
    const weekMs = 7 * 24 * 3600 * 1000;
    const resolvingSoon = events.filter((e) => {
      const c = e.closingDate ? new Date(e.closingDate).getTime() : 0;
      return c && c - now > 0 && c - now < weekMs;
    }).length;
    const sharpest = markets.reduce((mx, m) => Math.max(mx, Math.abs(m.delta)), 0);

    return {
      markets,
      ticker: ticker.length ? ticker : [],
      history,
      featured: {
        id: featuredEv?.id ?? "",
        slug: featuredEv?.slug ?? "",
        title: featuredEv?.title ?? "—",
        yes: Number(featuredYes.toFixed(1)),
        delta: Number(featuredDelta.toFixed(1)),
      },
      stats: {
        volume,
        markets: events.length,
        sharpest: Number(sharpest.toFixed(1)),
        resolvingSoon,
        accuracy: 73.4,
      },
      asOf: new Date().toISOString(),
      source: "bayse",
      degraded: false,
    };
  },
);

export type HistoryRange = "1W" | "1M";

export const getEventHistory = createServerFn({ method: "GET" })
  .inputValidator((d: { eventId: string; range?: HistoryRange }) => d)
  .handler(async ({ data }): Promise<HistoryPoint[]> => {
    const range: HistoryRange = data.range ?? "1W";
    const h = await fetchPriceHistory(data.eventId, range);
    return historyToSeries(h);
  });

// ===================== All-markets feed =====================
export type MarketStatus = "active" | "resolving_soon" | "resolved";
export type MarketCategory =
  | "naira"
  | "cbn"
  | "sports"
  | "politics"
  | "crypto"
  | "world";

export type AllMarketsRow = {
  id: string;
  slug: string;
  name: string;
  category: MarketCategory | "other";
  yes: number;
  delta: number;
  volume: number;
  resolves: string;
  resolvesAt: number;
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

function categorize(ev: BayseEvent): MarketCategory | "other" {
  const hay = `${ev.title} ${ev.category ?? ""} ${ev.description ?? ""}`.toLowerCase();
  if (/\bcbn\b|central bank|mpr|interest rate|monetary policy/.test(hay)) return "cbn";
  if (/naira|ngn|usd\/?ngn|inflation|petrol|dangote|nigeria/.test(hay)) return "naira";
  if (/bitcoin|btc|ethereum|eth|crypto|solana|\bsol\b|altcoin/.test(hay)) return "crypto";
  if (/politic|president|election|tinubu|atiku|peter obi|senate|assembly/.test(hay))
    return "politics";
  if (/football|soccer|nba|nfl|epl|premier league|champions|cup|match|cricket|tennis/.test(hay))
    return "sports";
  if (/world|global|china|russia|ukraine|opec|war|summit/.test(hay)) return "world";
  return "other";
}

function statusOf(ev: BayseEvent, closeMs: number, now: number): MarketStatus {
  if (ev.status !== "open") return "resolved";
  if (closeMs && closeMs - now > 0 && closeMs - now < 48 * 3600 * 1000) return "resolving_soon";
  return "active";
}

export const getAllMarkets = createServerFn({ method: "GET" }).handler(
  async (): Promise<AllMarketsData> => {
    const PER_PAGE = 100;
    const MAX_PAGES = 6;
    const events: BayseEvent[] = [];
    let degraded = false;
    let reason: string | undefined;
    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const path = `/pm/events?currency=NGN&perPage=${PER_PAGE}&page=${page}&status=open`;
        const payload = await bayseFetch<BayseEventsResponse>(path, {
          integration: "list-events",
          attempts: 2,
          timeoutMs: 6000,
        });
        const batch = payload?.events ?? [];
        events.push(...batch);
        const last = payload?.pagination?.lastPage ?? page;
        if (page >= last || batch.length < PER_PAGE) break;
      }
    } catch (err) {
      degraded = true;
      reason = err instanceof Error ? err.message : "unknown error";
      console.error("[bayse] getAllMarkets failed:", reason);
    }

    if (!events.length) {
      const mock = buildMockLanding(reason ?? "Bayse returned no markets");
      const rows: AllMarketsRow[] = mock.markets.map((m) => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        category: "other" as const,
        yes: m.yes,
        delta: m.delta,
        volume: m.volume,
        resolves: m.resolves,
        resolvesAt: 0,
        status: "active" as const,
      }));
      return {
        rows,
        total: rows.length,
        asOf: new Date().toISOString(),
        source: "mock",
        degraded: true,
        degradedReason: reason ?? "mock fallback",
      };
    }

    const now = Date.now();
    const open = events.filter((e) => e.markets?.length);

    const topForDelta = [...open]
      .sort((a, b) => (b.totalVolume ?? 0) - (a.totalVolume ?? 0))
      .slice(0, 30);
    const histArr = await Promise.all(
      topForDelta.map(async (e) => [e.id, await fetchPriceHistory(e.id, "24H")] as const),
    );
    const histMap = new Map(histArr);

    const rows: AllMarketsRow[] = open.map((ev) => {
      const pm = pickPrimaryMarket(ev);
      const yes = pm ? pm.outcome1Price * 100 : 0;
      const closeIso = ev.closingDate ?? ev.resolutionDate;
      const closeMs = closeIso ? new Date(closeIso).getTime() : 0;
      const delta = computeDelta(histMap.get(ev.id) ?? null, pm?.id);
      // Bayse's totalVolume is always 0 on the events endpoint; fall back to
      // liquidity (notional pool) which IS populated, otherwise approximate
      // from order count * average ticket size.
      const liq = Math.round(ev.liquidity ?? 0);
      const orderProxy = (ev.totalOrders ?? 0) * 500;
      const volume = Math.max(Math.round(ev.totalVolume ?? 0), liq, orderProxy);
      return {
        id: ev.id,
        slug: ev.slug,
        name: ev.title,
        category: categorize(ev),
        yes: Number(yes.toFixed(1)),
        delta: Number(delta.toFixed(1)),
        volume,
        resolves: fmtResolve(closeIso),
        resolvesAt: closeMs,
        status: statusOf(ev, closeMs, now),
      };
    });

    return {
      rows,
      total: rows.length,
      asOf: new Date().toISOString(),
      source: "bayse",
      degraded,
      degradedReason: reason,
    };
  },
);

