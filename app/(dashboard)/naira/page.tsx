// app/(dashboard)/naira/page.tsx   →  /naira  (Pro)
import type { Metadata } from "next";
import { PageHeader } from "@/components/nara/PageHeader";
import { UpgradePrompt } from "@/components/nara/UpgradePrompt";
import { NairaTracker } from "@/components/nara/naira/NairaTracker";
import { checkAccess } from "@/lib/auth/checkAccess";
import { getAllMarkets } from "@/lib/nara/bayse";

export const metadata: Metadata = { title: "Naira Tracker" };

export default async function NairaPage() {
  const { allowed, plan, requiredPlan } = await checkAccess("/naira");
  // Only fetch (and send) market data to users who are allowed to see it.
  const data = allowed ? await getAllMarkets() : null;

  return (
    <>
      <PageHeader
        eyebrow="Naira tracker"
        title={
          <>
            ₦/USD — what the crowd believes.{" "}
            <span className="text-nara-muted">Not what CBN posts.</span>
          </>
        }
        description="Live crowd odds on every open Naira and CBN market on Bayse. See where traders think the rate and policy are heading."
      />
      {data ? (
        <NairaTracker initial={{ data, fetchedAt: Date.now() }} />
      ) : (
        <UpgradePrompt required={requiredPlan} current={plan} />
      )}
    </>
  );
}