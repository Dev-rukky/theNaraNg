// lib/nara/uselandingdata.ts
"use client";

import { useSyncExternalStore } from "react";
import type { LandingData } from "./bayse";

/*
 * One shared poller for the whole page: however many components call
 * useLandingData (hero mockup, ticker, …), there is only one request every
 * POLL_MS, and polling stops when no component is using it.
 */

// The server refreshes landing data every 60s, so polling faster only re-reads the cache.
const POLL_MS = 60_000;
const ENDPOINT = "/api/landing";

let latest: LandingData | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let inFlight: AbortController | null = null;

function emit() {
  for (const listener of listeners) listener();
}

async function refresh() {
  if (inFlight) return; // never overlap requests
  const controller = new AbortController();
  inFlight = controller;
  try {
    const res = await fetch(ENDPOINT, { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    latest = (await res.json()) as LandingData;
    emit();
  } catch (err) {
    // Keep showing the last good data; the next tick tries again.
    if (!controller.signal.aborted) console.error("Failed to fetch live market data:", err);
  } finally {
    inFlight = null;
  }
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => void refresh(), POLL_MS);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

// Pause while the tab is hidden; catch up as soon as it's visible again.
function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    void refresh();
    startTimer();
  } else {
    stopTimer();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (document.visibilityState === "visible") startTimer();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopTimer();
      inFlight?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}

/** Whichever copy is newer: the live poll result or the server-rendered data. */
function newest(a: LandingData | null, b: LandingData): LandingData {
  if (!a) return b;
  return Date.parse(a.asOf) >= Date.parse(b.asOf) ? a : b;
}

/**
 * Live landing data. Starts from the server-rendered `initialData` (so the first
 * render matches the server HTML exactly), then updates every minute.
 */
export function useLandingData(initialData: LandingData): LandingData {
  return useSyncExternalStore(
    subscribe,
    () => newest(latest, initialData),
    () => initialData,
  );
}