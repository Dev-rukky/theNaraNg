// components/nara/PlanGate.tsx
"use client";

import type { ReactNode } from "react";
import { usePlan } from "@/lib/auth/PlanProvider";
import { planAllows, type Plan } from "@/lib/auth/plan";
import { UpgradePrompt } from "./UpgradePrompt";

/**
 * Shows `children` only on the required plan or higher; otherwise the upgrade prompt.
 *
 * This only controls what is DISPLAYED. Anything passed as children has already
 * been sent to the browser. For Pro data, check the plan on the server first
 * (getPlan + planAllows in the page) and render <UpgradePrompt> there instead,
 * as the Naira page does.
 */
export function PlanGate({ required, children }: { required: Plan; children: ReactNode }) {
  const { plan } = usePlan(); // resolved on the server by the layout, so there's no loading state
  return planAllows(plan, required) ? <>{children}</> : <UpgradePrompt required={required} current={plan} />;
}