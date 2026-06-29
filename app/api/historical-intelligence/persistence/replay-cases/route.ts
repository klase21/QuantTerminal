import { NextResponse } from "next/server"

import { mockHistoricalPersistenceRepository } from "@/core/historical-intelligence/mockHistoricalPersistenceRepository"
import { enforceNonProductionRouteIsolation } from "@/lib/runtime/nonProductionRouteIsolation"

function limitFrom(searchParams: URLSearchParams) {
  const value = searchParams.get("limit")
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
  const isolationResponse = enforceNonProductionRouteIsolation(request)
  if (isolationResponse) return isolationResponse

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const eventId = searchParams.get("eventId")
  const limit = limitFrom(searchParams)

  if (id) {
    const record = await mockHistoricalPersistenceRepository.replayCases.getById(id)
    if (!record) {
      return NextResponse.json({ ok: false, error: "Replay case record not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true, mode: "persistence-replay-case", data: record })
  }

  const data = eventId
    ? await mockHistoricalPersistenceRepository.replayCases.findByEventId(eventId, { limit })
    : await mockHistoricalPersistenceRepository.replayCases.list({ limit })

  return NextResponse.json({ ok: true, mode: "persistence-replay-cases", data })
}
