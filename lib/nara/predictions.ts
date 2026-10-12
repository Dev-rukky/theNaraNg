// lib/nara/predictions.ts
// Server-only reads for the signed-in user. Uses the user's own Supabase session,
// so row-level security limits every query to their own calls.
import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/getUser";
import type {
  LeaderboardEntry,
  LeaderboardProfile,
  MyOpenCalls,
  MyStats,
  Outcome,
  RecentCall,
  Side,
} from "./predictions.shared";

const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
};

export const getMyOpenCalls = cache(async (): Promise<MyOpenCalls> => {
  if (!(await getUser())) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("event_id, market_id, side, yes_price")
    .is("outcome", null);
  if (error) {
    console.warn("getMyOpenCalls failed:", error.message);
    return {};
  }
  const calls: MyOpenCalls = {};
  for (const r of data ?? []) {
    calls[r.event_id as string] = { side: r.side as Side, yesPrice: num(r.yes_price), marketId: r.market_id as string };
  }
  return calls;
});

export async function getMyRecentCalls(limit = 20): Promise<RecentCall[]> {
  if (!(await getUser())) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("id, event_id, market_title, side, yes_price, created_at, outcome, edge")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("getMyRecentCalls failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    eventId: r.event_id as string,
    marketTitle: r.market_title as string,
    side: r.side as Side,
    yesPrice: num(r.yes_price),
    createdAt: r.created_at as string,
    outcome: (r.outcome as Outcome | null) ?? null,
    edgePoints: r.edge == null ? null : Math.round(num(r.edge) * 1000) / 10,
  }));
}

export async function getMyStats(): Promise<MyStats | null> {
  if (!(await getUser())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_prediction_stats");
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    if (error) console.warn("getMyStats failed:", error.message);
    return null;
  }
  return {
    totalCalls: num(row.total_calls),
    openCalls: num(row.open_calls),
    resolvedCalls: num(row.resolved_calls),
    correct: num(row.correct),
    edgePoints: num(row.edge_points),
    rank: row.rank == null ? null : num(row.rank),
    minCalls: num(row.min_calls, 5),
  };
}

/** The database caps this at 10 rows for free plans, so the paywall can't be bypassed from the browser. */
export async function getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_leaderboard", { _limit: limit });
  if (error) {
    console.warn("getLeaderboard failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    rank: num(r.rank),
    name: String(r.name ?? ""),
    calls: num(r.calls),
    correct: num(r.correct),
    accuracy: num(r.accuracy),
    edgePoints: num(r.edge_points),
  }));
}

export async function getMyLeaderboardProfile(): Promise<LeaderboardProfile> {
  const user = await getUser();
  if (!user) return { name: null, show: false };
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("leaderboard_name, show_on_leaderboard")
    .eq("id", user.id)
    .maybeSingle();
  return { name: (data?.leaderboard_name as string | null) ?? null, show: !!data?.show_on_leaderboard };
}