// lib/nara/health.ts
// Server-only Bayse health checks. Replaces health.functions.ts.
// Nothing here checks permissions: callers (the API route and the actions file) do.
import "server-only";

import {
  BAYSE_BASE,
  BAYSE_HEADERS,
  BayseError,
  bayseFetch,
  getIntegrationStatuses,
  recordFailure,
  recordSuccess,
} from "./bayse-client";
import type { BayseHealth, DiagnosticKey, DiagnosticResult, JsonValue } from "./health.shared";

const RELAY_ORIGIN = new URL(BAYSE_BASE).origin;
const SAMPLE_CHARS = 400;

const DIAGNOSTIC_PATHS: Record<DiagnosticKey, string> = {
  root: "/",
  "list-events": "/v1/pm/events?currency=NGN&perPage=3&page=1&status=open",
  "price-history-sample": "/v1/pm/events?currency=NGN&perPage=1&page=1&status=open",
};

/**
 * Cheap ping against the relay root: one request, 5s timeout, recorded under
 * the "health" integration. Only the status code matters, so the body is
 * discarded (the root may not even be JSON). Never throws.
 */
export async function getBayseHealth(): Promise<BayseHealth> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${RELAY_ORIGIN}/`, { headers: BAYSE_HEADERS, signal: ctrl.signal, cache: "no-store" });
    await res.body?.cancel().catch(() => {});
    const latencyMs = Date.now() - started;
    if (res.ok) recordSuccess("health", latencyMs);
    else recordFailure("health", new Error(`Bayse ${res.status}`), latencyMs);
    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      checkedAt: new Date().toISOString(),
      message: res.ok ? "Bayse relay reachable" : `Bayse responded ${res.status}`,
      integrations: getIntegrationStatuses(),
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message = ctrl.signal.aborted ? "Timed out after 5000ms" : err instanceof Error ? err.message : "Network error";
    recordFailure("health", new Error(message), latencyMs);
    return {
      ok: false,
      status: null,
      latencyMs,
      checkedAt: new Date().toISOString(),
      message,
      integrations: getIntegrationStatuses(),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Raw probe of one Bayse endpoint for the diagnostics page. Never throws. */
export async function runDiagnostic(key: DiagnosticKey): Promise<DiagnosticResult> {
  const url = `${RELAY_ORIGIN}${DIAGNOSTIC_PATHS[key]}`;
  const started = Date.now();
  const result = (r: Omit<DiagnosticResult, "key" | "checkedAt">): DiagnosticResult => ({
    key,
    checkedAt: new Date().toISOString(),
    ...r,
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  let res: Response;
  let text: string;
  try {
    res = await fetch(url, { headers: BAYSE_HEADERS, signal: ctrl.signal, cache: "no-store" });
    text = await res.text();
  } catch (err) {
    return result({
      ok: false,
      status: null,
      latencyMs: Date.now() - started,
      url,
      error: ctrl.signal.aborted ? "Timed out after 6000ms" : err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timer); // the old version leaked this timer when fetch failed
  }

  const latencyMs = Date.now() - started;
  let sample: JsonValue = text.slice(0, SAMPLE_CHARS);
  try {
    sample = JSON.parse(text) as JsonValue;
  } catch {
    // not JSON: keep the truncated text
  }

  // Price-history probe: take the first event from the list, then fetch its history.
  if (key === "price-history-sample" && res.ok && sample && typeof sample === "object" && !Array.isArray(sample)) {
    const events = (sample as { events?: { id?: unknown; title?: unknown }[] }).events ?? [];
    const ev = events[0];
    if (typeof ev?.id === "string" && ev.id) {
      const historyPath = `/pm/events/${encodeURIComponent(ev.id)}/price-history?timePeriod=24H&outcome=YES`;
      const historyUrl = `${BAYSE_BASE}${historyPath}`;
      try {
        const ph = await bayseFetch<JsonValue>(historyPath, {
          attempts: 1,
          timeoutMs: 5000,
          integration: "diagnostics",
        });
        return result({
          ok: true,
          status: 200,
          latencyMs: Date.now() - started,
          url: historyUrl,
          sample: { event: { id: ev.id, title: typeof ev.title === "string" ? ev.title : null }, priceHistory: ph },
        });
      } catch (err) {
        return result({
          ok: false,
          status: err instanceof BayseError ? (err.status ?? null) : null,
          latencyMs: Date.now() - started,
          url: historyUrl,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return result({
    ok: res.ok,
    status: res.status,
    latencyMs,
    url,
    sample,
    error: res.ok ? undefined : `HTTP ${res.status}`,
  });
}