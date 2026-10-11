// components/nara/markets/useMarketsPolling.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { getAllMarkets } from "@/lib/nara/bayse";

export type AllMarketsResult = Awaited<ReturnType<typeof getAllMarkets>>;
export type MarketsSnapshot = { data: AllMarketsResult; fetchedAt: number };

/**
 * Keeps the markets data fresh by polling /api/markets.
 * - Only one request at a time, so a slow response can never overwrite a newer one.
 * - Pauses while the tab is hidden and refreshes as soon as it's visible again.
 * - Keeps the last good data on failure and reports the error.
 */
export function useMarketsPolling(initial: MarketsSnapshot, refreshMs: number) {
  const [snapshot, setSnapshot] = useState(initial);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setIsFetching(true);

    try {
      const res = await fetch("/api/markets", { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setSnapshot((await res.json()) as MarketsSnapshot);
      setError(null);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    } finally {
      inFlight.current = null;
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = setInterval(() => void refresh(), refreshMs);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh, refreshMs]);

  // Cancel any request still running when the page is left.
  useEffect(() => () => inFlight.current?.abort(), []);

  return {
    data: snapshot.data,
    fetchedAt: snapshot.fetchedAt,
    isFetching,
    error,
    refresh,
  };
}