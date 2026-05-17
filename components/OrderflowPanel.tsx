
export default function OrderflowPanel() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 h-[700px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Orderflow Engine</h2>
        <div className="text-xs text-green-400">LIVE</div>
      </div>

      <div className="h-full rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-zinc-500">
        TradingView / Heatmap / Liquidation Layers
      </div>
    </div>
  )
}
