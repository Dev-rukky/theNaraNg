// components/nara/UpgradePrompt.tsx
// Plain component (no hooks), so Server Components can render it directly
// after checking the plan with getPlan().
import { Lock } from "lucide-react";
import type { Plan } from "@/lib/auth/plan";
import { AmberButton, DataLabel } from "./primitives";

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", pro: "Pro", api: "API / White-Label" };

export function UpgradePrompt({ required, current }: { required: Plan; current: Plan }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-nara-border bg-nara-surface p-10 text-center">
      <div
        aria-hidden
        className="mx-auto flex size-12 items-center justify-center rounded-full border border-nara-amber/40 bg-nara-amber/10 text-nara-amber"
      >
        <Lock className="size-5" />
      </div>
      <DataLabel className="mt-5 inline-block">{`// ${PLAN_LABEL[required]} plan`}</DataLabel>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">Unlock the {PLAN_LABEL[required]} signal.</h2>
      <p className="mt-3 text-sm text-nara-muted">
        You&apos;re on the <span className="font-mono text-nara-text">{PLAN_LABEL[current]}</span> plan. Upgrade to
        access this dashboard and the rest of the {PLAN_LABEL[required]} feature set.
      </p>
      <div className="mt-7">
        <AmberButton as="a" href="/pricing" size="lg">
          See plans <span aria-hidden>→</span>
        </AmberButton>
      </div>
      <div aria-hidden className="mt-6 font-mono text-[10px] uppercase tracking-widest text-nara-amber/70">
        The signal must flow.
      </div>
    </div>
  );
}