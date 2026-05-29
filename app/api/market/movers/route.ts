import { NextResponse } from "next/server"

import { buildFallbackMarketMoversResponse, buildMarketMoversResponse } from "@/lib/market-movers/buildMarketMovers"
import type { BinanceFuturesTicker24h } from "@/lib/market-movers/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BINANCE_USDM_24HR_TICKER_URL = "https://fapi.binance.com/fapi/v1/ticker/24hr"
const FETCH_TIMEOUT_MS = 7000

async function fetchTicker24h() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(BINANCE_USDM_24HR_TICKER_URL, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "QuantTerminal/1.0 Market Movers",
      },
    })

    if (!response.ok) {
      throw new Error(`Binance 24h ticker returned ${response.status}`)
    }

    return response.json() as Promise<BinanceFuturesTicker24h[]>
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(request: Request) {
  try {
    const tickers = await fetchTicker24h()
    const focus = new URL(request.url).searchParams.get("focus")
    return NextResponse.json(buildMarketMoversResponse(tickers, new Date(), focus), {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    return NextResponse.json(
      buildFallbackMarketMoversResponse(error instanceof Error ? error.message : "Unknown market movers scan error"),
      { status: 200 },
    )
  }
}
