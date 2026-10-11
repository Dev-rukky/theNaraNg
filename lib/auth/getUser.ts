// lib/auth/getUser.ts
import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user, or null. Cached so it runs once per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});