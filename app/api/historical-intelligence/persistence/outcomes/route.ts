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
  const caseId = searchParams.get("caseId")
  const limit = limitFrom(searchParams)

  if (id) {
    const record = await mockHistoricalPersistenceRepository.outcomes.getById(id)
    if (!record) {
      return NextResponse.json({ ok: false, error: "Outcome record not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true, mode: "persistence-outcome", data: record })
  }

  const data = caseId
    ? await mockHistoricalPersistenceRepository.outcomes.findByCaseId(caseId, { limit })
    : await mockHistoricalPersistenceRepository.outcomes.list({ limit })

  return NextResponse.json({ ok: true, mode: "persistence-outcomes", data })
}
