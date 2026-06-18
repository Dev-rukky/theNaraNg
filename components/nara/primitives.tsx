import * as React from "react";
import { type ReactNode, forwardRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function NaraLogo({ className = "" }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 21V3l9 9 9-9v18" stroke="#EF9F27" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter" />
        <circle cx="21" cy="3" r="2.4" fill="#EF9F27" />
      </svg>
      <span className="font-sans text-[18px] font-semibold tracking-tight text-nara-text">
        na<span className="text-nara-amber">ra</span>
      </span>
    </span>
  );
}

export function DataLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={cn("nara-label", className)}>{children}</span>;
}

export function LiveDot({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-nara-text/80">
      <span className="nara-live-dot" /> {label}
    </span>
  );
}

export function DeltaBadge({ value, className = "" }: { value: number; className?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[12px] tabular-nums",
        up ? "text-nara-green" : "text-nara-red",
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: "button" | "a";
  href?: string;
  variant?: "amber" | "ghost";
  size?: "md" | "lg";
};

export const AmberButton = forwardRef<HTMLButtonElement, BtnProps>(function AmberButton(
  { className = "", variant = "amber", size = "md", children, as = "button", href, ...rest },
  ref,
) {
  const cls = cn(
    "group relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nara-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-nara-black",
    "active:scale-[0.97]",
    size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4 text-sm",
    variant === "amber" &&
      "bg-nara-amber text-nara-black hover:bg-nara-amber2 shadow-[0_0_0_0_rgba(239,159,39,0)] hover:shadow-[0_8px_30px_-8px_rgba(239,159,39,0.55)]",
    variant === "ghost" &&
      "border border-nara-border bg-transparent text-nara-text hover:bg-nara-surface2 hover:border-nara-amber/40",
    className,
  );
  if (as === "a") {
    return (
      <a href={href} className={cls} {...(rest as any)}>
        {children}
      </a>
    );
  }
  return (
    <button ref={ref} className={cls} {...rest}>
      {children}
    </button>
  );
});

export function OddsBar({ value, className = "" }: { value: number; className?: string }) {
  const color =
    value >= 60 ? "bg-nara-amber" : value >= 40 ? "bg-nara-green" : "bg-nara-red";
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-nara-surface2", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <div
        className={cn("h-full origin-left rounded-full transition-[width] duration-700", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function BrowserMockup({
  url,
  children,
  className = "",
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-nara-border bg-nara-surface shadow-[0_30px_120px_-20px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-nara-border bg-nara-surface2/80 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-nara-red/80" />
          <span className="size-2.5 rounded-full bg-nara-amber/80" />
          <span className="size-2.5 rounded-full bg-nara-green/80" />
        </div>
        <div className="ml-3 flex-1 rounded-md border border-nara-border bg-nara-black/60 px-3 py-1 font-mono text-[11px] text-nara-muted">
          {url}
        </div>
        <span className="hidden md:inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-nara-muted">
          <span className="nara-live-dot" /> LIVE
        </span>
      </div>
      <div className="bg-nara-black">{children}</div>
    </div>
  );
}
