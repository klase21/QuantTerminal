"use client"

import type { MarketStructureIntelligenceResponse } from "@/core/market-structure/marketStructureTypes"
import { useSafePolling } from "@/hooks/system/useSafePolling"

export function useMarketStructureIntelligence(intervalMs = 30000) {
  const { data, error, loading, lastResult } = useSafePolling<MarketStructureIntelligenceResponse>(
    "/api/intelligence/market-structure",
    intervalMs,
    { timeoutMs: 9000, retries: 1, label: "market structure" },
  )

  const status = loading ? "loading" : error ? "error" : data?.mode === "partial" ? "partial" : data ? "connected" : "idle"
  return { data, status, error, lastResult }
}
