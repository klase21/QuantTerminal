"use client"

import { useMemo } from "react"
import { buildTacticalRoute } from "@/core/tactical/tacticalRoute"
import { useGlobalTacticalContextStore } from "@/stores/useGlobalTacticalContextStore"

export function useTacticalRoute() {
  const primarySymbol = useGlobalTacticalContextStore((state) => state.primarySymbol)
  const timeframe = useGlobalTacticalContextStore((state) => state.timeframe)
  const marketMode = useGlobalTacticalContextStore((state) => state.marketMode)
  const executionStyle = useGlobalTacticalContextStore((state) => state.executionStyle)
  const tacticalState = useGlobalTacticalContextStore((state) => state.tacticalState)
  const attentionMode = useGlobalTacticalContextStore((state) => state.attentionMode)

  return useMemo(
    () =>
      buildTacticalRoute({
        symbol: primarySymbol,
        timeframe,
        marketMode,
        executionStyle,
        tacticalState,
        attentionMode,
      }),
    [primarySymbol, timeframe, marketMode, executionStyle, tacticalState, attentionMode],
  )
}
