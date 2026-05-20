"use client"

import ChartTile from "@/components/ChartTile"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"

export default function MultiChartWorkspace() {

  const {
    charts,
    removeChart,
    updateTimeframe,
  } = useWorkspaceStore()

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
          />

        ))}

      </div>

    </div>

  )
}