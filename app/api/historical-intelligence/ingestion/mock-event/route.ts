import { NextResponse } from "next/server"

import { ingestMockHistoricalEvent } from "@/core/historical-intelligence/historicalEventIngestionService"
import type { HistoricalRawMockEvent } from "@/core/historical-intelligence/historicalEventIngestionTypes"

const DEFAULT_EVENT: HistoricalRawMockEvent = {
  kind: "cpi",
  symbol: "BTCUSDT",
  title: "Mock CPI upside surprise",
  summary: "Mock CPI event used to test Historical Intelligence ingestion.",
  value: 72,
  tags: ["macro", "inflation", "mock_ingestion"],
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => DEFAULT_EVENT)) as Partial<HistoricalRawMockEvent>
    const raw: HistoricalRawMockEvent = {
      ...DEFAULT_EVENT,
      ...body,
      kind: body.kind ?? DEFAULT_EVENT.kind,
    }
    const data = await ingestMockHistoricalEvent(raw)
    return NextResponse.json({ ok: true, mode: "mock-event-ingestion", data })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Mock event ingestion failed" },
      { status: 400 },
    )
  }
}
