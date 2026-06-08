import { NextResponse } from "next/server"

import { createReplayCase } from "@/core/historical-intelligence/historicalPersistenceWriteService"

export async function POST(request: Request) {
  try {
    const record = await createReplayCase(await request.json())
    return NextResponse.json({ ok: true, mode: "persistence-write-replay-case", data: record })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Replay case write failed" },
      { status: 400 },
    )
  }
}
