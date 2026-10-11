// lib/auth/isAdmin.ts
// Server-side admin check. This is the one that actually protects things;
// useIsAdmin() in the browser only decides what to show.
import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "./getUser";

/** True if the signed-in user has the `admin` role. Cached per request. */
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.error("getIsAdmin failed:", error.message);
    return false;
  }
  return !!data;
});