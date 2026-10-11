// components/nara/LiveClock.tsx
"use client";

import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Lagos",
});

/**
 * Renders "--:--" on the server and first paint, then the real time, so the
 * server and browser HTML always match. Keeps ticking instead of freezing.
 */
export function LiveClock({ className }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(formatter.format(new Date()));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className}>
      Updated <time>{time ?? "--:--"}</time> WAT
    </span>
  );
}