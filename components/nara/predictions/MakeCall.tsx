// components/nara/predictions/MakeCall.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Target } from "lucide-react";
import { makePrediction } from "@/lib/nara/predictions.actions";
import {
  CALL_CUTOFF_MS,
  MAX_CALL_PRICE,
  MIN_CALL_PRICE,
  potentialPoints,
  type MyCall,
  type Side,
} from "@/lib/nara/predictions.shared";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  yes: number;
  resolvesAt: number | null;
  resolved: boolean;
  myCall?: MyCall;
};

export function MakeCall({ eventId, yes, resolvesAt, resolved, myCall }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState<Side | null>(null);
  const [justMade, setJustMade] = useState<MyCall | null>(null);

  const call = myCall ?? justMade;
  const closingSoon = resolvesAt !== null && resolvesAt - Date.now() < CALL_CUTOFF_MS;
  const tooCertain = yes < MIN_CALL_PRICE || yes > MAX_CALL_PRICE;

  const confirm = () => {
    if (!choice) return;
    startTransition(async () => {
      const res = await makePrediction({ eventId, side: choice });
      if (!res.ok) {
        toast.error("Call not saved", { description: res.error });
        return;
      }
      setJustMade(res.data);
      setChoice(null);
      toast.success(`You called ${res.data.side.toUpperCase()} at ${res.data.yesPrice.toFixed(1)}%`);
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-nara-border bg-nara-surface2/60 p-4">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
        <Target className="size-3.5 text-nara-amber" aria-hidden /> Your call
      </div>

      {call ? (
        <p className="text-sm text-nara-text">
          You called{" "}
          <span className={cn("font-mono font-semibold", call.side === "yes" ? "text-nara-green" : "text-nara-red")}>
            {call.side.toUpperCase()}
          </span>{" "}
          at <span className="font-mono">{call.yesPrice.toFixed(1)}%</span> YES.{" "}
          <span className="text-nara-muted">
            Scores {fmtPts(potentialPoints(call.side, call.yesPrice).win)} if right,{" "}
            {fmtPts(potentialPoints(call.side, call.yesPrice).lose)} if wrong.
          </span>
        </p>
      ) : resolved || closingSoon ? (
        <p className="text-sm text-nara-muted">Calls are closed for this market.</p>
      ) : tooCertain ? (
        <p className="text-sm text-nara-muted">This market is too close to certain to call.</p>
      ) : choice ? (
        <div className="space-y-3">
          <p className="text-sm text-nara-text">
            Call <span className="font-mono font-semibold">{choice.toUpperCase()}</span> at{" "}
            <span className="font-mono">{yes.toFixed(1)}%</span>?{" "}
            <span className="text-nara-muted">
              {fmtPts(potentialPoints(choice, yes).win)} if right, {fmtPts(potentialPoints(choice, yes).lose)} if wrong.
              Calls are final.
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-nara-amber px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-widest text-nara-black hover:bg-nara-amber2 disabled:opacity-60"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Confirm call
            </button>
            <button
              type="button"
              onClick={() => setChoice(null)}
              disabled={pending}
              className="rounded-md border border-nara-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-nara-muted hover:text-nara-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <SideButton side="yes" price={yes} onClick={() => setChoice("yes")} />
            <SideButton side="no" price={100 - yes} onClick={() => setChoice("no")} />
          </div>
          <p className="font-mono text-[10px] text-nara-muted">
            Scored when the market resolves. Free to play, no money involved.
          </p>
        </div>
      )}
    </div>
  );
}

function SideButton({ side, price, onClick }: { side: Side; price: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-2 text-left transition-colors",
        side === "yes"
          ? "border-nara-green/40 bg-nara-green/10 text-nara-green hover:bg-nara-green/20"
          : "border-nara-red/40 bg-nara-red/10 text-nara-red hover:bg-nara-red/20",
      )}
    >
      <span className="block font-mono text-[11px] uppercase tracking-widest">Call {side}</span>
      <span className="block font-mono text-sm font-semibold tabular-nums">{price.toFixed(1)}%</span>
    </button>
  );
}

function fmtPts(n: number) {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)} pts`;
}