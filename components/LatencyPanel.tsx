"use client"

import { useMarketStore } from "@/stores/useMarketStore"

export default function LatencyPanel() {

  const markets =
    useMarketStore(
      (state) => state.tickers
    )

  const rows =
    Object.values(markets)
      .slice(0, 10)

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">

      <h2 className="text-xl font-bold mb-4">
        Exchange Latency
      </h2>

      <div className="space-y-3">

        {rows.map((coin) => (

          <div
            key={coin.symbol}
            className="flex justify-between text-sm"
          >
            <span>
              {coin.symbol}
            </span>

            <span
              className={
                coin.latency < 100
                  ? "text-green-400"
                  : "text-yellow-400"
              }
            >
              {coin.latency}ms
            </span>

          </div>
        ))}

      </div>
    </div>
  )
}