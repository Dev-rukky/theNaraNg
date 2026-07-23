import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types'; 

function createSupabaseClient() {
  // In Next.js, browser-safe environment variables MUST start with NEXT_PUBLIC_
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
      ...(!SUPABASE_ANON_KEY ? ['NEXT_PUBLIC_SUPABASE_ANON_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Check your .env.local file.`;
    console.error(`[Supabase] ${message}`);
  }

  // createBrowserClient automatically caches the instance in the browser,
  // completely eliminating the need for the Proxy pattern Lovable used.
  return createBrowserClient<Database>(
    SUPABASE_URL!, 
    SUPABASE_ANON_KEY!
  );
}

// Export the supabase client exactly as it was so your other files don't break:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createSupabaseClient();