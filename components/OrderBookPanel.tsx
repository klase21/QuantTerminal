// ======================================================
// components/OrderbookPanel.tsx
// ======================================================

"use client"

import useOrderbookStore from "@/stores/useOrderbookStore"

export default function OrderbookPanel() {
  const {
    bids,
    asks,
    spread,
    imbalance,
  } = useOrderbookStore()

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 h-full">

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          Orderbook
        </h2>

        <div className="text-sm text-zinc-400">
          Spread:
          <span className="ml-2 text-white">
            {spread.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-zinc-400 mb-2">
          Imbalance
        </div>

        <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
          <div
            className="bg-green-500 h-full"
            style={{
              width: `${imbalance * 100}%`,
            }}
          />
        </div>

        <div className="mt-1 text-sm">
          {(imbalance * 100).toFixed(1)}%
          Bid Dominance
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">

        {/* BIDS */}
        <div>
          <div className="text-green-400 font-semibold mb-2">
            Bids
          </div>

          <div className="space-y-1">
            {bids.map((bid, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded px-2 py-1 text-sm"
              >
                <div
                  className="absolute left-0 top-0 h-full bg-green-500/20"
                  style={{
                    width: `${Math.min(
                      bid.qty * 2,
                      100
                    )}%`,
                  }}
                />

                <div className="relative flex justify-between">
                  <span>
                    {bid.price.toFixed(2)}
                  </span>

                  <span>
                    {bid.qty.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ASKS */}
        <div>
          <div className="text-red-400 font-semibold mb-2">
            Asks
          </div>

          <div className="space-y-1">
            {asks.map((ask, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded px-2 py-1 text-sm"
              >
                <div
                  className="absolute right-0 top-0 h-full bg-red-500/20"
                  style={{
                    width: `${Math.min(
                      ask.qty * 2,
                      100
                    )}%`,
                  }}
                />

                <div className="relative flex justify-between">
                  <span>
                    {ask.price.toFixed(2)}
                  </span>

                  <span>
                    {ask.qty.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}