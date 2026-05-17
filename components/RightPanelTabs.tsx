"use client"

import type { Liquidation }
  from "@/hooks/useLiquidationSocket"

import type { LiquidityEvent }
  from "@/hooks/useLiquidityEvents"

// ======================================================
// HEATMAP
// ======================================================
import type {
  HeatmapSnapshot,
} from "@/hooks/useHeatmapHistory"

// ======================================================
// PROPS
// ======================================================

interface Props {

  liquidityEvents:
    LiquidityEvent[]

  liquidations:
    Liquidation[]

  heatmapHistory:
    HeatmapSnapshot[]

}

// ======================================================
// COMPONENT
// ======================================================

export default function RightPanelTabs({

  liquidityEvents,

  liquidations,

  heatmapHistory,

}: Props) {

  return (

    <div
      className="
        flex
        flex-col
        gap-4
      "
    >

      {/* YOUR UI */}

    </div>

  )

}