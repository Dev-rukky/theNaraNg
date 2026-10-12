// app/api/cron/score-predictions/route.ts
// Called on a schedule by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>" automatically when CRON_SECRET is set.
import { NextResponse, type NextRequest } from "next/server";
import { scorePendingPredictions } from "@/lib/nara/scorePredictions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await scorePendingPredictions();
    return NextResponse.json(report);
  } catch (err) {
    console.error("score-predictions failed:", err);
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}