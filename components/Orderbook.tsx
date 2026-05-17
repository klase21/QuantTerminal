"use client"

import { cn } from "@/lib/utils"

interface Level {
  price: number
  quantity: number
}

interface Props {
  bids: Level[]
  asks: Level[]
}

export default function Orderbook({
  bids,
  asks,
}: Props) {
  // =========================
  // cumulative depth
  // =========================

  let cumulativeBid = 0

  const cumulativeBids = bids.map((bid) => {
    cumulativeBid += bid.quantity

    return {
      ...bid,
      total: cumulativeBid,
    }
  })

  let cumulativeAsk = 0

  const cumulativeAsks = asks.map((ask) => {
    cumulativeAsk += ask.quantity

    return {
      ...ask,
      total: cumulativeAsk,
    }
  })

  // =========================
  // max depth
  // =========================

  const maxBidDepth = Math.max(
    ...cumulativeBids.map((b) => b.total),
    1
  )

  const maxAskDepth = Math.max(
    ...cumulativeAsks.map((a) => a.total),
    1
  )

  // =========================
  // spread
  // =========================

  const spread =
    asks[0] && bids[0]
      ? asks[0].price - bids[0].price
      : 0

  // =========================
  // render
  // =========================

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Orderbook
        </h2>

        <div className="text-xs text-zinc-500">
          LIVE
        </div>
      </div>

      {/* COLUMN HEADER */}
      <div className="grid grid-cols-3 text-xs text-zinc-500 mb-2 px-2">
        <div>Price</div>
        <div className="text-right">
          Size
        </div>
        <div className="text-right">
          Total
        </div>
      </div>

      {/* ASKS */}
      <div className="space-y-[2px]">
        {cumulativeAsks
          .slice()
          .reverse()
          .map((ask, idx) => {
            const width =
              (ask.total / maxAskDepth) * 100

            const isWhale =
              ask.quantity >
              cumulativeAsks[0]?.quantity * 3

            return (
              <div
                key={idx}
                className="relative overflow-hidden rounded"
              >
                {/* depth bg */}
                <div
                  className={cn(
                    "absolute right-0 top-0 h-full transition-all duration-100",
                    isWhale
                      ? "bg-red-500/35"
                      : "bg-red-500/15"
                  )}
                  style={{
                    width: `${width}%`,
                  }}
                />

                {/* whale glow */}
                {isWhale && (
                  <div className="absolute inset-0 bg-red-400/5 animate-pulse" />
                )}

                {/* row */}
                <div className="relative z-10 grid grid-cols-3 px-2 py-1 text-sm">
                  <div
                    className={cn(
                      "text-red-400",
                      isWhale &&
                        "font-bold text-red-300"
                    )}
                  >
                    {ask.price.toLocaleString()}
                  </div>

                  <div className="text-right text-zinc-300">
                    {(ask.quantity ?? 0).toFixed(3)}
                  </div>

                  <div className="text-right text-zinc-500">
                    {ask.total.toFixed(2)}
                  </div>
                </div>
              </div>
            )
          })}
      </div>

      {/* MID PRICE */}
      <div className="my-4 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-center">
        <div className="text-xs text-zinc-500">
          Spread
        </div>

        <div className="text-lg font-semibold">
          {spread.toFixed(2)}
        </div>

        <div className="text-xs text-zinc-400 mt-1">
          Mid Price:{" "}
          {asks[0] && bids[0]
            ? (
                (asks[0].price +
                  bids[0].price) /
                2
              ).toLocaleString()
            : "-"}
        </div>
      </div>

      {/* BIDS */}
      <div className="space-y-[2px]">
        {cumulativeBids.map((bid, idx) => {
          const width =
            (bid.total / maxBidDepth) * 100

          const isWhale =
            bid.quantity >
            cumulativeBids[0]?.quantity * 3

          return (
            <div
              key={idx}
              className="relative overflow-hidden rounded"
            >
              {/* depth bg */}
              <div
                className={cn(
                  "absolute left-0 top-0 h-full transition-all duration-100",
                  isWhale
                    ? "bg-green-500/35"
                    : "bg-green-500/15"
                )}
                style={{
                  width: `${width}%`,
                }}
              />

              {/* whale glow */}
              {isWhale && (
                <div className="absolute inset-0 bg-green-400/5 animate-pulse" />
              )}

              {/* row */}
              <div className="relative z-10 grid grid-cols-3 px-2 py-1 text-sm">
                <div
                  className={cn(
                    "text-green-400",
                    isWhale &&
                      "font-bold text-green-300"
                  )}
                >
                  {bid.price.toLocaleString()}
                </div>

                <div className="text-right text-zinc-300">
                  {(bid.quantity ?? 0).toFixed(3)}
                </div>

                <div className="text-right text-zinc-500">
                  {(bid.total ?? 0).toFixed(2)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}