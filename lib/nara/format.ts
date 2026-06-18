export const fmtPct = (n: number, d = 1) => `${n.toFixed(d)}%`;

export const fmtDelta = (n: number, d = 1) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`;

export const fmtNGN = (n: number) =>
  `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export const fmtVol = (n: number) => {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${n}`;
};

export const fmtWAT = (d = new Date()) =>
  d.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Lagos",
  }) + " WAT";
