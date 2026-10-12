// lib/nara/scorePredictions.ts
// Scores calls on markets that have resolved. Run on a schedule (see the cron route).
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { bayseFetch } from "./bayse-client";
import type { Outcome } from "./predictions.shared";

type BayseMarketLite = {
  id?: string;
  status?: string;
  outcome1Label?: string;
  outcome1Price?: number | string;
  outcome2Price?: number | string;
};
type BayseEventLite = { id?: string; status?: string; markets?: BayseMarketLite[] };

const VOID_RE = /cancel|void|refund/i;

/**
 * Reads the outcome of one market from Bayse.
 * VERIFY against a real resolved event (see bayse-resolved-probe.mjs): this assumes
 * a resolved market's winning side settles at price 1 and the losing side at 0,
 * which is how prediction markets settle. It returns null (try again later)
 * whenever the result isn't unambiguous, so a wrong guess can't score anyone.
 */
export function readOutcome(ev: BayseEventLite, marketId: string): Outcome | null {
  const eventStatus = String(ev.status ?? "").toLowerCase();
  if (VOID_RE.test(eventStatus)) return "void";

  const market = ev.markets?.find((m) => m.id === marketId);
  if (!market) return null;

  const marketStatus = String(market.status ?? "").toLowerCase();
  if (VOID_RE.test(marketStatus)) return "void";
  if (eventStatus === "open" && (marketStatus === "open" || marketStatus === "")) return null;

  const noFirst = /^no$/i.test(market.outcome1Label?.trim() ?? "");
  const yesPrice = Number(noFirst ? market.outcome2Price : market.outcome1Price);
  if (!Number.isFinite(yesPrice)) return null;
  if (yesPrice >= 0.99) return "yes";
  if (yesPrice <= 0.01) return "no";
  return null;
}

export type ScoreReport = { checked: number; scored: number; callsScored: number; pending: number; errors: string[] };

export async function scorePendingPredictions({ maxMarkets = 40 } = {}): Promise<ScoreReport> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Unscored calls whose market should have closed (or has no known close time).
  const { data, error } = await admin
    .from("predictions")
    .select("event_id, market_id")
    .is("outcome", null)
    .or(`closes_at.is.null,closes_at.lte.${now}`)
    .limit(2000);
  if (error) throw new Error(`Couldn't load pending calls: ${error.message}`);

  const pending = new Map<string, { eventId: string; marketId: string }>();
  for (const r of data ?? []) {
    pending.set(`${r.event_id}:${r.market_id}`, { eventId: r.event_id as string, marketId: r.market_id as string });
  }

  const report: ScoreReport = { checked: 0, scored: 0, callsScored: 0, pending: 0, errors: [] };
  const eventCache = new Map<string, BayseEventLite | null>();

  for (const { eventId, marketId } of [...pending.values()].slice(0, maxMarkets)) {
    report.checked++;
    try {
      let ev = eventCache.get(eventId);
      if (ev === undefined) {
        ev = await bayseFetch<BayseEventLite>(`/pm/events/${encodeURIComponent(eventId)}`, {
          attempts: 2,
          timeoutMs: 10_000,
          integration: "diagnostics",
        });
        eventCache.set(eventId, ev);
      }
      const outcome = ev ? readOutcome(ev, marketId) : null;
      if (!outcome) {
        report.pending++;
        continue;
      }
      const { data: n, error: rpcError } = await admin.rpc("score_market", {
        _event_id: eventId,
        _market_id: marketId,
        _outcome: outcome,
      });
      if (rpcError) throw new Error(rpcError.message);
      report.scored++;
      report.callsScored += Number(n) || 0;
    } catch (err) {
      report.errors.push(`${eventId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return report;
}