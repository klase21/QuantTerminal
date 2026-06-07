import { NextResponse } from "next/server"

import { getPredictionMarketIntelligence } from "@/core/historical-intelligence/predictionMarketEngine"
import type { PredictionMarketCategory, PredictionMarketQuery } from "@/core/historical-intelligence/predictionMarketTypes"

const CATEGORIES = new Set<PredictionMarketCategory>([
  "crypto_policy",
  "macro",
  "regulatory",
  "election",
  "flows",
])

function category(value: string | null): PredictionMarketCategory | undefined {
  if (!value) return undefined
  return CATEGORIES.has(value as PredictionMarketCategory) ? (value as PredictionMarketCategory) : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedCategory = searchParams.get("category")

  if (requestedCategory && !category(requestedCategory)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported prediction market category",
      },
      { status: 400 },
    )
  }

  const query: PredictionMarketQuery = {
    caseId: searchParams.get("caseId") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
    category: category(requestedCategory),
    narrative: searchParams.get("narrative") ?? undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  }

  return NextResponse.json({
    ok: true,
    mode: "prediction-markets",
    data: getPredictionMarketIntelligence(query),
  })
}
