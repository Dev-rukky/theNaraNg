"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "nara:theme";

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 1. Default to 'dark' for the initial server render to match your HTML defaults
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // 2. Once mounted on the client, sync React state with the actual DOM
  // The inline script in layout.tsx will have already set the correct classes
  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    const isLight = root.classList.contains("light");
    setThemeState(isLight ? "light" : "dark");
  }, []);

  // 3. Listen for theme changes initiated by the user
  useEffect(() => {
    if (!mounted) return; // Skip during SSR to prevent hydration errors

    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore write errors (e.g., incognito mode restrictions)
    }
  }, [theme, mounted]);

  return (
    <Ctx.Provider
      value={{
        theme,
        setTheme: setThemeState,
        toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside <ThemeProvider />");
  return v;
}

// Inline script string — runs before hydration to prevent flash.
export const themeInitScript = `(function(){try{var k='${STORAGE_KEY}';var s=localStorage.getItem(k);var t=s==='light'||s==='dark'?s:'dark';var r=document.documentElement;r.classList.toggle('light',t==='light');r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');}})();`;