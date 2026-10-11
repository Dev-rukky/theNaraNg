// components/nara/HealthBadge.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BayseHealth } from "@/lib/nara/health.shared";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

type Status = "loading" | "ok" | "down";

/**
 * Polls /api/health once a minute. One request at a time, paused while the tab
 * is hidden, and stops for good if the server says this user isn't an admin.
 */
function useBayseHealth() {
  const [health, setHealth] = useState<BayseHealth | null>(null);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    if (forbidden) return;
    let timer: ReturnType<typeof setInterval> | undefined;

    const check = async () => {
      if (inFlight.current) return;
      const controller = new AbortController();
      inFlight.current = controller;
      try {
        const res = await fetch("/api/health", { cache: "no-store", signal: controller.signal });
        if (res.status === 404 || res.status === 401 || res.status === 403) {
          setForbidden(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setHealth((await res.json()) as BayseHealth);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        inFlight.current = null;
      }
    };

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = setInterval(() => void check(), POLL_MS);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void check();
        start();
      } else {
        stop();
      }
    };

    void check();
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      inFlight.current?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [forbidden]);

  const status: Status = failed ? "down" : !health ? "loading" : health.ok ? "ok" : "down";
  return { health, status, forbidden };
}

const DOT: Record<Status, string> = {
  ok: "bg-nara-green shadow-[0_0_8px_var(--nara-green)]",
  down: "bg-nara-red shadow-[0_0_8px_var(--nara-red)]",
  loading: "bg-nara-muted",
};

/** Render only for admins (the layout decides on the server). */
export function HealthBadge() {
  const { health, status, forbidden } = useBayseHealth();
  if (forbidden) return null;

  const label =
    status === "loading"
      ? "Bayse · checking"
      : status === "ok"
        ? `Bayse · OK${health ? ` · ${health.latencyMs}ms` : ""}`
        : `Bayse · ${health?.message ?? "unreachable"}`;

  return (
    <Link
      href="/diagnostics"
      title={health?.message ?? "Bayse status"}
      className="hidden max-w-[16rem] items-center gap-1.5 rounded-full border border-nara-border bg-nara-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-nara-muted hover:border-nara-amber/40 hover:text-nara-text sm:inline-flex"
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[status])} />
      {/* Visible text is the accessible name, so screen readers hear the actual status. */}
      <span className="truncate tabular-nums">{label}</span>
      <span className="sr-only">, open diagnostics</span>
    </Link>
  );
}