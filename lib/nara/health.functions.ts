"use server";

import {
  BAYSE_BASE,
  BAYSE_HEADERS,
  bayseFetch,
  getIntegrationStatuses,
  recordFailure,
  recordSuccess,
  type IntegrationStatus,
} from "./bayse-client";

export type BayseHealth = {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  checkedAt: string;
  message: string;
  integrations: IntegrationStatus[];
};

/**
 * Lightweight ping against Bayse relay root (returns `{status:"ok"}` cheaply).
 * Used by the dashboard topbar badge — keep cost low.
 */
export async function getBayseHealth(): Promise<BayseHealth> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${BAYSE_BASE.replace(/\/v1$/, "")}/`, {
      headers: BAYSE_HEADERS,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - started;
    const ok = res.ok;
    
    if (ok) recordSuccess("health", latencyMs);
    else recordFailure("health", new Error(`Bayse ${res.status}`), latencyMs);
    
    return {
      ok,
      status: res.status,
      latencyMs,
      checkedAt: new Date().toISOString(),
      message: ok ? "Bayse relay reachable" : `Bayse responded ${res.status}`,
      integrations: getIntegrationStatuses(),
    };
  } catch (err) {
    clearTimeout(timer);
    const latencyMs = Date.now() - started;
    recordFailure("health", err, latencyMs);
    return {
      ok: false,
      status: null,
      latencyMs,
      checkedAt: new Date().toISOString(),
      message: err instanceof Error ? err.message : "Network error",
      integrations: getIntegrationStatuses(),
    };
  }
}

// ---- Diagnostics ----

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type DiagnosticKey = "root" | "list-events" | "price-history-sample";

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

const DIAGNOSTIC_TARGETS: Record<DiagnosticKey, { label: string; path: string }> = {
  root: { label: "Relay root", path: "/" },
  "list-events": {
    label: "List NGN events",
    path: "/v1/pm/events?currency=NGN&perPage=3&page=1&status=open",
  },
  "price-history-sample": {
    label: "Price history (first event)",
    path: "/v1/pm/events?currency=NGN&perPage=1&page=1&status=open",
  },
};

export async function testBayseEndpoint(data: { key: DiagnosticKey }): Promise<DiagnosticResult> {
  if (!data || !(data.key in DIAGNOSTIC_TARGETS)) {
    throw new Error("Unknown diagnostic key");
  }

  const target = DIAGNOSTIC_TARGETS[data.key];
  const base = BAYSE_BASE.replace(/\/v1$/, "");
  const url = `${base}${target.path}`;
  const started = Date.now();
  
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { headers: BAYSE_HEADERS, signal: ctrl.signal });
    clearTimeout(timer);
    
    const latencyMs = Date.now() - started;
    const text = await res.text();
    let sample: JsonValue = text.slice(0, 400);
    
    try {
      sample = JSON.parse(text) as JsonValue;
    } catch {
      /* keep as text */
    }

    // If this is the price-history-sample probe, chain a second call.
    if (data.key === "price-history-sample" && res.ok && typeof sample === "object" && sample) {
      const events = (sample as { events?: { id?: string; title?: string }[] }).events ?? [];
      const ev = events[0];
      if (ev?.id) {
        const phStart = Date.now();
        try {
          const ph = (await bayseFetch<JsonValue>(
            `/pm/events/${ev.id}/price-history?timePeriod=24H&outcome=YES`,
            { attempts: 1, timeoutMs: 5000, integration: "diagnostics" },
          )) as JsonValue;
          
          return {
            key: data.key,
            ok: true,
            status: 200,
            latencyMs: Date.now() - started,
            checkedAt: new Date().toISOString(),
            url: `${base}/v1/pm/events/${ev.id}/price-history?timePeriod=24H&outcome=YES`,
            sample: { event: { id: ev.id, title: ev.title ?? null }, priceHistory: ph },
          };
        } catch (err) {
          return {
            key: data.key,
            ok: false,
            status: null,
            latencyMs: Date.now() - phStart,
            checkedAt: new Date().toISOString(),
            url: `${base}/v1/pm/events/${ev.id}/price-history?timePeriod=24H&outcome=YES`,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }
    }

    return {
      key: data.key,
      ok: res.ok,
      status: res.status,
      latencyMs,
      checkedAt: new Date().toISOString(),
      url,
      sample,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      key: data.key,
      ok: false,
      status: null,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const DIAGNOSTIC_LABELS: Record<DiagnosticKey, string> = Object.fromEntries(
  Object.entries(DIAGNOSTIC_TARGETS).map(([k, v]) => [k, v.label]),
) as Record<DiagnosticKey, string>;