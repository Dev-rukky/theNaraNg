// lib/nara/format.ts
// Display formatters. Pure functions: safe on the server and in the browser.

// Built once and reused; constructing Intl formatters on every call is slow.
const ngnFormatter = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const watFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Lagos",
});

const MISSING = "—";

/** toFixed, but never "-0.0" for tiny negatives. */
function fixed(n: number, d: number) {
  const s = n.toFixed(d);
  return Number(s) === 0 ? (0).toFixed(d) : s;
}

/** 45.234 → "45.2%" */
export const fmtPct = (n: number, d = 1) => (Number.isFinite(n) ? `${fixed(n, d)}%` : MISSING);

/** 6.2 → "+6.2%", -3 → "-3.0%", 0.01 → "0.0%" (no sign on a value that rounds to zero) */
export const fmtDelta = (n: number, d = 1) => {
  if (!Number.isFinite(n)) return MISSING;
  const s = fixed(n, d);
  return Number(s) > 0 ? `+${s}%` : `${s}%`;
};

/** 1234567 → "₦1,234,567"; negatives as "-₦500" */
export const fmtNGN = (n: number) => {
  if (!Number.isFinite(n)) return MISSING;
  const sign = n < 0 ? "-" : "";
  return `${sign}₦${ngnFormatter.format(Math.abs(n))}`;
};

const VOLUME_UNITS = [
  [1_000_000_000, "B"],
  [1_000_000, "M"],
  [1_000, "K"],
] as const;

/** 2_450_000 → "₦2.5M". Rounding never produces "₦1000.0K"; that becomes "₦1.0M". */
export const fmtVol = (n: number) => {
  if (!Number.isFinite(n)) return MISSING;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  for (let i = 0; i < VOLUME_UNITS.length; i++) {
    const [size, suffix] = VOLUME_UNITS[i];
    if (abs < size) continue;
    const scaled = Number((abs / size).toFixed(1));
    if (scaled >= 1000 && i > 0) {
      const [biggerSize, biggerSuffix] = VOLUME_UNITS[i - 1];
      return `${sign}₦${(abs / biggerSize).toFixed(1)}${biggerSuffix}`;
    }
    return `${sign}₦${scaled.toFixed(1)}${suffix}`;
  }

  const whole = Math.round(abs);
  return whole >= 1000 ? `${sign}₦1.0K` : `${sign}₦${whole}`;
};

/**
 * Time in Lagos, e.g. "14:05 WAT".
 * Pass the time explicitly when rendering on the server. The default
 * (`new Date()`) differs between server and browser and causes a hydration
 * mismatch, so only rely on it in effects or event handlers.
 */
export const fmtWAT = (d: Date | number = new Date()) => `${watFormatter.format(d)} WAT`;   