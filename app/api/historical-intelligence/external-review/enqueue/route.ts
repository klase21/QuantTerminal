import { NextResponse } from "next/server"

import { enqueueFromAdapterPreview } from "@/core/historical-intelligence/externalEventReviewQueueService"
import type { ExternalEventSourceType } from "@/core/historical-intelligence/externalEventAdapterTypes"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceType?: ExternalEventSourceType
      keyword?: string
      asset?: string
      limit?: number
    }

    if (!body.sourceType) {
      return NextResponse.json({ ok: false, error: "sourceType is required" }, { status: 400 })
    }

    const data = await enqueueFromAdapterPreview(body.sourceType, {
      keyword: body.keyword,
      asset: body.asset,
      limit: body.limit,
    })

    return NextResponse.json({ ok: true, mode: "external-review-enqueue", data })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "External review enqueue failed" },
      { status: 400 },
    )
  }
}
