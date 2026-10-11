// lib/nara/health.shared.ts
// Types and labels used by both the server and the diagnostics page.
// (A "use server" file may only export async functions, so these live here.)

export type IntegrationStatusView = {
  key: string;
  ok: boolean;
  lastCheckedAt: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  lastLatencyMs?: number;
  consecutiveFailures: number;
};

export type BayseHealth = {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  checkedAt: string;
  message: string;
  integrations: IntegrationStatusView[];
};

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const DIAGNOSTIC_KEYS = ["root", "list-events", "price-history-sample"] as const;
export type DiagnosticKey = (typeof DIAGNOSTIC_KEYS)[number];

export type DiagnosticResult = {
  key: DiagnosticKey;
  ok: boolean;
  status: number | null;
  latencyMs: number;
  checkedAt: string;
  url: string;
  sample?: JsonValue;
  error?: string;
};

export const DIAGNOSTIC_LABELS: Record<DiagnosticKey, string> = {
  root: "Relay root",
  "list-events": "List NGN events",
  "price-history-sample": "Price history (first event)",
};

export function isDiagnosticKey(value: unknown): value is DiagnosticKey {
  return typeof value === "string" && (DIAGNOSTIC_KEYS as readonly string[]).includes(value);
}