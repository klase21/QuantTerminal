"use client"

import MacroHeatmap from "./MacroHeatmap"
import EconomicCalendar from "./EconomicCalendar"
import BTCDXYDivergence from "./BTCDXYDivergence"
import NewsSentimentFeed from "./NewsSentimentFeed"

export default function MacroNewsCorrelation() {
  return (
    <div className="grid gap-4 xl:grid-cols-12">

      <div className="space-y-4 xl:col-span-7">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            Macro Heatmap
          </div>

          <MacroHeatmap />
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            BTC vs DXY Divergence
          </div>

          <BTCDXYDivergence />
        </div>
      </div>

      <div className="space-y-4 xl:col-span-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            Economic Calendar
          </div>

          <EconomicCalendar />
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            News Sentiment Feed
          </div>

          <NewsSentimentFeed />
        </div>
      </div>

    </div>
  )
}
