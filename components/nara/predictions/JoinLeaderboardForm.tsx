// components/nara/predictions/JoinLeaderboardForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { setLeaderboardProfile } from "@/lib/nara/predictions.actions";
import { HANDLE_RE, type LeaderboardProfile } from "@/lib/nara/predictions.shared";

export function JoinLeaderboardForm({ profile }: { profile: LeaderboardProfile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(profile.name ?? "");
  const [show, setShow] = useState(profile.name ? profile.show : true);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!HANDLE_RE.test(trimmed)) {
      setError("3–20 letters, numbers or underscores.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await setLeaderboardProfile({ name: trimmed, show });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(show ? `You're on the leaderboard as ${trimmed}` : "Saved. You're hidden from the leaderboard.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="lb-handle" className="sr-only">
          Leaderboard handle
        </label>
        <input
          id="lb-handle"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="choose_a_handle"
          maxLength={20}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "lb-handle-error" : undefined}
          className="h-10 flex-1 rounded-md border border-nara-border bg-nara-surface2 px-3 font-mono text-base text-nara-text placeholder:text-nara-muted focus:border-nara-amber/50 focus:outline-none sm:text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-nara-amber px-4 font-mono text-[11px] font-medium uppercase tracking-widest text-nara-black hover:bg-nara-amber2 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {profile.name ? "Save" : "Join leaderboard"}
        </button>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-nara-muted">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="accent-nara-amber" />
        Show me publicly on the leaderboard
      </label>
      {error && (
        <p id="lb-handle-error" role="alert" className="font-mono text-[11px] text-nara-red">
          {error}
        </p>
      )}
    </form>
  );
}