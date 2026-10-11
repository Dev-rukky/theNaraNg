// middleware.ts  (project root, next to /app)
// On Next.js 16+, name this file proxy.ts and rename the function to `proxy`.
//
// Refreshes the Supabase session cookie on each request. Server Components can't
// write cookies, so without this a session can silently expire and signed-in
// users get bounced to /auth.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // Don't put code between createServerClient and getUser: getUser is what refreshes the token.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except: the landing page "/", static files, images, and the
    // public polling endpoints (no point checking auth every 15–60s on those).
    "/((?!_next/static|_next/image|favicon.ico|api/markets|api/landing|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).+)",
  ],
};