// lib/nara/health.actions.ts
// Server Actions for the diagnostics page. Server Actions are public endpoints,
// so every one checks admin status on the server before doing anything.
"use server";

import { getIsAdmin } from "@/lib/auth/isAdmin";
import { runDiagnostic } from "./health";
import { isDiagnosticKey, type DiagnosticResult } from "./health.shared";

export async function testBayseEndpoint(data: { key: unknown }): Promise<DiagnosticResult> {
  if (!(await getIsAdmin())) throw new Error("Not authorised");
  if (!isDiagnosticKey(data?.key)) throw new Error("Unknown diagnostic key");
  return runDiagnostic(data.key);
}