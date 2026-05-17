"use client"

import { Trade } from "@/hooks/useTradeSocket"

interface Props {
  trades: Trade[]
}

export default function TradeTape({
  trades,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 h-[500px] overflow-hidden">

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">
          Trade Tape
        </h2>

        <div className="text-xs text-zinc-500">
          Aggressive Flow
        </div>
      </div>

      <div className="space-y-1 overflow-y-auto h-[430px] pr-2">

        {trades.map((trade, idx) => (
          <div
            key={idx}
            className={`
              flex justify-between items-center
              px-3 py-2 rounded-lg text-sm
              transition-all
              ${
                trade.side === "buy"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }
            `}
          >
            <div className="font-semibold uppercase">
              {trade.side}
            </div>

            <div>
              {trade.qty.toFixed(3)}
            </div>

            <div>
              ${trade.price.toLocaleString()}
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}