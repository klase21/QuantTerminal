import { NextResponse } from "next/server"

import { getReplayExplanation } from "@/core/historical-intelligence/replayExplanationEngine"
import type { ReplayExplanationQuery } from "@/core/historical-intelligence/replayExplanationTypes"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query: ReplayExplanationQuery = {
    caseId: searchParams.get("caseId") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
  }
  const data = getReplayExplanation(query)

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        error: "Replay explanation not found",
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    ok: true,
    mode: "replay-explanation",
    data,
  })
}
