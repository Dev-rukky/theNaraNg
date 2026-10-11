// lib/nara/bayse-client.ts
// Low-level HTTP client for the Bayse relay. Server-only.
import "server-only";

export const BAYSE_BASE = "https://relay.bayse.markets/v1";
const BAYSE_ORIGIN = new URL(BAYSE_BASE).origin;

export const BAYSE_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  accept: "application/json",
  "user-agent": "nara.ng/1.0 (+https://nara.ng)",
});

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

/* ================================================== integration status */

export type IntegrationKey = "list-events" | "price-history" | "health" | "diagnostics";

export type IntegrationStatus = {
  key: IntegrationKey;
  ok: boolean;
  lastCheckedAt: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  /** Total time for the call, including any retries. */
  lastLatencyMs?: number;
  consecutiveFailures: number;
};

// In-memory and per server instance: resets on deploy/cold start, and each
// serverless instance keeps its own copy.
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

/** Copies, so callers can't accidentally mutate the live records. */
export function getIntegrationStatuses(): IntegrationStatus[] {
  return Array.from(statuses.values(), (s) => ({ ...s })).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
}

export function getIntegrationStatus(key: IntegrationKey): IntegrationStatus {
  return { ...getOrInit(key) };
}

/* ================================================================ errors */

/** Error from a Bayse call. `retryable: false` stops the retry loop immediately. */
export class BayseError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = true,
  ) {
    super(message);
    this.name = "BayseError";
  }
}

/* =============================================================== helpers */

export type BayseFetchOpts = {
  attempts?: number;
  baseMs?: number;
  timeoutMs?: number;
  /** Integration key to record success/failure under. Pass null to skip tracking. */
  integration?: IntegrationKey | null;
  /** Hard ceiling on total wall-clock time across all attempts. Defaults to MAX_OVERALL_DEADLINE_MS. */
  overallDeadlineMs?: number;
};

/** Clamps to [min, max]; NaN/Infinity fall back to `fallback` instead of breaking the loop. */
function clamp(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(min, Math.min(value, max)) : fallback;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resolves a caller-supplied path/URL against BAYSE_BASE.
 *
 * SECURITY: an absolute URL is only honored if it shares Bayse's own origin
 * (e.g. a `next` link Bayse itself returned); anything else is rejected rather
 * than fetched from our server with our headers (SSRF). The final origin is
 * checked again after resolving, as defense in depth.
 */
function resolveUrl(path: string): URL {
  const url = /^https?:\/\//i.test(path)
    ? new URL(path)
    : new URL(`${BAYSE_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (url.origin !== BAYSE_ORIGIN) {
    throw new BayseError(`Refusing to fetch outside ${BAYSE_ORIGIN}: got ${url.origin}`, undefined, false);
  }
  return url;
}

function parseRetryAfterMs(res: Response): number | null {
  const header = res.headers.get("retry-after");
  if (!header) return null;
  const asSeconds = Number(header);
  if (!Number.isNaN(asSeconds)) return clamp(asSeconds * 1000, 0, MAX_RETRY_AFTER_MS, 0);
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) return clamp(asDate - Date.now(), 0, MAX_RETRY_AFTER_MS, 0);
  return null;
}

/** Frees the connection when we're not going to read the body. */
async function discardBody(res: Response) {
  try {
    await res.body?.cancel();
  } catch {
    // already consumed or closed
  }
}

/**
 * Reads and parses JSON while enforcing the size cap on the actual bytes
 * received. Content-Length alone isn't enough: chunked responses don't send it.
 */
async function readJsonCapped(res: Response): Promise<unknown> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    await discardBody(res);
    throw new BayseError(`Bayse response exceeded ${MAX_RESPONSE_BYTES} byte guard`, res.status, false);
  }
  if (!res.body) return JSON.parse(await res.text());

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      throw new BayseError(`Bayse response exceeded ${MAX_RESPONSE_BYTES} byte guard`, res.status, false);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/* ============================================================== bayseFetch */

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
  // combination passed by a call site can produce runaway retry behavior.
  const safeAttempts = Math.floor(clamp(attempts, 1, MAX_ATTEMPTS, 3));
  const safeBaseMs = clamp(baseMs, 0, MAX_BACKOFF_MS, 250);
  const safeTimeoutMs = clamp(timeoutMs, 500, MAX_TIMEOUT_MS, BAYSE_DEFAULT_TIMEOUT_MS);
  const safeDeadlineMs = Math.max(
    safeTimeoutMs,
    clamp(overallDeadlineMs, 0, MAX_OVERALL_DEADLINE_MS, MAX_OVERALL_DEADLINE_MS),
  );

  const started = Date.now();
  const fail = (err: unknown): never => {
    const finalErr = err instanceof Error ? err : new BayseError("Bayse fetch failed");
    if (integration) recordFailure(integration, finalErr, Date.now() - started);
    throw finalErr;
  };

  let url: URL;
  try {
    url = resolveUrl(path);
  } catch (err) {
    return fail(err);
  }

  let lastErr: unknown;

  for (let i = 0; i < safeAttempts; i++) {
    const remaining = safeDeadlineMs - (Date.now() - started);
    if (remaining <= 0) {
      lastErr ??= new BayseError("Bayse fetch aborted: overall deadline exceeded");
      break;
    }

    const attemptTimeout = Math.max(250, Math.min(safeTimeoutMs, remaining));
    const ctrl = new AbortController();
    // The timer stays armed until the body has been read, so a slow body can't hang past the deadline.
    const timer = setTimeout(() => ctrl.abort(), attemptTimeout);
    let retryAfterMs: number | null = null;

    try {
      // no-store: caching is done by the callers (unstable_cache), never by fetch itself.
      const res = await fetch(url, { headers: BAYSE_HEADERS, signal: ctrl.signal, cache: "no-store" });

      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        if (!/json/i.test(contentType)) {
          await discardBody(res);
          // Retryable: often a transient HTML error/challenge page from a proxy.
          throw new BayseError(`Bayse returned non-JSON content-type: ${contentType || "unknown"}`, res.status);
        }
        const data = (await readJsonCapped(res)) as T;
        if (integration) recordSuccess(integration, Date.now() - started);
        return data;
      }

      await discardBody(res);

      // 4xx (except 429) won't succeed on repeat: stop now.
      if (res.status < 500 && res.status !== 429) {
        throw new BayseError(`Bayse ${res.status} ${res.statusText}`, res.status, false);
      }

      // 429 -> honor Retry-After if Bayse sent one, so we never retry faster
      // than they accept (the behavior that gets an IP rate-limited or banned).
      if (res.status === 429) retryAfterMs = parseRetryAfterMs(res);
      lastErr = new BayseError(`Bayse ${res.status} ${res.statusText}`, res.status);
    } catch (err) {
      if (err instanceof BayseError && !err.retryable) return fail(err);
      lastErr = ctrl.signal.aborted
        ? new BayseError(`Bayse request timed out after ${attemptTimeout}ms`)
        : err;
    } finally {
      clearTimeout(timer);
    }

    if (i === safeAttempts - 1) break;

    const wait =
      retryAfterMs ?? Math.min(safeBaseMs * 2 ** i + Math.floor(Math.random() * 150), MAX_BACKOFF_MS);
    // Honoring the wait would blow the deadline: stop instead of under-waiting.
    if (wait > safeDeadlineMs - (Date.now() - started)) break;
    await sleep(wait);
  }

  return fail(lastErr);
}