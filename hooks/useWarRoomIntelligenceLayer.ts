"use client"

import type { WarRoomIntelligenceSurface } from "@/core/war-room-intelligence/warRoomTypes"
import { useSafePolling } from "@/hooks/system/useSafePolling"

export function useWarRoomIntelligenceLayer(refreshMs = 45000) {
  const { data, error, loading, lastUpdatedAt, lastResult } = useSafePolling<WarRoomIntelligenceSurface>(
    "/api/intelligence/war-room-layer",
    refreshMs,
    { timeoutMs: 9000, retries: 1, label: "War room intelligence" },
  )

  return { data, error, loading, lastUpdatedAt, lastResult }
}
