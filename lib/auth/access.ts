// lib/auth/access.ts
// ONE place that decides who can open which dashboard page.
// The sidebar (locks) and every page (server check) both read from here,
// so changing a page's access is a one-line edit.
import { planAllows, type Plan } from "./plan";

export type Access = Plan | "admin";

/** Free users see this many markets in the feed (top by volume). */
export const FREE_MARKETS_CAP = 10;

export const ROUTE_ACCESS = {
  "/dashboard": "free", // Markets (free users: top FREE_MARKETS_CAP only)
  "/naira": "pro",
  "/sharp-money": "pro",
  "/analytics": "free",
  "/leaderboard": "free",
  "/signal-archive": "free",
  "/alerts": "pro",
  "/api-access": "api",
  "/settings": "free",
  "/diagnostics": "admin",
  "/admin": "admin",
} as const satisfies Record<string, Access>;

export type DashboardRoute = keyof typeof ROUTE_ACCESS;

/** Admins can open everything (handy for testing every plan's pages). */
export function canAccess(access: Access, plan: Plan, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (access === "admin") return false;
  return planAllows(plan, access);
}

/** Whether this user's market feed is capped. */
export function marketsCapFor(plan: Plan, isAdmin: boolean): number | null {
  return isAdmin || planAllows(plan, "pro") ? null : FREE_MARKETS_CAP;
}