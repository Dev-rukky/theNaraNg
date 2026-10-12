// lib/nara/predictions.actions.ts
// Server Actions are public endpoints: every input is validated here, the user
// comes from the session, and the price comes from the server, never the browser.
"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllMarkets } from "./bayse";
import { CALL_CUTOFF_MS, HANDLE_RE, MAX_CALL_PRICE, MIN_CALL_PRICE, type MyCall } from "./predictions.shared";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const EVENT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export async function makePrediction(input: { eventId: unknown; side: unknown }): Promise<Result<MyCall>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to make a call." };

  const { eventId, side } = input ?? {};
  if (typeof eventId !== "string" || !EVENT_ID_RE.test(eventId)) return { ok: false, error: "Unknown market." };
  if (side !== "yes" && side !== "no") return { ok: false, error: "Pick YES or NO." };

  // Live price from the server. Refuse while Bayse data is stale or mocked,
  // otherwise someone could call at an outdated price after news breaks.
  const markets = await getAllMarkets();
  if (markets.source !== "bayse" || markets.degraded) {
    return { ok: false, error: "Live prices are unavailable right now. Try again in a minute." };
  }

  const market = markets.rows.find((r) => r.id === eventId);
  if (!market || market.status === "resolved" || !market.marketId) {
    return { ok: false, error: "This market isn't open for calls." };
  }
  if (market.resolvesAt !== null && market.resolvesAt - Date.now() < CALL_CUTOFF_MS) {
    return { ok: false, error: "Calls close 5 minutes before a market resolves." };
  }
  if (market.yes < MIN_CALL_PRICE || market.yes > MAX_CALL_PRICE) {
    return { ok: false, error: "This market is too close to certain to call." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("predictions").insert({
    user_id: user.id,
    event_id: market.id,
    market_id: market.marketId,
    market_title: (market.marketTitle && market.marketTitle !== market.name
      ? `${market.name} — ${market.marketTitle}`
      : market.name
    ).slice(0, 300),
    side,
    yes_price: market.yes,
    closes_at: market.resolvesAt === null ? null : new Date(market.resolvesAt).toISOString(),
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "You've already made a call on this market." };
    console.error("makePrediction failed:", error.message);
    return { ok: false, error: "Couldn't save your call. Please try again." };
  }

  revalidatePath("/leaderboard");
  return { ok: true, data: { side, yesPrice: market.yes, marketId: market.marketId } };
}

export async function setLeaderboardProfile(input: { name: unknown; show: unknown }): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const show = input?.show === true;
  if (!HANDLE_RE.test(name)) {
    return { ok: false, error: "Handles are 3–20 letters, numbers or underscores." };
  }

  // The user's own session: row-level security only lets them edit their own profile.
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ leaderboard_name: name, show_on_leaderboard: show })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That handle is taken." };
    console.error("setLeaderboardProfile failed:", error.message);
    return { ok: false, error: "Couldn't save. Please try again." };
  }

  revalidatePath("/leaderboard");
  return { ok: true, data: undefined };
}