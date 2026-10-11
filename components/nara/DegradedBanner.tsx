"use client";

import { useState } from "react";
import { AlertTriangle, RotateCw, X } from "lucide-react";

export function DegradedBanner({ 
  reason, 
  onRetry 
}: { 
  reason?: string;
  onRetry?: () => Promise<void> | void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (dismissed) return null;

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await Promise.resolve(onRetry());
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-nara-amber/30 bg-nara-amber/10 px-6 py-2.5"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-widest text-nara-amber">
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-3.5" />
          <span>
            Live Bayse feed unavailable — showing cached signal
            {reason ? ` · ${reason}` : ""}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-1 rounded-full border border-nara-amber/40 px-2 py-0.5 text-nara-amber hover:bg-nara-amber/10 disabled:opacity-50"
            >
              <RotateCw className={`size-3 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "Retrying" : "Retry"}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
            className="text-nara-amber/60 hover:text-nara-amber"
          >
            <X className="size-3.5" />
          </button>
        </span>
      </div>
    </div>
  );
}