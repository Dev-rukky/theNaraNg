// app/api/health/route.ts
// Bayse health for the admin badge. Admins only: everyone else gets a 404,
// so the endpoint doesn't even reveal that it exists.
import { NextResponse } from "next/server";
import { getIsAdmin } from "@/lib/auth/isAdmin";
import { getBayseHealth } from "@/lib/nara/health";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getIsAdmin())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const health = await getBayseHealth();
  return NextResponse.json(health, { headers: { "Cache-Control": "no-store" } });
}