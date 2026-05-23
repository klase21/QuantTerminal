"use client"

import type { InstitutionalIntelligenceSurface } from "@/core/institutional-intelligence/institutionalTypes"
import { useSafePolling } from "@/hooks/system/useSafePolling"

export function useInstitutionalIntelligenceLayer(refreshMs = 60000) {
  const { data, error, loading, lastUpdatedAt, lastResult } = useSafePolling<InstitutionalIntelligenceSurface>(
    "/api/intelligence/institutional-layer",
    refreshMs,
    { timeoutMs: 9000, retries: 1, label: "Institutional intelligence" },
  )

  return { data, error, loading, lastUpdatedAt, lastResult }
}
