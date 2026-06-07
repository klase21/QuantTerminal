import { NextResponse } from "next/server"

import { getEventMemoryLinker } from "@/core/historical-intelligence/eventMemoryLinkerEngine"
import type { EventMemoryLinkerQuery } from "@/core/historical-intelligence/eventMemoryLinkerTypes"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query: EventMemoryLinkerQuery = {
    caseId: searchParams.get("caseId") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
  }
  const data = getEventMemoryLinker(query)

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        error: "Event memory link not found",
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    ok: true,
    mode: "event-memory-linker",
    data,
  })
}
