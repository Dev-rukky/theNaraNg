// components/nara/AutoRefresh.tsx
"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the current page's server code every `intervalMs` and swaps in the new
 * result without a reload or losing scroll position. Pauses while the tab is
 * hidden and refreshes as soon as it's visible again. Renders nothing.
 */
export function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const refresh = () => startTransition(() => router.refresh());
    const start = () => {
      stop();
      timer = setInterval(refresh, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}