// lib/hooks/useStoredString.ts
"use client";

import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "nara:storage";

// Fallback for browsers where localStorage throws (e.g. some private modes),
// so settings still work for the session instead of silently doing nothing.
const memory = new Map<string, string>();

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(CHANGE_EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Current stored value for `key` (browser only). */
export function readStored(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // fall through to memory
  }
  return memory.get(key) ?? null;
}

/**
 * A localStorage string that is safe with server rendering: it is `null` on the
 * server and during hydration, then switches to the stored value, so the server
 * and browser HTML always match. Stays in sync across components and tabs.
 */
export function useStoredString(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => readStored(key),
    () => null,
  );

  const setValue = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // memory fallback already holds it
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );

  return [value, setValue] as const;
}