// app/(dashboard)/sharp-money/page.tsx   →  /sharp-money  (Pro)
import type { Metadata } from "next";
import { PageHeader } from "@/components/nara/PageHeader";
import { UpgradePrompt } from "@/components/nara/UpgradePrompt";
import { SharpMoney } from "@/components/nara/sharp/SharpMoney";
import { checkAccess } from "@/lib/auth/checkAccess";
import { getAllMarkets } from "@/lib/nara/bayse";

export const metadata: Metadata = { title: "Sharp Money" };

export default async function SharpMoneyPage() {
  const { allowed, plan, requiredPlan } = await checkAccess("/sharp-money");
  // Only fetch (and send) market data to users who are allowed to see it.
  const data = allowed ? await getAllMarkets() : null;

  return (
    <>
      <PageHeader
        eyebrow="Sharp money"
        title={<>Where the smart money is moving.</>}
        description="The biggest odds moves of the last 24 hours. Anything that shifts 10 points or more is flagged."
      />
      {data ? (
        <SharpMoney initial={{ data, fetchedAt: Date.now() }} />
      ) : (
        <UpgradePrompt required={requiredPlan} current={plan} />
      )}
    </>
  );
}