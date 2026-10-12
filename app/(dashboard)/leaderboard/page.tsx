// app/(dashboard)/leaderboard/page.tsx   →  /leaderboard  (all plans; Pro sees beyond the top 10)
import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/nara/PageHeader";
import { UpgradePrompt } from "@/components/nara/UpgradePrompt";
import { JoinLeaderboardForm } from "@/components/nara/predictions/JoinLeaderboardForm";
import { checkAccess } from "@/lib/auth/checkAccess";
import { planAllows } from "@/lib/auth/plan";
import { getLeaderboard, getMyLeaderboardProfile, getMyRecentCalls, getMyStats } from "@/lib/nara/predictions";
import type { RecentCall } from "@/lib/nara/predictions.shared";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

const FREE_ROWS = 10;
const dateFormatter = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });

function pts(n: number) {
  return `${n > 0 ? "+" : ""}${n.toLocaleString("en-NG", { maximumFractionDigits: 1 })}`;
}

export default async function LeaderboardPage() {
  const { allowed, plan, isAdmin, requiredPlan } = await checkAccess("/leaderboard");

  const header = (
    <PageHeader
      eyebrow="Leaderboard"
      title={
        <>
          Top callers. <span className="text-nara-muted">By edge.</span>
        </>
      }
      description="Make calls on live markets. When they resolve, you score the edge you had over the crowd. Free to play, no money involved."
    />
  );

  if (!allowed) {
    return (
      <>
        {header}
        <UpgradePrompt required={requiredPlan} current={plan} />
      </>
    );
  }

  const [rows, stats, profile, recent] = await Promise.all([
    getLeaderboard(),
    getMyStats(),
    getMyLeaderboardProfile(),
    getMyRecentCalls(20),
  ]);
  const seesAll = isAdmin || planAllows(plan, "pro");
  const minCalls = stats?.minCalls ?? 5;

  return (
    <>
      {header}

      <div className="space-y-8">
        {/* your standing */}
        <section aria-label="Your standing" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2">
            <Stat label="Your edge" value={stats ? pts(stats.edgePoints) : "0"} tone={stats && stats.edgePoints < 0 ? "red" : "amber"} />
            <Stat label="Rank" value={stats?.rank ? `#${stats.rank}` : "—"} />
            <Stat
              label="Accuracy"
              value={stats && stats.resolvedCalls > 0 ? `${Math.round((100 * stats.correct) / stats.resolvedCalls)}%` : "—"}
            />
            <Stat label="Open calls" value={String(stats?.openCalls ?? 0)} />
          </div>
          <div className="rounded-2xl border border-nara-border bg-nara-surface p-5">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
              {profile.name ? "Your leaderboard handle" : "Join the leaderboard"}
            </div>
            <JoinLeaderboardForm profile={profile} />
          </div>
        </section>

        {stats && !stats.rank && (
          <p className="font-mono text-[11px] text-nara-muted">
            {!profile.name || !profile.show
              ? "Choose a handle and show yourself publicly to be ranked."
              : `You'll be ranked after ${minCalls} resolved calls (you have ${stats.resolvedCalls}).`}{" "}
            <Link href="/dashboard" className="text-nara-amber hover:underline">
              Make a call on the markets page →
            </Link>
          </p>
        )}

        {/* the board */}
        <section aria-label="Leaderboard" className="overflow-hidden rounded-2xl border border-nara-border bg-nara-surface">
          <div className="grid grid-cols-12 gap-3 border-b border-nara-border px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
            <span className="col-span-2 sm:col-span-1">#</span>
            <span className="col-span-5 sm:col-span-5">Caller</span>
            <span className="col-span-2 text-right">Calls</span>
            <span className="hidden text-right sm:col-span-2 sm:block">Accuracy</span>
            <span className="col-span-3 text-right sm:col-span-2">Edge</span>
          </div>
          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-nara-muted">
              No one is ranked yet. Callers appear after {minCalls} resolved calls. Be the first.
            </div>
          ) : (
            <ol className="divide-y divide-nara-border">
              {rows.map((r) => {
                const isMe = !!profile.name && profile.show && r.name.toLowerCase() === profile.name.toLowerCase();
                return (
                  <li
                    key={r.name}
                    className={cn(
                      "grid grid-cols-12 items-center gap-3 px-5 py-3",
                      isMe ? "bg-nara-amber/10" : "hover:bg-nara-surface2/60",
                    )}
                  >
                    <span className="col-span-2 flex items-center gap-1.5 font-mono text-[12px] tabular-nums text-nara-muted sm:col-span-1">
                      {String(r.rank).padStart(2, "0")}
                      {r.rank <= 3 && <Trophy className="size-3.5 text-nara-amber" aria-label="Top 3" />}
                    </span>
                    <span className="col-span-5 truncate text-[13px] text-nara-text">
                      {r.name}
                      {isMe && <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-nara-amber">You</span>}
                    </span>
                    <span className="col-span-2 text-right font-mono text-[12px] tabular-nums text-nara-muted">{r.calls}</span>
                    <span className="hidden text-right font-mono text-[12px] tabular-nums text-nara-muted sm:col-span-2 sm:block">
                      {r.accuracy.toFixed(0)}%
                    </span>
                    <span
                      className={cn(
                        "col-span-3 text-right font-mono text-[12px] tabular-nums sm:col-span-2",
                        r.edgePoints >= 0 ? "text-nara-green" : "text-nara-red",
                      )}
                    >
                      {pts(r.edgePoints)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {!seesAll && rows.length >= FREE_ROWS && (
            <div className="border-t border-nara-border bg-nara-surface2/40 px-5 py-5 text-center text-sm text-nara-text">
              Free shows the top {FREE_ROWS}.{" "}
              <Link href="/pricing" className="font-medium text-nara-amber hover:underline">
                Pro shows the full board →
              </Link>
            </div>
          )}
        </section>

        {/* your calls */}
        <section aria-label="Your recent calls" className="overflow-hidden rounded-2xl border border-nara-border bg-nara-surface">
          <div className="border-b border-nara-border px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
            Your recent calls
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-nara-muted">
              No calls yet. Open any market on the{" "}
              <Link href="/dashboard" className="text-nara-amber hover:underline">
                markets page
              </Link>{" "}
              and make your first call.
            </div>
          ) : (
            <ul className="divide-y divide-nara-border">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-nara-text">{c.marketTitle}</div>
                    <div className="font-mono text-[10px] text-nara-muted">
                      <span className={c.side === "yes" ? "text-nara-green" : "text-nara-red"}>{c.side.toUpperCase()}</span> at{" "}
                      {c.yesPrice.toFixed(1)}% · {dateFormatter.format(new Date(c.createdAt))}
                    </div>
                  </div>
                  <CallResult call={c} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="font-mono text-[11px] leading-relaxed text-nara-muted">
          How scoring works: calling YES at 30% earns +70 points if the market resolves YES and −30 if it resolves NO
          (NO calls are the reverse). Calling right against the crowd earns the most. Markets that are cancelled score 0.
          Calls close 5 minutes before a market resolves and can&apos;t be changed.
        </p>
      </div>
    </>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "amber" | "red" }) {
  return (
    <div className="rounded-xl border border-nara-border bg-nara-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">{label}</div>
      <div
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          tone === "amber" && "text-nara-amber",
          tone === "red" && "text-nara-red",
          tone === "neutral" && "text-nara-text",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function CallResult({ call }: { call: RecentCall }) {
  if (call.outcome === null) {
    return <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-nara-muted">Open</span>;
  }
  if (call.outcome === "void") {
    return <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-nara-muted">Void · 0</span>;
  }
  const won = (call.edgePoints ?? 0) > 0;
  return (
    <span className={cn("shrink-0 font-mono text-[12px] tabular-nums", won ? "text-nara-green" : "text-nara-red")}>
      {won ? "Won" : "Lost"} {pts(call.edgePoints ?? 0)}
    </span>
  );
}