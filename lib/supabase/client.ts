// lib/supabase/client.ts
// Browser Supabase client. Stores the session in cookies (not localStorage),
// so the server (layouts, getUser, getPlan) sees the same signed-in user.
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local.",
  );
}

/** Shared browser client (createBrowserClient reuses one instance in the browser). */
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);