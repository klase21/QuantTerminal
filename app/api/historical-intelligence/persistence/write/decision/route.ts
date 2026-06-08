import { NextResponse } from "next/server"

import { createDecision } from "@/core/historical-intelligence/historicalPersistenceWriteService"

export async function POST(request: Request) {
  try {
    const record = await createDecision(await request.json())
    return NextResponse.json({ ok: true, mode: "persistence-write-decision", data: record })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Decision write failed" },
      { status: 400 },
    )
  }
}
