"use client"

import { useSafePolling } from "@/hooks/system/useSafePolling"
import type { MarketMoversResponse } from "@/lib/market-movers/types"

function buildMarketMoversUrl(focusSymbol?: string | null) {
  const symbol = focusSymbol?.trim().toUpperCase()
  if (!symbol) return "/api/market/movers"
  return `/api/market/movers?focus=${encodeURIComponent(symbol)}`
}

export function useMarketMovers(enabled = true, focusSymbol?: string | null) {
  return useSafePolling<MarketMoversResponse>(buildMarketMoversUrl(focusSymbol), 60000, {
    timeoutMs: 9000,
    retries: 1,
    label: "market-movers",
    enabled,
  })
}
