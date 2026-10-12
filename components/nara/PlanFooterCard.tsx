"use client";

import Link from "next/link";
import { usePlan, type Plan } from "@/lib/auth/usePlan";
import { FREE_MARKETS_CAP } from "@/lib/auth/access";
const TOTAL_MARKETS_LABEL = "377+";

type PlanConfig = {
  label: string;
  tag: string | null;
  blurb: string | null;
};

const PLAN_CONFIG = {
  free: { label: "Free plan", tag: "Upgrade", blurb: null },
  pro: { label: "Pro plan", tag: "Pro", blurb: `All ${TOTAL_MARKETS_LABEL} markets unlocked.` },
  api: { label: "API plan", tag: null, blurb: "Full API + white-label." },
} as const satisfies Record<Plan, PlanConfig>;

const CARD = "rounded-xl border border-nara-border bg-nara-surface2/60 p-3";

type PlanFooterCardProps = {
  /** Markets the free plan is currently showing. Only used on the free plan. */
  marketsUsed?: number;
};

export function PlanFooterCard({ marketsUsed = 0 }: PlanFooterCardProps) {
  const { plan } = usePlan();
  const config = PLAN_CONFIG[plan];
  const isFree = plan === "free";

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">
          {config.label}
        </span>
        {config.tag && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-nara-amber">
            {config.tag}
          </span>
        )}
      </div>

      {isFree ? (
        <FreeUsage used={marketsUsed} />
      ) : (
        <p className="mt-2 font-mono text-[11px] text-nara-muted">{config.blurb}</p>
      )}
    </div>
  );
}

function FreeUsage({ used }: { used: number }) {
  const safeUsed = Math.min(Math.max(0, Math.floor(used)), FREE_MARKETS_CAP);
  const percent = (safeUsed / FREE_MARKETS_CAP) * 100;
  const atLimit = safeUsed >= FREE_MARKETS_CAP;

  return (
    <>
      <p className="mt-2 font-mono text-[11px] text-nara-text">
        {safeUsed} / {FREE_MARKETS_CAP} markets
      </p>

      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-nara-surface"
        role="progressbar"
        aria-label="Free plan market usage"
        aria-valuemin={0}
        aria-valuemax={FREE_MARKETS_CAP}
        aria-valuenow={safeUsed}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            atLimit ? "bg-nara-red" : "bg-nara-amber"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <Link
        href="/pricing"
        className="mt-3 block w-full rounded-md bg-nara-amber px-3 py-1.5 text-center font-mono text-[11px] font-medium uppercase tracking-widest text-nara-black transition-colors hover:bg-nara-amber2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nara-amber/60"
      >
        Upgrade to Pro <span aria-hidden="true">→</span>
      </Link>
    </>
  );
}