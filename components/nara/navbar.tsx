"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NaraLogo, AmberButton } from "./primitives";
import { ThemeToggle } from "./themetoggle";
import { cn } from "@/lib/utils";

const links = [
  { label: "Markets", href: "#markets" },
  { label: "Analytics", href: "#dashboard" },
  { label: "Newsletter", href: "#newsletter" },
  { label: "API", href: "#api" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 backdrop-blur-md transition-colors duration-300",
        scrolled
          ? "bg-nara-black/85 border-b border-nara-border"
          : "bg-nara-black/60 border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="shrink-0">
          <NaraLogo />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                className="relative text-sm text-nara-muted transition-colors hover:text-nara-text"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* FIX 1: Changed as={Link} to as="a" */}
          <AmberButton variant="ghost" size="md" as="a" href="/auth">
            Sign in
          </AmberButton>

          {/* <AmberButton
            variant="amber"
            size="md"
            as="a"
            href="/auth?mode=signup"
          ></AmberButton> */}

          {/* FIX 2: Changed as={Link} to as="a" */}
          <AmberButton
            variant="amber"
            size="md"
            as="a"
            href="/auth?mode=signup"
          >
            Get early access →
          </AmberButton>
        </div>
      </nav>
    </header>
  );
}
