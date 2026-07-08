export type Market = {
  id: string;
  name: string;
  series: string;
  yes: number; // 0-100
  delta: number; // %
  volume: number; // NGN
  resolves: string;
};

export const MARKETS: Market[] = [
  { id: "usd-ngn-1400", name: "USD/NGN closes above ₦1,400", series: "usd-ngn", yes: 73.4, delta: 8.2, volume: 12_400_000, resolves: "Friday 6pm WAT" },
  { id: "cbn-hold-jun", name: "CBN holds MPR at June meeting", series: "cbn", yes: 63.1, delta: 2.1, volume: 8_700_000, resolves: "Jun 24, 2pm WAT" },
  { id: "petrol-1100", name: "Petrol pump price above ₦1,100", series: "petrol", yes: 58.7, delta: -1.4, volume: 5_200_000, resolves: "Sunday 11pm WAT" },
  { id: "super-eagles", name: "Super Eagles qualify for AFCON final", series: "sports", yes: 41.2, delta: -0.8, volume: 4_100_000, resolves: "Sat 9pm WAT" },
  { id: "inflation-30", name: "Headline inflation above 30% in Jul", series: "macro", yes: 67.8, delta: 3.4, volume: 6_900_000, resolves: "Jul 15, 12pm WAT" },
  { id: "dangote-fx", name: "Dangote refinery dollar sales by Aug", series: "energy", yes: 52.3, delta: 5.6, volume: 3_800_000, resolves: "Aug 1, 12pm WAT" },
];

export const TICKER = MARKETS.map((m) => ({
  name: m.name,
  yes: m.yes,
  delta: m.delta,
}));

// 7-day USD/NGN crowd probability series
export const USDNGN_HISTORY = [
  { t: "Day 1", crowd: 51.2, cbn: 1395 },
  { t: "Day 2", crowd: 54.6, cbn: 1397 },
  { t: "Day 3", crowd: 58.1, cbn: 1399 },
  { t: "Day 4", crowd: 61.3, cbn: 1402 },
  { t: "Day 5", crowd: 65.8, cbn: 1404 },
  { t: "Day 6", crowd: 70.2, cbn: 1406 },
  { t: "Today", crowd: 73.4, cbn: 1408 },
];

export const SHARP_ALERTS = [
  { id: "a1", market: "USD/NGN >₦1,400", move: 12.4, minutes: 47, vol: 2_400_000, time: "11:42 WAT" },
  { id: "a2", market: "Petrol >₦1,100", move: -8.1, minutes: 36, vol: 1_100_000, time: "10:08 WAT" },
  { id: "a3", market: "CBN Hold Jun", move: 9.7, minutes: 52, vol: 1_800_000, time: "09:21 WAT" },
];

export const STATS = {
  volume: 48_200_000,
  markets: 24,
  sharpest: 31,
  resolvingSoon: 6,
  accuracy: 73.4,
};
