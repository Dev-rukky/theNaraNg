import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

// Shared style for the three "feature" tones so they can't drift apart.
const AMBER = "border-nara-amber/40 bg-nara-amber/10 text-nara-amber";

const TONE_CLASSES = {
  live: AMBER,
  pro: AMBER,
  api: AMBER,
  count: "border-nara-red/40 bg-nara-red/15 text-nara-red",
  admin: "border-nara-border bg-nara-surface2 text-nara-muted",
} as const satisfies Record<string, string>;

export type NavBadgeTone = keyof typeof TONE_CLASSES;

const BASE =
  "inline-flex h-[18px] min-w-[22px] shrink-0 select-none items-center justify-center " +
  "whitespace-nowrap rounded-full border px-1.5 font-mono text-[9px] font-medium " +
  "uppercase leading-none tracking-widest tabular-nums";

type NavBadgeProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  tone: NavBadgeTone;
  children: React.ReactNode;
  /** For tone="count": numbers above this show as "99+". */
  max?: number;
};

export function NavBadge({
  tone,
  children,
  className,
  max = 99,
  ...rest
}: NavBadgeProps) {
  const content =
    tone === "count" && typeof children === "number" && children > max
      ? `${max}+`
      : children;

  return (
    <span className={cn(BASE, TONE_CLASSES[tone], className)} {...rest}>
      {/* tracking-widest adds trailing space after the last letter; this offsets it so text stays centred */}
      <span className="-mr-[0.1em]">{content}</span>
    </span>
  );
}