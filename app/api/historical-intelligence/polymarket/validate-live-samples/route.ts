import { NextResponse } from "next/server"

import { validatePolymarketLiveSamples } from "@/core/historical-intelligence/polymarketLiveValidationEngine"

function limitFrom(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = await validatePolymarketLiveSamples({
    keyword: searchParams.get("keyword") ?? undefined,
    asset: searchParams.get("asset") ?? undefined,
    limit: limitFrom(searchParams.get("limit")),
  })

  return NextResponse.json({
    ok: true,
    mode: "polymarket-live-sample-validation",
    data,
  })
}
