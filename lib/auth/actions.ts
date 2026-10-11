// lib/auth/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlan, type Plan } from "./plan";

export type ChangePlanResult = { ok: true } | { ok: false; error: string };

/**
 * Plan changes are server-authorized by the `change_plan` RPC: users may only
 * downgrade to "free"; paid upgrades require verified payment (handled separately).
 * Targets the current user unless `targetUserId` is given; the RPC must still check auth.uid().
 */
export async function changePlan(plan: Plan, targetUserId?: string): Promise<ChangePlanResult> {
  if (!isPlan(plan)) return { ok: false, error: "Invalid plan." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.rpc("change_plan", {
    _target_user: targetUserId ?? user.id,
    _plan: plan,
  });
  if (error) return { ok: false, error: error.message };

  // Re-renders the layout so <PlanProvider> receives the new plan.
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Signs out on the server (clears the auth cookies) and sends the user to /auth. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth");
}