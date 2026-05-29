import { NextResponse } from "next/server"

import { buildAIIntelligenceLayer } from "@/core/ai-intelligence/buildAIIntelligenceLayer"
import type { MarketStructureIntelligenceResponse } from "@/core/market-structure/marketStructureTypes"

export const dynamic = "force-dynamic"
export const revalidate = 0

const MARKET_STRUCTURE_URL = "/api/intelligence/market-structure"
const FETCH_TIMEOUT_MS = 9000

function absoluteUrl(request: Request, path: string) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}${path}`
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "QuantTerminal/1.0 AI Intelligence",
      },
    })
    if (!response.ok) throw new Error(`${url} returned ${response.status}`)
    return response.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(request: Request) {
  try {
    const marketStructure = await fetchJson<MarketStructureIntelligenceResponse>(absoluteUrl(request, MARKET_STRUCTURE_URL))
    return NextResponse.json(buildAIIntelligenceLayer(marketStructure))
  } catch (error) {
    const fallback = buildAIIntelligenceLayer(null)
    return NextResponse.json({
      ...fallback,
      notes: [error instanceof Error ? error.message : "Unknown AI intelligence layer error"],
    })
  }
}
