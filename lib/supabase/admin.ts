// lib/supabase/admin.ts
// Service-role client: bypasses row-level security. Server-only, and used ONLY
// for things users must not do themselves (recording a call at the server's
// price, scoring resolved markets). Never import this from a client component.
import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (never prefix it with NEXT_PUBLIC_).");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}