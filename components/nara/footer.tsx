import Link from "next/link";
import { NaraLogo } from "./primitives";

export function Footer() {
  return (
    <footer className="border-t border-nara-border bg-nara-surface">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-16 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <NaraLogo />
          <p className="mt-4 max-w-xs font-mono text-[12px] text-nara-amber tracking-wider">
            The signal must flow.
          </p>
          <p className="mt-3 font-mono text-[11px] text-nara-muted">
            © 2026 Nara. All rights reserved.
          </p>
        </div>

        <FooterCol
          title="Product"
          items={["Dashboard", "Newsletter", "API", "Pricing"]}
        />
        <FooterCol 
          title="Company" 
          items={["About", "Twitter", "nara.ng"]} 
        />
        
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">
            Powered by
          </h4>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-nara-border bg-nara-black/60 px-3 py-2 font-mono text-[12px] text-nara-text">
            <span className="size-2 rounded-full bg-nara-amber" /> Bayse Markets
          </div>
          <p className="mt-3 max-w-[220px] text-xs text-nara-muted">
            Market data via Bayse Markets public API.
          </p>
        </div>
      </div>

      <div className="border-t border-nara-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-5 font-mono text-[10px] uppercase tracking-[0.18em] text-nara-muted">
          <span>The signal must flow. — nara.ng</span>
          <span>Powered by Bayse Markets · Built in Lagos 🇳🇬</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">{title}</h4>
      <ul className="mt-4 space-y-2 text-sm text-nara-text/90">
        {items.map((i) => (
          <li key={i}>
            {/* Swapped standard <a> for Next.js <Link> for instant client-side routing */}
            <Link className="transition-colors hover:text-nara-amber" href="#">
              {i}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}