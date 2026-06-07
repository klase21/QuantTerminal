"use client"

import { useEffect, useMemo, useState } from "react"

import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"

import { formatChartCrosshairTime, formatChartTimeTick } from "@/lib/chartTimeFormatter";
import ChartTile from "@/components/ChartTile"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"
import MiniTimeAxis from "@/components/charts/MiniTimeAxis";
import AdvancedChartModal from "@/components/charts/AdvancedChartModal"

export default function MultiChartWorkspace() {
  const { activeSymbol, focusScope } = useFocusRoutingStore()
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null)

  const {
    charts,
    removeChart,
    updateChart,
    updateTimeframe,
  } = useWorkspaceStore()

  const expandedChart = useMemo(
    () => charts.find((chart) => chart.id === expandedChartId) ?? null,
    [charts, expandedChartId]
  )

  useEffect(() => {
    const primaryChart = charts[0]
    if (!primaryChart || !activeSymbol) return

    const normalizedFocusSymbol = activeSymbol.toUpperCase()

    if (primaryChart.symbol.toUpperCase() !== normalizedFocusSymbol) {
      updateChart(primaryChart.id, { symbol: normalizedFocusSymbol })
    }

    charts
      .slice(1)
      .filter((chart) => chart.symbol.toUpperCase() === normalizedFocusSymbol)
      .forEach((chart) => removeChart(chart.id))
  }, [activeSymbol, charts, updateChart, removeChart])

  return (

    <div
      className="
        flex
        flex-col
        h-full
        min-h-0
        gap-4
      "
    >

      <div
        className="
          flex
          items-center
          justify-between
          shrink-0
        "
      >

        <div
          className="
            mt-1
            text-lg
            font-semibold
            text-zinc-500
          "
        >
          Multi-Chart Workspace
          <span className="ml-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-100">
            Focus {activeSymbol}
          </span>
        </div>

      </div>

      <div
        className="
          grid
          flex-1
          min-h-0
          grid-cols-1
          gap-4
          overflow-auto
          md:grid-cols-2
          2xl:grid-cols-3
        "
      >

        {charts.map((chart) => (

          <ChartTile
            key={chart.id}
            id={chart.id}
            symbol={chart.symbol}
            timeframe={chart.timeframe}
            onRemove={() =>
              removeChart(chart.id)
            }
            onTimeframeChange={(
              id,
              timeframe
            ) =>
              updateTimeframe(
                id,
                timeframe
              )
            }
            onOpen={() => setExpandedChartId(chart.id)}
          />

        ))}

      </div>

      {expandedChart && (
        <AdvancedChartModal
          symbol={expandedChart.symbol}
          timeframe={expandedChart.timeframe}
          onClose={() => setExpandedChartId(null)}
        />
      )}

    </div>

  )
}