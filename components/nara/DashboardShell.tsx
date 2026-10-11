// components/nara/DashboardShell.tsx
"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  Activity,
  Banknote,
  Bell,
  BellRing,
  BookOpen,
  LineChart,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  Shield,
  Stethoscope,
  Terminal,
  Trophy,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { LiveDot, NaraLogo } from "@/components/nara/primitives";
import { HealthBadge } from "@/components/nara/HealthBadge";
import { NavBadge, type NavBadgeTone } from "@/components/nara/NavBadge";
import { PlanFooterCard } from "@/components/nara/PlanFooterCard";
import { DashboardLiveBar } from "@/components/nara/DashboardLiveBar";
import { ThemeToggle } from "@/components/nara/Themetoggle";
import { LiveClock } from "@/components/nara/LiveClock";
import type { LandingData } from "@/lib/nara/bayse";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: { tone: NavBadgeTone; text: string };
  adminOnly?: boolean;
};

type NavSection = { label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    label: "Core",
    items: [
      { href: "/dashboard", label: "Markets", icon: Activity, badge: { tone: "live", text: "Live" } },
      { href: "/naira", label: "Naira Tracker", icon: Banknote },
      { href: "/sharp-money", label: "Sharp Money", icon: LineChart, badge: { tone: "count", text: "3" } },
      { href: "/analytics", label: "Analytics", icon: TrendingUp },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/signal-archive", label: "Signal Archive", icon: BookOpen },
      { href: "/alerts", label: "My Alerts", icon: BellRing, badge: { tone: "pro", text: "Pro" } },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/api-access", label: "API & SDK", icon: Terminal, badge: { tone: "api", text: "API" } },
      { href: "/settings", label: "Settings", icon: SettingsIcon },
      { href: "/diagnostics", label: "Diagnostics", icon: Stethoscope, badge: { tone: "admin", text: "Admin" }, adminOnly: true },
      { href: "/admin", label: "Admin", icon: Shield, badge: { tone: "admin", text: "Admin" }, adminOnly: true },
    ],
  },
];

/** Active on the page itself and any sub-page (e.g. /signal-archive/123). */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  children,
  userLabel,
  landing,
  isAdmin,
}: {
  children: ReactNode;
  userLabel: string;
  /** Initial live-bar data, loaded on the server by the layout. */
  landing: LandingData;
  /** Decided on the server, so admin links never flash in or out. */
  isAdmin: boolean;
}) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly || isAdmin) })).filter(
        (s) => s.items.length > 0,
      ),
    [isAdmin],
  );

  // Mobile drawer: close on Escape and stop the page scrolling behind it.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-nara-black text-nara-text">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-nara-border bg-nara-surface md:block">
        <Sidebar sections={sections} pathname={pathname} userLabel={userLabel} />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-nara-black/80 backdrop-blur-sm md:hidden"
          onClick={closeMobile}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-nara-border bg-nara-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={closeMobile}
                aria-label="Close menu"
                className="rounded-md p-1 text-nara-muted hover:text-nara-text"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <Sidebar sections={sections} pathname={pathname} userLabel={userLabel} onNavigate={closeMobile} />
            </div>
          </aside>
        </div>
      )}

      <div className="md:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-nara-border bg-nara-black/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="rounded-md p-1.5 text-nara-muted hover:bg-nara-surface2 md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <LiveDot />
            <LiveClock className="hidden font-mono text-[11px] text-nara-muted sm:inline" />
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <HealthBadge />}
            <ThemeToggle />
            <button
              type="button"
              aria-label="Notifications"
              className="rounded-md p-2 text-nara-muted hover:bg-nara-surface2 hover:text-nara-text"
            >
              <Bell className="size-4" />
            </button>
          </div>
        </header>

        <DashboardLiveBar initialData={landing} />

        <main className="px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({
  sections,
  pathname,
  userLabel,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  userLabel: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-5 px-4 py-6">
      <div className="px-2">
        <Link href="/" className="inline-flex" onClick={onNavigate}>
          <NaraLogo />
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-widest text-nara-muted/70">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-nara-amber/10 text-nara-amber"
                        : "text-nara-muted hover:bg-nara-surface2 hover:text-nara-text",
                    )}
                  >
                    {active && (
                      <span aria-hidden className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-nara-amber" />
                    )}
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge && <NavBadge tone={item.badge.tone}>{item.badge.text}</NavBadge>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-nara-border pt-4">
        <PlanFooterCard />
        <div className="truncate px-1 font-mono text-[11px] text-nara-muted">{userLabel}</div>
        <form action={signOut}>
          <SignOutButton />
        </form>
        <div className="px-2 font-mono text-[10px] uppercase tracking-widest text-nara-amber/70">
          The signal must flow.
        </div>
      </div>
    </div>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-nara-muted transition-colors hover:bg-nara-surface2 hover:text-nara-red disabled:opacity-50"
    >
      <LogOut className="size-4" aria-hidden /> {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}