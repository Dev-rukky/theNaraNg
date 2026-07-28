import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  rightSlot?: React.ReactNode;
  mono?: boolean;
};

export const AuthInput = React.forwardRef<HTMLInputElement, Props>(function AuthInput(
  { label, hint, error, rightSlot, mono, className, id, ...rest },
  ref,
) {
  const inputId = id ?? `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="nara-label">
          {label}
        </label>
        {hint && (
          <span className="font-mono text-[11px] uppercase tracking-widest text-nara-muted">{hint}</span>
        )}
      </div>
      <div
        className={cn(
          "group relative flex items-center rounded-lg border bg-nara-surface2/60 transition-colors",
          "border-nara-border focus-within:border-nara-amber/60 focus-within:shadow-[0_0_0_4px_rgba(239,159,39,0.08)]",
          error && "border-nara-red/70",
        )}
      >
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full bg-transparent px-3.5 text-[15px] text-nara-text placeholder:text-nara-muted/70",
            "focus:outline-none",
            mono && "font-mono tabular-nums tracking-tight",
            className,
          )}
          {...rest}
        />
        {rightSlot && <div className="pr-2">{rightSlot}</div>}
      </div>
      {error && <p className="font-mono text-[11px] uppercase tracking-widest text-nara-red">{error}</p>}
    </div>
  );
});
