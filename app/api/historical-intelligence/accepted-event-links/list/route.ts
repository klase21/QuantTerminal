import { NextResponse } from "next/server"

import { listAcceptedEventLinks } from "@/core/historical-intelligence/acceptedEventLinkerService"
import type { AcceptedEventLinkType } from "@/core/historical-intelligence/acceptedEventLinkerTypes"

function limitFrom(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = listAcceptedEventLinks({
    sourceEventId: searchParams.get("sourceEventId") ?? undefined,
    targetType: (searchParams.get("targetType") as AcceptedEventLinkType | null) ?? undefined,
    limit: limitFrom(searchParams.get("limit")),
  })

  return NextResponse.json({ ok: true, mode: "accepted-event-links", data })
}
