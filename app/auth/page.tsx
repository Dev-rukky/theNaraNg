// app/auth/page.tsx
// Server Component: signed-in users are redirected before the page is even sent,
// so there's no flash of the sign-in form.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/getUser";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { getLandingData } from "@/lib/nara/bayse";
import { fmtVol } from "@/lib/nara/format";
import type { AuthStat } from "@/components/nara/AuthShell";
import { AuthForm } from "@/components/nara/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AuthPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(params.redirect);

  // In parallel: the landing data is cached, so this adds no wait in practice.
  const [user, landing] = await Promise.all([getUser(), getLandingData()]);
  if (user) redirect(redirectTo);

  // Real figures only. If Bayse is down and this is mock data, the row is hidden.
  const stats: AuthStat[] | undefined =
    landing.source === "bayse"
      ? [
          { label: "Open markets", value: String(landing.stats.markets) },
          {
            label: landing.stats.volumeWindow === "7d" ? "Volume 7d" : "Volume",
            value: fmtVol(landing.stats.volume),
          },
          { label: "Resolving soon", value: String(landing.stats.resolvingSoon) },
        ]
      : undefined;

  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <AuthForm
      initialMode={params.mode === "signup" ? "signup" : "signin"}
      redirectTo={redirectTo}
      callbackError={errorParam}
      stats={stats}
    />
  );
}