"use client"

import type { AIIntelligenceLayerSurface } from "@/core/ai-intelligence/aiIntelligenceTypes"
import { useSafePolling } from "@/hooks/system/useSafePolling"

export function useAIIntelligenceLayer(refreshMs = 45000) {
  const { data, error, loading, lastUpdatedAt, lastResult } = useSafePolling<AIIntelligenceLayerSurface>(
    "/api/intelligence/ai-layer",
    refreshMs,
    { timeoutMs: 9000, retries: 1, label: "AI intelligence" },
  )

  return { data, error, loading, lastUpdatedAt, lastResult }
}
