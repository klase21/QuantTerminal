import { NextResponse } from "next/server"

import {
  MARKET_MEMORY_TYPES,
  type MarketMemoryType,
} from "@/core/market-memory"
import { productionMarketMemoryCatalog } from "@/lib/market-memory/productionMarketMemoryCatalog"
import { durableMarketMemoryReader } from "@/lib/market-memory/durableMarketMemoryReader"
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
  const exchange = searchParams.get("exchange")?.trim()
  const limitValue = Number(searchParams.get("limit"))
  const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : undefined
  if (category && !MEMORY_TYPES.has(category as MarketMemoryType)) {
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      reason: "Unsupported Market Memory category.",
      memories: [],
    }, { status: 400 })
  }

  const durable = await durableMarketMemoryReader.read({
    memoryId,
    symbol,
    exchange,
    memoryType: category as MarketMemoryType | undefined,
    limit,
  })
  if (durable.ok) {
    return NextResponse.json({
      ok: true,
      status: "available",
      generatedAt: durable.generatedAt,
      memories: durable.memories,
      source: durable.source,
      validity: aggregateEvidenceValidity(
        durable.memories.map((memory) => memory.validity),
        durable.generatedAt,
        "Market Memory response uses durable prepared artifacts.",
      ),
    })
  }

  const processStatus = productionMarketMemoryCatalog.status()
  const processMemories = memoryId
    ? [productionMarketMemoryCatalog.getById(memoryId)].filter(Boolean)
    : category
      ? productionMarketMemoryCatalog.findByCategory(category as MarketMemoryType)
      : symbol
        ? productionMarketMemoryCatalog.findBySymbol(symbol)
        : []
  const memories = processMemories.filter((memory) => (
    !exchange
    || (memory?.exchanges ?? []).some((candidate) => (
      candidate.toLowerCase() === exchange.toLowerCase()
    ))
  ))

  if (memories.length && processStatus.generatedAt) {
    return NextResponse.json({
      ok: true,
      status: "available",
      generatedAt: processStatus.generatedAt,
      memories,
      source: "process-local-fallback",
      validity: aggregateEvidenceValidity(
        memories.map((memory) => memory!.validity),
        processStatus.generatedAt,
        "Market Memory response uses the process-local fallback catalog.",
      ),
    })
  }

  const reason = durable.state === "unavailable"
    ? durable.reason
    : symbol
      ? "Market Memory artifacts are unavailable for the selected symbol."
      : "No durable Market Memory exists for this investigation."
  return NextResponse.json({
    ok: false,
    status: "unavailable",
    reason,
    generatedAt: null,
    memories: [],
    source: durable.source,
    validity: createEvidenceValidity({
      observedAt: null,
      generatedAt: new Date(0).toISOString(),
      coverageStatus: "UNAVAILABLE",
      reason,
    }),
  })
}
