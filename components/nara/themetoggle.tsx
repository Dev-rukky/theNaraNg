// components/ThemeToggle.tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  // The server can't know the user's theme, so nothing rendered here depends on it.
  // Both icons are always rendered and CSS (the `dark` class on <html>) picks one.
  // The theme is only read on click, when it's definitely known.
  function toggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-nara-muted transition-colors hover:bg-nara-surface2 hover:text-nara-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nara-amber/60",
        className,
      )}
    >
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
    </button>
  );
}