import { NextResponse } from "next/server"

import { getPredictionMarkets } from "@/lib/data-sources/polymarketClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

function category(title: string) {
  const text = title.toLowerCase()
  if (text.includes("btc") || text.includes("bitcoin")) return "Bitcoin"
  if (text.includes("eth") || text.includes("ethereum")) return "Ethereum"
  if (text.includes("fed") || text.includes("rate")) return "Rates"
  if (text.includes("recession")) return "Macro"
  if (text.includes("inflation")) return "Macro"
  if (text.includes("etf")) return "ETF"
  return "Crypto/Macro"
}

export async function GET() {
  const payload = await getPredictionMarkets()

  return NextResponse.json({
    status: payload.marketEvents.length ? "available" : "unavailable",
    source: payload.source,
    updatedAt: payload.updatedAt,
    markets: payload.marketEvents.map((market, index) => ({
      title: market.title,
      probability: market.probability,
      volume: market.volume,
      liquidity: market.liquidity,
      category: category(market.title),
      attentionRank: index + 1,
    })),
    diagnostics: payload.diagnostics,
  })
}
