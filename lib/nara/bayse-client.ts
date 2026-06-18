// Shared Bayse client. Centralizes base URL, request headers (User-Agent),
// retry/timeout policy, and per-integration last-error tracking so every
// server function calling Bayse behaves identically.
//
// NOTE: status tracker lives in module-scope memory. On Cloudflare Workers
// each isolate has its own copy — this is best-effort observability, not a
// durable audit log. Good enough for an at-a-glance dashboard / diagnostics.

export const BAYSE_BASE = "https://relay.bayse.markets/v1";

// Bayse's AWS ELB 403s the default Cloudflare-Workers UA and hangs empty UAs.
// Send a stable app UA on every request from every server function.
export const BAYSE_HEADERS: Record<string, string> = {
  accept: "application/json",
  "user-agent": "nara.ng/1.0 (+https://nara.ng)",
};

export const BAYSE_DEFAULT_TIMEOUT_MS = 6000;

export type IntegrationKey =
  | "list-events"
  | "price-history"
  | "health"
  | "diagnostics";

export type IntegrationStatus = {
  key: IntegrationKey;
  ok: boolean;
  lastCheckedAt: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  lastLatencyMs?: number;
  consecutiveFailures: number;
};

const statuses = new Map<IntegrationKey, IntegrationStatus>();

function getOrInit(key: IntegrationKey): IntegrationStatus {
  let s = statuses.get(key);
  if (!s) {
    s = {
      key,
      ok: false,
      lastCheckedAt: new Date(0).toISOString(),
      consecutiveFailures: 0,
    };
    statuses.set(key, s);
  }
  return s;
}

export function recordSuccess(key: IntegrationKey, latencyMs: number): void {
  const s = getOrInit(key);
  const now = new Date().toISOString();
  s.ok = true;
  s.lastCheckedAt = now;
  s.lastSuccessAt = now;
  s.lastLatencyMs = latencyMs;
  s.consecutiveFailures = 0;
}

export function recordFailure(key: IntegrationKey, error: unknown, latencyMs?: number): void {
  const s = getOrInit(key);
  const now = new Date().toISOString();
  s.ok = false;
  s.lastCheckedAt = now;
  s.lastFailureAt = now;
  s.lastError = error instanceof Error ? error.message : String(error);
  if (typeof latencyMs === "number") s.lastLatencyMs = latencyMs;
  s.consecutiveFailures += 1;
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  return Array.from(statuses.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function getIntegrationStatus(key: IntegrationKey): IntegrationStatus {
  return { ...getOrInit(key) };
}

export type BayseFetchOpts = {
  attempts?: number;
  baseMs?: number;
  timeoutMs?: number;
  /** Integration key to record success/failure under. Pass null to skip tracking. */
  integration?: IntegrationKey | null;
};

/**
 * Fetch a Bayse JSON endpoint with retry + exponential backoff. Records the
 * outcome against the named integration (if provided) so the dashboard /
 * diagnostics page can surface it.
 */
export async function bayseFetch<T>(
  path: string,
  {
    attempts = 3,
    baseMs = 250,
    timeoutMs = BAYSE_DEFAULT_TIMEOUT_MS,
    integration = null,
  }: BayseFetchOpts = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BAYSE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const started = Date.now();
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: BAYSE_HEADERS, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as T;
        if (integration) recordSuccess(integration, Date.now() - started);
        return data;
      }
      const err = new Error(`Bayse ${res.status} ${res.statusText}`);
      // 4xx (except 429) → don't retry
      if (res.status < 500 && res.status !== 429) {
        if (integration) recordFailure(integration, err, Date.now() - started);
        throw err;
      }
      lastErr = err;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
    if (i < attempts - 1) {
      const wait = baseMs * 2 ** i + Math.floor(Math.random() * 150);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  const finalErr = lastErr instanceof Error ? lastErr : new Error("Bayse fetch failed");
  if (integration) recordFailure(integration, finalErr, Date.now() - started);
  throw finalErr;
}
