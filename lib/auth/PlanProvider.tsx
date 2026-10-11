// lib/auth/PlanProvider.tsx
"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { changePlan } from "./actions";
import type { Plan } from "./plan";

const PlanContext = createContext<Plan | null>(null);

/** Receives the plan already resolved on the server, so there is no loading state. */
export function PlanProvider({ plan, children }: { plan: Plan; children: ReactNode }) {
  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const plan = useContext(PlanContext);
  if (plan === null) {
    throw new Error("usePlan must be used inside <PlanProvider>.");
  }
  return { plan };
}

/** Changes the plan via a server action; the layout re-renders with the new plan. */
export function useSetPlan() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setPlan(plan: Plan, targetUserId?: string) {
    setError(null);
    startTransition(async () => {
      const result = await changePlan(plan, targetUserId);
      if (!result.ok) setError(result.error);
    });
  }

  return { setPlan, isPending, error };
}