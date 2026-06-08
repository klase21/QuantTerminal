import { NextResponse } from "next/server"

import { getHistoricalScoringResult } from "@/core/historical-intelligence/historicalScoringEngine"

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: "historical-intelligence-scoring",
    data: await getHistoricalScoringResult(),
  })
}
