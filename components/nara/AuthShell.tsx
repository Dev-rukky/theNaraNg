import Link from "next/link";
import { type ReactNode } from "react";
import { NaraLogo } from "./primitives";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-nara-black text-nara-text">
      {/* ambient glow + dot grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 nara-dot-grid opacity-60" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-32 h-[520px] nara-amber-glow" />

      {/* top bar */}
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="shrink-0">
          <NaraLogo />
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-widest text-nara-muted">
          <span className="nara-amber-dot mr-2 align-middle" />
          secure channel
        </span>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 gap-12 px-6 pb-16 pt-6 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:pt-12">
        {/* left: editorial copy */}
        <section className="hidden flex-col justify-between lg:flex">
          <div>
            <p className="nara-label">{eyebrow}</p>
            <h1 className="mt-4 max-w-md text-balance font-sans text-[44px] font-semibold leading-[1.05] tracking-tight">
              {title}
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-nara-muted">{subtitle}</p>
          </div>

          <dl className="grid max-w-md grid-cols-3 gap-6 border-t border-nara-border pt-8">
            <Stat label="Markets" value="24" />
            <Stat label="Volume 24h" value="₦48.2M" />
            <Stat label="Accuracy" value="73.4%" />
          </dl>

          <p className="font-mono text-[11px] uppercase tracking-widest text-nara-amber">
            The signal must flow. — nara.ng
          </p>
        </section>

        {/* right: form card */}
        <section className="flex items-start lg:items-center">
          <div className="w-full">
            <div className="nara-card relative p-7 sm:p-9">
              {/* corner amber accent */}
              <span
                aria-hidden
                className="absolute -top-px left-7 h-px w-12 bg-nara-amber"
                style={{ boxShadow: "0 0 18px rgba(239,159,39,0.7)" }}
              />
              <div className="lg:hidden">
                <p className="nara-label">{eyebrow}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
                <p className="mt-1.5 text-sm text-nara-muted">{subtitle}</p>
                <div className="my-6 h-px w-full bg-nara-border" />
              </div>
              {children}
            </div>
            {footer && <div className="mt-5 text-center text-sm text-nara-muted">{footer}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="nara-label">{label}</dt>
      <dd className="mt-1 font-mono text-[22px] tabular-nums text-nara-text">{value}</dd>
    </div>
  );
}