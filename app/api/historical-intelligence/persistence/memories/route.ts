import { NextResponse } from "next/server"

import { mockHistoricalPersistenceRepository } from "@/core/historical-intelligence/mockHistoricalPersistenceRepository"

function limitFrom(searchParams: URLSearchParams) {
  const value = searchParams.get("limit")
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const caseId = searchParams.get("caseId")
  const eventId = searchParams.get("eventId")
  const limit = limitFrom(searchParams)

  if (id) {
    const record = await mockHistoricalPersistenceRepository.memories.getById(id)
    if (!record) {
      return NextResponse.json({ ok: false, error: "Memory record not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true, mode: "persistence-memory", data: record })
  }

  const data = caseId
    ? await mockHistoricalPersistenceRepository.memories.findByCaseId(caseId, { limit })
    : eventId
      ? await mockHistoricalPersistenceRepository.memories.findByEventId(eventId, { limit })
      : await mockHistoricalPersistenceRepository.memories.list({ limit })

  return NextResponse.json({ ok: true, mode: "persistence-memories", data })
}
