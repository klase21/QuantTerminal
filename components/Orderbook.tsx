"use client"

import { useGlobalTacticalContextStore } from "@/stores/useGlobalTacticalContextStore"
import { cn } from "@/lib/utils"

interface Level {
  price: number
  quantity: number
}

interface Props {
  symbol?: string
  bids: Level[]
  asks: Level[]
}


export default function Orderbook({ bids, asks }: Props) {
  const primarySymbol = useGlobalTacticalContextStore((s) => s.primarySymbol)
  const activeSymbol = (primarySymbol || "BTCUSDT").toUpperCase()

  let cumulativeBid = 0
  const cumulativeBids = bids.map((bid) => {
    cumulativeBid += bid.quantity
    return { ...bid, total: cumulativeBid }
  })

  let cumulativeAsk = 0
  const cumulativeAsks = asks.map((ask) => {
    cumulativeAsk += ask.quantity
    return { ...ask, total: cumulativeAsk }
  })

  const maxBidDepth = Math.max(...cumulativeBids.map((b) => b.total), 1)
  const maxAskDepth = Math.max(...cumulativeAsks.map((a) => a.total), 1)

  const spread = asks[0] && bids[0] ? asks[0].price - bids[0].price : 0

  return (
    <div className="h-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-200">Real-time Orderbook</h2>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400">
            Route locked · {activeSymbol}
          </div>
        </div>
        <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
          LIVE
        </div>
      </div>


      <div className="mb-2 grid grid-cols-3 px-2 text-xs text-zinc-500">
        <div>Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Total</div>
      </div>

      <div className="space-y-[2px]">
        {cumulativeAsks.slice().reverse().map((ask, idx) => {
          const width = (ask.total / maxAskDepth) * 100
          const isWhale = ask.quantity > (cumulativeAsks[0]?.quantity || 0) * 3
          return (
            <div key={`ask-${idx}`} className="relative overflow-hidden rounded">
              <div className="absolute inset-y-0 right-0 bg-red-500/10" style={{ width: `${width}%` }} />
              <div className="relative grid grid-cols-3 px-2 py-[3px] text-xs">
                <div className={cn("font-semibold text-red-400", isWhale && "text-red-300")}>{ask.price.toLocaleString()}</div>
                <div className="text-right text-zinc-300">{ask.quantity.toFixed(3)}</div>
                <div className="text-right text-zinc-500">{ask.total.toFixed(3)}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="my-3 rounded-xl border border-zinc-800 bg-black/60 px-3 py-2 text-center text-sm font-black text-zinc-200">
        Spread: {spread.toFixed(2)}
      </div>

      <div className="space-y-[2px]">
        {cumulativeBids.map((bid, idx) => {
          const width = (bid.total / maxBidDepth) * 100
          const isWhale = bid.quantity > (cumulativeBids[0]?.quantity || 0) * 3
          return (
            <div key={`bid-${idx}`} className="relative overflow-hidden rounded">
              <div className="absolute inset-y-0 right-0 bg-green-500/10" style={{ width: `${width}%` }} />
              <div className="relative grid grid-cols-3 px-2 py-[3px] text-xs">
                <div className={cn("font-semibold text-green-400", isWhale && "text-green-300")}>{bid.price.toLocaleString()}</div>
                <div className="text-right text-zinc-300">{bid.quantity.toFixed(3)}</div>
                <div className="text-right text-zinc-500">{bid.total.toFixed(3)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
