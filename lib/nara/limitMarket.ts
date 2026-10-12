// lib/nara/limitMarkets.ts
// Applies the free-plan cap on the SERVER, so free users never receive the full list
// (the page and /api/markets both go through this).
import "server-only";

import type { AllMarketsData } from "./bayse";

/** Keeps the top `cap` markets by volume. `total` still reports how many exist. */
export function limitMarkets(data: AllMarketsData, cap: number | null): AllMarketsData {
  if (cap === null || data.rows.length <= cap) return data;
  const rows = [...data.rows].sort((a, b) => b.volume - a.volume).slice(0, cap);
  return { ...data, rows, limited: true };
}