// lib/nara/predictions.shared.ts
// Types and rules shared by the server and the browser.

export type Side = "yes" | "no";
export type Outcome = "yes" | "no" | "void";

/** Calls close this long before a market's resolution time. */
export const CALL_CUTOFF_MS = 5 * 60 * 1000;

/** No calls on near-certain markets: there's no edge left to score. */
export const MIN_CALL_PRICE = 1;
export const MAX_CALL_PRICE = 99;

export type MyCall = { side: Side; yesPrice: number; marketId: string };
/** The user's unresolved calls, keyed by event id. */
export type MyOpenCalls = Record<string, MyCall>;

export type RecentCall = {
  id: string;
  eventId: string;
  marketTitle: string;
  side: Side;
  yesPrice: number;
  createdAt: string;
  outcome: Outcome | null;
  edgePoints: number | null; // ×100, null while open
};

export type MyStats = {
  totalCalls: number;
  openCalls: number;
  resolvedCalls: number;
  correct: number;
  edgePoints: number;
  rank: number | null;
  minCalls: number;
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  calls: number;
  correct: number;
  accuracy: number;
  edgePoints: number;
};

export type LeaderboardProfile = { name: string | null; show: boolean };

export const HANDLE_RE = /^[A-Za-z0-9_]{3,20}$/;

/** Points a call earns: YES at 30% → +70 if YES, −30 if NO. */
export function potentialPoints(side: Side, yesPrice: number) {
  return side === "yes"
    ? { win: 100 - yesPrice, lose: -yesPrice }
    : { win: yesPrice, lose: -(100 - yesPrice) };
}