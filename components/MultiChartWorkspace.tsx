"use client"

import ChartTile from "@/components/ChartTile"

import {
  useWorkspaceStore,
} from "@/stores/useWorkspaceStore"

const symbols = [
  "btcusdt",
  "ethusdt",
  "solusdt",
  "xrpusdt",
]

export default function MultiChartWorkspace() {

  const {
    charts,
    addChart,
    removeChart,
  } =
    useWorkspaceStore()

  return (
    <div className="space-y-4">

      {/* TOP BAR */}
      <div
        className="
          flex
          items-center
          justify-between
        "
      >

        <div className="text-sm font-semibold">
          Multi-Chart Workspace
        </div>

        <div className="flex gap-2">

          {symbols.map((symbol) => (

            <button
              key={symbol}
              onClick={() =>
                addChart(symbol)
              }
              className="
                px-3
                py-1
                rounded-lg
                border
                border-zinc-700
                bg-zinc-900
                text-xs
                hover:bg-zinc-800
              "
            >
              + {symbol.toUpperCase()}
            </button>

          ))}

        </div>

      </div>

      {/* GRID */}
      <div
        className="
          grid
          grid-cols-2
          gap-4
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
          />

        ))}

      </div>

    </div>
  )
}