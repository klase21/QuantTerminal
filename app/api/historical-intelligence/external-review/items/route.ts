import { NextResponse } from "next/server"

import { listReviewItems } from "@/core/historical-intelligence/externalEventReviewQueueService"
import type { ExternalEventSourceType } from "@/core/historical-intelligence/externalEventAdapterTypes"
import type { ExternalEventReviewStatus } from "@/core/historical-intelligence/externalEventReviewQueueTypes"

function limitFrom(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = listReviewItems({
    status: (searchParams.get("status") as ExternalEventReviewStatus | null) ?? undefined,
    sourceType: (searchParams.get("sourceType") as ExternalEventSourceType | null) ?? undefined,
    limit: limitFrom(searchParams.get("limit")),
  })

  return NextResponse.json({ ok: true, mode: "external-review-items", data })
}
