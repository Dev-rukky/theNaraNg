// app/api/markets/route.ts
// Endpoint the markets page polls for fresh data.
import { NextResponse } from "next/server";
import { getAllMarkets } from "@/lib/nara/bayse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAllMarkets();
    return NextResponse.json(
      { data, fetchedAt: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("GET /api/markets failed:", err);
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}