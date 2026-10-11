// lib/auth/plan.ts
// Pure, server-safe plan helpers. No "use client" here, so Server Components,
// route handlers and middleware can import these too.

export const PLANS = ["free", "pro", "api"] as const;
export type Plan = (typeof PLANS)[number];

// Plan hierarchy: api > pro > free
const ORDER: Record<Plan, number> = { free: 0, pro: 1, api: 2 };

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

/** Anything unknown or missing is treated as "free" (least privilege). */
export function toPlan(value: unknown): Plan {
  return isPlan(value) ? value : "free";
}

export function planAllows(current: Plan | null | undefined, required: Plan): boolean {
  if (!current || !isPlan(current)) return required === "free";
  return ORDER[current] >= ORDER[required];
}