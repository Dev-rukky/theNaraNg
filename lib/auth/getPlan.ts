// lib/auth/getPlan.ts
import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "./getUser";
import { toPlan, type Plan } from "./plan";

/**
 * Reads the signed-in user's plan on the server.
 * Wrapped in React `cache` so multiple calls in one request hit Supabase once.
 * Signed-out users, missing profiles and unknown values all resolve to "free".
 */
export const getPlan = cache(async (): Promise<Plan> => {
  const user = await getUser();
  if (!user) return "free";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getPlan failed:", error.message);
    return "free";
  }
  return toPlan(data?.plan);
});