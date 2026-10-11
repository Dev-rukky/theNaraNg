// components/nara/AuthInput.tsx
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
  { label, hint, error, rightSlot, mono, className, id, disabled, "aria-describedby": describedBy, ...rest },
  ref,
) {
  // useId is unique per field, even if two fields share a label (the old label-based id wasn't).
  const generatedId = React.useId();
  const inputId = id ?? `auth-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const ariaDescribedBy = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="nara-label">
          {label}
        </label>
        {hint && (
          <span id={hintId} className="truncate font-mono text-[11px] uppercase tracking-widest text-nara-muted">
            {hint}
          </span>
        )}
      </div>

      <div
        className={cn(
          "group relative flex items-center rounded-lg border bg-nara-surface2/60 transition-colors",
          "border-nara-border focus-within:border-nara-amber/60 focus-within:shadow-[0_0_0_4px_rgba(239,159,39,0.08)]",
          error && "border-nara-red/70",
          disabled && "opacity-50",
        )}
      >
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(
            // 16px on phones: iOS Safari zooms the whole page into any input smaller than that.
            "h-11 w-full bg-transparent px-3.5 text-base text-nara-text placeholder:text-nara-muted/70 sm:text-[15px]",
            "focus:outline-none disabled:cursor-not-allowed",
            mono && "font-mono tabular-nums tracking-tight",
            className,
          )}
          {...rest}
        />
        {rightSlot && <div className="shrink-0 pr-2">{rightSlot}</div>}
      </div>

      {error && (
        <p id={errorId} role="alert" className="font-mono text-[11px] uppercase tracking-widest text-nara-red">
          {error}
        </p>
      )}
    </div>
  );
});