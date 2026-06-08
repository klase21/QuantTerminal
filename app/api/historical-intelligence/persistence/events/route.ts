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
  const limit = limitFrom(searchParams)

  if (id) {
    const record = await mockHistoricalPersistenceRepository.events.getById(id)
    if (!record) {
      return NextResponse.json({ ok: false, error: "Event record not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true, mode: "persistence-event", data: record })
  }

  const data = caseId
    ? await mockHistoricalPersistenceRepository.events.findByCaseId(caseId, { limit })
    : await mockHistoricalPersistenceRepository.events.list({ limit })

  return NextResponse.json({ ok: true, mode: "persistence-events", data })
}
