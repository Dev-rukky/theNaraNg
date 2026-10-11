// app/auth/callback/route.ts
// Where Google sign-in and email-confirmation links land. Swaps the one-time
// code in the URL for a session cookie, then sends the user on.
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get("next"));
  const supabase = await createClient();

  // OAuth (Google) and PKCE email links
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // Email links using the token_hash template
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const failed = new URL("/auth", origin);
  failed.searchParams.set("error", "That sign-in link is invalid or has expired. Please try again.");
  if (next !== "/dashboard") failed.searchParams.set("redirect", next);
  return NextResponse.redirect(failed);
}