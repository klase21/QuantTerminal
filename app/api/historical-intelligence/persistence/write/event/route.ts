import { NextResponse } from "next/server"

import { createEvent } from "@/core/historical-intelligence/historicalPersistenceWriteService"

export async function POST(request: Request) {
  try {
    const record = await createEvent(await request.json())
    return NextResponse.json({ ok: true, mode: "persistence-write-event", data: record })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Event write failed" },
      { status: 400 },
    )
  }
}
