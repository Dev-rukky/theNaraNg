// app/api/landing/route.ts
// Endpoint useLandingData polls for fresh landing-page data.
import { NextResponse } from "next/server";
import { getLandingData } from "@/lib/nara/bayse";

export const dynamic = "force-dynamic";

export async function GET() {
  // getLandingData never throws: it falls back to the last good copy, then to mock data.
  const data = await getLandingData();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}