import { NextResponse } from "next/server"

import { getInformationIntelligenceDigest } from "@/core/information-intelligence/informationScoringEngine"
import type { InformationSourceProvider } from "@/core/information-intelligence/informationSourceTypes"

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = getInformationIntelligenceDigest({
    symbol: searchParams.get("symbol") ?? undefined,
    provider: (searchParams.get("provider") as InformationSourceProvider | null) ?? undefined,
    narrativeTag: searchParams.get("narrativeTag") ?? undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  })

  return NextResponse.json({
    ok: true,
    mode: "information-intelligence-scoring",
    data,
  })
}

