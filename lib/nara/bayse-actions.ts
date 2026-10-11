// lib/nara/bayse.actions.ts
// The only Bayse function the browser may call directly (e.g. from OddsHistoryChart).
// Everything else stays server-only in ./bayse.
"use server";

import {
  getEventHistory as getEventHistoryServer,
  type HistoryPoint,
  type HistoryRange,
} from "./bayse";

export async function getEventHistory(input: {
  eventId: string;
  range?: HistoryRange;
}): Promise<HistoryPoint[]> {
  // Server Actions are public endpoints, so check the input shape here.
  if (!input || typeof input.eventId !== "string") return [];
  return getEventHistoryServer({
    eventId: input.eventId,
    range: input.range === "1M" ? "1M" : "1W",
  });
}