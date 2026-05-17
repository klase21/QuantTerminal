"use client"

import {
  Liquidation,
} from "@/hooks/useLiquidationSocket"

interface Props {
  liquidations: Liquidation[]
}

export default function LiquidationFeed({
  liquidations,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 h-[500px] overflow-hidden">

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">
          Liquidation Feed
        </h2>

        <div className="text-xs text-zinc-500">
          Forced Orders
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto h-[430px] pr-2">

        {liquidations.map((liq, idx) => {

          const isLarge =
            liq.value > 100000

          return (
            <div
              key={idx}
              className={`
                rounded-xl p-3 border
                ${
                  liq.side === "LONG"
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-green-500/30 bg-green-500/10"
                }
              `}
            >

              <div className="flex justify-between items-center">

                <div
                  className={`
                    font-bold text-sm
                    ${
                      liq.side === "LONG"
                        ? "text-red-400"
                        : "text-green-400"
                    }
                  `}
                >
                  {liq.side} LIQUIDATED
                </div>

                {isLarge && (
                  <div className="text-yellow-400 text-xs">
                    LARGE
                  </div>
                )}

              </div>

              <div className="mt-2 text-sm text-zinc-300 flex justify-between">

                <span>
                  {liq.symbol}
                </span>

                <span>
                  ${(liq.value / 1000).toFixed(1)}K
                </span>

              </div>

              <div className="mt-1 text-xs text-zinc-500">

                Price:
                {" "}
                ${liq.price.toLocaleString()}

              </div>

            </div>
          )
        })}

      </div>
    </div>
  )
}