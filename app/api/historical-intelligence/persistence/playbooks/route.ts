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
  const eventId = searchParams.get("eventId")
  const limit = limitFrom(searchParams)

  if (id) {
    const record = await mockHistoricalPersistenceRepository.playbooks.getById(id)
    if (!record) {
      return NextResponse.json({ ok: false, error: "Playbook record not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true, mode: "persistence-playbook", data: record })
  }

  const data = caseId
    ? await mockHistoricalPersistenceRepository.playbooks.findByCaseId(caseId, { limit })
    : eventId
      ? await mockHistoricalPersistenceRepository.playbooks.findByEventId(eventId, { limit })
      : await mockHistoricalPersistenceRepository.playbooks.list({ limit })

  return NextResponse.json({ ok: true, mode: "persistence-playbooks", data })
}
