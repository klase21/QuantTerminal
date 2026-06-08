import { NextResponse } from "next/server"

import { createOutcome } from "@/core/historical-intelligence/historicalPersistenceWriteService"

export async function POST(request: Request) {
  try {
    const record = await createOutcome(await request.json())
    return NextResponse.json({ ok: true, mode: "persistence-write-outcome", data: record })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Outcome write failed" },
      { status: 400 },
    )
  }
}
