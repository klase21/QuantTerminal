import { NextResponse } from "next/server"

import { getReplayDecisionJournal } from "@/core/historical-intelligence/replayDecisionJournalEngine"
import type { ReplayDecisionJournalQuery } from "@/core/historical-intelligence/replayDecisionJournalTypes"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query: ReplayDecisionJournalQuery = {
    caseId: searchParams.get("caseId") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
  }
  const data = getReplayDecisionJournal(query)

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        error: "Replay decision journal not found",
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    ok: true,
    mode: "replay-decision-journal",
    data,
  })
}
