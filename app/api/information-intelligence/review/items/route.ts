import { NextResponse } from "next/server"

import { listInformationReviewItems } from "@/core/information-intelligence/informationReviewQueueService"
import type { InformationReviewStatus } from "@/core/information-intelligence/informationReviewQueueTypes"

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = listInformationReviewItems({
    status: (searchParams.get("status") as InformationReviewStatus | null) ?? undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  })

  return NextResponse.json({
    ok: true,
    mode: "information-review-items",
    data,
  })
}

