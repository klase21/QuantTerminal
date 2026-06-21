import { NextResponse } from "next/server"

import {
  MARKET_MEMORY_TYPES,
  type MarketMemoryType,
} from "@/core/market-memory"
import { productionMarketMemoryCatalog } from "@/lib/market-memory/productionMarketMemoryCatalog"
import {
  aggregateEvidenceValidity,
  createEvidenceValidity,
} from "@/core/evidence-validity"

export const dynamic = "force-dynamic"
export const revalidate = 0

const MEMORY_TYPES = new Set<MarketMemoryType>(MARKET_MEMORY_TYPES)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const memoryId = searchParams.get("memoryId")?.trim()
  const category = searchParams.get("category")?.trim()
  const symbol = searchParams.get("symbol")?.trim()
  if (category && !MEMORY_TYPES.has(category as MarketMemoryType)) {
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      reason: "Unsupported Market Memory category.",
      memories: [],
    }, { status: 400 })
  }

  const status = productionMarketMemoryCatalog.status()
  if (!status.generatedAt) {
    const reason = "Market Memory catalog not generated in this process."
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      reason,
      generatedAt: null,
      memories: [],
      validity: createEvidenceValidity({
        observedAt: null,
        generatedAt: new Date(0).toISOString(),
        coverageStatus: "UNAVAILABLE",
        reason,
      }),
    })
  }

  const memories = memoryId
    ? [productionMarketMemoryCatalog.getById(memoryId)].filter(Boolean)
    : category
      ? productionMarketMemoryCatalog.findByCategory(category as MarketMemoryType)
      : symbol
        ? productionMarketMemoryCatalog.findBySymbol(symbol)
        : []

  const reason = memories.length ? undefined : "No compatible Market Memory found."
  return NextResponse.json({
    ok: memories.length > 0,
    status: memories.length ? "available" : "unavailable",
    reason,
    generatedAt: status.generatedAt,
    memories,
    validity: memories.length
      ? aggregateEvidenceValidity(
          memories.map((memory) => memory!.validity),
          status.generatedAt,
          "Market Memory response uses the most conservative selected-memory validity.",
        )
      : createEvidenceValidity({
          observedAt: null,
          generatedAt: status.generatedAt,
          coverageStatus: "UNAVAILABLE",
          reason,
        }),
  })
}
