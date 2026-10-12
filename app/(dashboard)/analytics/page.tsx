// app/(dashboard)/analytics/page.tsx   →  /analytics  (all plans)
import type { Metadata } from "next";
import { AutoRefresh } from "@/components/nara/AutoRefresh";
import { PageHeader } from "@/components/nara/PageHeader";
import { UpgradePrompt } from "@/components/nara/UpgradePrompt";
import { AnalyticsView } from "@/components/nara/analytics/AnalyticsView";
import { checkAccess } from "@/lib/auth/checkAccess";
import { buildAnalytics } from "@/lib/nara/analytics";
import { getAllMarkets, getLandingData } from "@/lib/nara/bayse";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const { allowed, plan, requiredPlan } = await checkAccess("/analytics");

  const header = (
    <PageHeader
      eyebrow="Analytics"
      title={<>Where the signal is loudest.</>}
      description="Roll-ups across every open NGN-denominated event naraNg tracks: volume, momentum, and how confident the crowd is. Refreshed every minute."
    />
  );

  if (!allowed) {
    return (
      <>
        {header}
        <UpgradePrompt required={requiredPlan} current={plan} />
      </>
    );
  }

  const [all, landing] = await Promise.all([getAllMarkets(), getLandingData()]);

  return (
    <>
      {header}
      <AnalyticsView summary={buildAnalytics(all, landing)} />
      <AutoRefresh intervalMs={60_000} />
    </>
  );
}