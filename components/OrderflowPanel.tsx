
"use client"

import dynamic from "next/dynamic"

const TradingViewChart = dynamic(
  () => import("./TradingViewChart"),
  { ssr: false }
)

export default function OrderflowPanel() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 h-[700px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Orderflow Engine</h2>
        <div className="text-xs text-green-400">LIVE</div>
      </div>

      <div className="h-[620px] rounded-xl overflow-hidden border border-zinc-800">
        <TradingViewChart />
      </div>
    </div>
  )
}
