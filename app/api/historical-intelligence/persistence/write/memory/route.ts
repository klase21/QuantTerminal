import { NextResponse } from "next/server"

import { createMemory } from "@/core/historical-intelligence/historicalPersistenceWriteService"

export async function POST(request: Request) {
  try {
    const record = await createMemory(await request.json())
    return NextResponse.json({ ok: true, mode: "persistence-write-memory", data: record })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Memory write failed" },
      { status: 400 },
    )
  }
}
