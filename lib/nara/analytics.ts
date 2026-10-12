// lib/nara/analytics.ts
// Builds the Analytics page summary on the server from the full market list.
// Only this small summary is sent to the browser, not the market list itself.
import "server-only";

import type { AllMarketsData, HistoryPoint, LandingData } from "./bayse";

export type RankRow = { id: string; name: string; yes: number; delta: number | null; volume: number };
export type Bucket = { range: string; count: number; tone: "red" | "green" | "amber" };

export type AnalyticsSummary = {
  asOf: string;
  degraded: boolean;
  stats: {
    volume: number;
    volumeWindow: "7d" | "all-time";
    openMarkets: number;
    resolvingThisWeek: number;
    sharpest: number | null; // signed, percentage points
  };
  featured: { title: string; history: HistoryPoint[] };
  distribution: Bucket[];
  topMovers: RankRow[];
  volumeLeaders: RankRow[];
  trackedMovers: number;
};

const BUCKETS = [
  { range: "0–20%", min: 0, max: 20, tone: "red" },
  { range: "20–40%", min: 20, max: 40, tone: "red" },
  { range: "40–60%", min: 40, max: 60, tone: "green" },
  { range: "60–80%", min: 60, max: 80, tone: "amber" },
  { range: "80–100%", min: 80, max: Infinity, tone: "amber" },
] as const;

const toRow = (r: AllMarketsData["rows"][number]): RankRow => ({
  id: r.id,
  name: r.name,
  yes: r.yes,
  delta: r.delta,
  volume: r.volume,
});

export function buildAnalytics(all: AllMarketsData, landing: LandingData): AnalyticsSummary {
  const open = all.rows.filter((r) => r.status !== "resolved");

  const distribution: Bucket[] = BUCKETS.map((b) => ({
    range: b.range,
    tone: b.tone,
    count: open.filter((m) => m.yes >= b.min && m.yes < b.max).length,
  }));

  const withMove = open.filter((m) => m.delta != null);
  const topMovers = [...withMove].sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!)).slice(0, 6);
  const volumeLeaders = [...open].sort((a, b) => b.volume - a.volume).slice(0, 6);

  return {
    asOf: all.asOf,
    degraded: all.degraded || landing.degraded,
    stats: {
      volume: landing.stats.volume,
      volumeWindow: landing.stats.volumeWindow,
      openMarkets: open.length,
      resolvingThisWeek: landing.stats.resolvingSoon,
      sharpest: topMovers[0]?.delta ?? null,
    },
    featured: { title: landing.featured.title, history: landing.history },
    distribution,
    topMovers: topMovers.map(toRow),
    volumeLeaders: volumeLeaders.map(toRow),
    trackedMovers: withMove.length,
  };
}