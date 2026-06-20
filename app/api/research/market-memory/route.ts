import { NextResponse } from "next/server"

import {
  MARKET_MEMORY_TYPES,
  type MarketMemoryType,
} from "@/core/market-memory"
import { productionMarketMemoryCatalog } from "@/lib/market-memory/productionMarketMemoryCatalog"

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
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      reason: "Market Memory catalog not generated in this process.",
      generatedAt: null,
      memories: [],
    })
  }

  const memories = memoryId
    ? [productionMarketMemoryCatalog.getById(memoryId)].filter(Boolean)
    : category
      ? productionMarketMemoryCatalog.findByCategory(category as MarketMemoryType)
      : symbol
        ? productionMarketMemoryCatalog.findBySymbol(symbol)
        : []

  return NextResponse.json({
    ok: memories.length > 0,
    status: memories.length ? "available" : "unavailable",
    reason: memories.length ? undefined : "No compatible Market Memory found.",
    generatedAt: status.generatedAt,
    memories,
  })
}
