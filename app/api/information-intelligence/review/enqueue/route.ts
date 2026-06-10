import { NextResponse } from "next/server"

import { enqueueTopScoredItems } from "@/core/information-intelligence/informationReviewQueueService"
import type { InformationSourceProvider } from "@/core/information-intelligence/informationSourceTypes"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      symbol?: string
      provider?: InformationSourceProvider
      narrativeTag?: string
      limit?: number
    }
    const data = enqueueTopScoredItems({
      symbol: body.symbol,
      provider: body.provider,
      narrativeTag: body.narrativeTag,
      limit: body.limit,
    })

    return NextResponse.json({
      ok: true,
      mode: "information-review-enqueue",
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to enqueue information review items",
      },
      { status: 500 },
    )
  }
}

