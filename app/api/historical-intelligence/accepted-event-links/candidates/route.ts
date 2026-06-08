import { NextResponse } from "next/server"

import {
  generateLinkCandidatesForAcceptedItem,
  listLinkCandidates,
} from "@/core/historical-intelligence/acceptedEventLinkerService"
import type { AcceptedEventLinkCandidateStatus } from "@/core/historical-intelligence/acceptedEventLinkerTypes"

function limitFrom(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = listLinkCandidates({
    reviewItemId: searchParams.get("reviewItemId") ?? undefined,
    status: (searchParams.get("status") as AcceptedEventLinkCandidateStatus | null) ?? undefined,
    limit: limitFrom(searchParams.get("limit")),
  })

  return NextResponse.json({ ok: true, mode: "accepted-event-link-candidates", data })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { reviewItemId?: string }
    if (!body.reviewItemId) {
      return NextResponse.json({ ok: false, error: "reviewItemId is required" }, { status: 400 })
    }

    const data = await generateLinkCandidatesForAcceptedItem(body.reviewItemId)
    return NextResponse.json({ ok: true, mode: "accepted-event-link-candidate-generation", data })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Accepted event link candidate generation failed" },
      { status: 400 },
    )
  }
}
