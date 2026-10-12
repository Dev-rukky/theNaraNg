// lib/auth/checkAccess.ts
// Server-side page guard. Call it at the top of every dashboard page.
import "server-only";

import { notFound } from "next/navigation";
import { canAccess, ROUTE_ACCESS, type DashboardRoute } from "./access";
import { getIsAdmin } from "./isAdmin";
import { getPlan } from "./getPlan";
import type { Plan } from "./plan";

export type AccessResult = {
  plan: Plan;
  isAdmin: boolean;
  allowed: boolean;
  /** The plan to upgrade to when not allowed (never "admin": admin pages 404 instead). */
  requiredPlan: Plan;
};

/**
 * - Admin-only page, not an admin → 404 (doesn't reveal the page exists).
 * - Paid page, plan too low → `allowed: false`; the page renders <UpgradePrompt>
 *   and must NOT fetch or send the paid data.
 */
export async function checkAccess(route: DashboardRoute): Promise<AccessResult> {
  const access = ROUTE_ACCESS[route];
  const [plan, isAdmin] = await Promise.all([getPlan(), getIsAdmin()]);

  if (access === "admin" && !isAdmin) notFound();

  return {
    plan,
    isAdmin,
    allowed: canAccess(access, plan, isAdmin),
    requiredPlan: access === "admin" ? "api" : access,
  };
}