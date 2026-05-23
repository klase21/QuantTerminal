"use client"

import type { FuturesIntelligenceResponse } from "@/core/futuresTypes"
import { useSafePolling } from "@/hooks/system/useSafePolling"

type FeedStatus = "idle" | "loading" | "live" | "stale" | "error"

export function useFuturesIntelligenceFeed(intervalMs = 30000) {
  const { data, error, loading, lastResult } = useSafePolling<FuturesIntelligenceResponse>(
    "/api/market/futures-intelligence",
    intervalMs,
    { timeoutMs: 9000, retries: 1, label: "futures intelligence" },
  )

  const status: FeedStatus = loading ? "loading" : error ? "error" : data?.ok ? "live" : data ? "stale" : "idle"
  return { data, status, error: error ?? data?.notes?.[0] ?? null, lastResult }
}
