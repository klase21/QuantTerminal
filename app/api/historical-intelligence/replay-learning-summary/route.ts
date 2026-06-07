import { NextResponse } from "next/server"

import { getReplayLearningSummary } from "@/core/historical-intelligence/replayLearningSummaryEngine"
import type { ReplayLearningSummaryQuery } from "@/core/historical-intelligence/replayLearningSummaryTypes"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query: ReplayLearningSummaryQuery = {
    caseId: searchParams.get("caseId") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
  }
  const data = getReplayLearningSummary(query)

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        error: "Replay learning summary not found",
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    ok: true,
    mode: "replay-learning-summary",
    data,
  })
}
