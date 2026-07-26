export const BAYSE_BASE = "https://relay.bayse.markets/v1";
const BAYSE_ORIGIN = new URL(BAYSE_BASE).origin;

export const BAYSE_HEADERS: Record<string, string> = {
  accept: "application/json",
  "user-agent": "nara.ng/1.0 (+https://nara.ng)",
};

export const BAYSE_DEFAULT_TIMEOUT_MS = 6000;

// Hard ceilings -- no caller-supplied option can push us past these,
// no matter what value gets passed in. This is what prevents a
// misconfigured call site (or a future bug) from turning into a
// retry storm against Bayse.
const MAX_ATTEMPTS = 5;
const MAX_TIMEOUT_MS = 15_000;
const MAX_BACKOFF_MS = 8_000;
const MAX_RETRY_AFTER_MS = 30_000;
const MAX_OVERALL_DEADLINE_MS = 20_000;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10MB -- generous for JSON, guards against runaway bodies

export type IntegrationKey = "list-events" | "price-history" | "health" | "diagnostics";

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
    s = { key, ok: false, lastCheckedAt: new Date(0).toISOString(), consecutiveFailures: 0 };
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
  /** Hard ceiling on total wall-clock time across all attempts. Defaults to MAX_OVERALL_DEADLINE_MS. */
  overallDeadlineMs?: number;
};

/**
 * Resolves a caller-supplied path/URL against BAYSE_BASE.
 *
 * SECURITY: the old implementation did `path.startsWith("http") ? path : ...`,
 * which meant any full URL handed to this function -- from a bug, a bad
 * pagination link, or (worst case) attacker-influenced input -- would be
 * fetched as-is, with our headers, from our server's network. That's a
 * classic SSRF shape. Here, an absolute URL is only honored if it shares
 * Bayse's own origin (e.g. a `next` link Bayse itself returned); anything
 * else is rejected outright rather than silently followed.
 */
function resolveUrl(path: string): URL {
  if (/^https?:\/\//i.test(path)) {
    const u = new URL(path);
    if (u.origin !== BAYSE_ORIGIN) {
      throw new Error(`Refusing to fetch outside ${BAYSE_ORIGIN}: got ${u.origin}`);
    }
    return u;
  }
  return new URL(`${BAYSE_BASE}${path.startsWith("/") ? path : `/${path}`}`);
}

function parseRetryAfterMs(res: Response): number | null {
  const header = res.headers.get("retry-after");
  if (!header) return null;
  const asSeconds = Number(header);
  if (!Number.isNaN(asSeconds)) return Math.max(0, Math.min(asSeconds * 1000, MAX_RETRY_AFTER_MS));
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) return Math.max(0, Math.min(asDate - Date.now(), MAX_RETRY_AFTER_MS));
  return null;
}

function looksTooLarge(res: Response): boolean {
  const len = res.headers.get("content-length");
  if (!len) return false; // not guaranteed present/accurate -- best-effort only
  const n = Number(len);
  return Number.isFinite(n) && n > MAX_RESPONSE_BYTES;
}

export async function bayseFetch<T>(
  path: string,
  {
    attempts = 3,
    baseMs = 250,
    timeoutMs = BAYSE_DEFAULT_TIMEOUT_MS,
    integration = null,
    overallDeadlineMs = MAX_OVERALL_DEADLINE_MS,
  }: BayseFetchOpts = {},
): Promise<T> {
  // Clamp every caller-supplied number to a sane ceiling. No option
  // combination passed by a call site can produce runaway retry
  // behavior against Bayse.
  const safeAttempts = Math.max(1, Math.min(attempts, MAX_ATTEMPTS));
  const safeTimeoutMs = Math.max(500, Math.min(timeoutMs, MAX_TIMEOUT_MS));
  const safeDeadlineMs = Math.max(safeTimeoutMs, Math.min(overallDeadlineMs, MAX_OVERALL_DEADLINE_MS));

  const url = resolveUrl(path);
  const started = Date.now();
  let lastErr: unknown;

  for (let i = 0; i < safeAttempts; i++) {
    if (Date.now() - started >= safeDeadlineMs) {
      lastErr = lastErr ?? new Error("Bayse fetch aborted: overall deadline exceeded");
      break;
    }

    const ctrl = new AbortController();
    const remaining = safeDeadlineMs - (Date.now() - started);
    const attemptTimeout = Math.max(250, Math.min(safeTimeoutMs, remaining));
    const timer = setTimeout(() => ctrl.abort(), attemptTimeout);

    try {
      const res = await fetch(url, { headers: BAYSE_HEADERS, signal: ctrl.signal });
      clearTimeout(timer);

      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(`Bayse returned non-JSON content-type: ${contentType || "unknown"}`);
        }
        if (looksTooLarge(res)) {
          throw new Error(`Bayse response exceeded ${MAX_RESPONSE_BYTES} byte guard`);
        }
        const data = (await res.json()) as T;
        if (integration) recordSuccess(integration, Date.now() - started);
        return data;
      }

      const err = new Error(`Bayse ${res.status} ${res.statusText}`);

      // 4xx (except 429) -> don't retry, these won't succeed on repeat.
      if (res.status < 500 && res.status !== 429) {
        if (integration) recordFailure(integration, err, Date.now() - started);
        throw err;
      }

      // 429 -> honor Retry-After if Bayse sent one; this is what actually
      // prevents us from retrying faster than they're willing to accept,
      // which is the behavior that gets an IP rate-limited or banned.
      lastErr = err;
      if (res.status === 429) {
        const retryAfterMs = parseRetryAfterMs(res);
        if (retryAfterMs !== null && i < safeAttempts - 1) {
          const budget = safeDeadlineMs - (Date.now() - started);
          if (retryAfterMs > budget) break; // honoring it would exceed our deadline -- stop instead of under-waiting
          await new Promise((r) => setTimeout(r, retryAfterMs));
          continue;
        }
      }
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }

    if (i < safeAttempts - 1) {
      const wait = Math.min(baseMs * 2 ** i + Math.floor(Math.random() * 150), MAX_BACKOFF_MS);
      const budget = safeDeadlineMs - (Date.now() - started);
      if (wait > budget) break;
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  const finalErr = lastErr instanceof Error ? lastErr : new Error("Bayse fetch failed");
  if (integration) recordFailure(integration, finalErr, Date.now() - started);
  throw finalErr;
}