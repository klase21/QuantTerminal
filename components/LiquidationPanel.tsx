// ======================================================
// components/LiquidationPanel.tsx
// ======================================================

"use client"

import { useLiquidationStore }
  from "@/stores/useLiquidationStore"

export default function LiquidationPanel() {

  const liquidations =
    useLiquidationStore((s) => s.liquidations)

  return (
    <div className="
      bg-zinc-950
      border border-zinc-800
      rounded-2xl
      p-4
      h-full
    ">

      <h2 className="text-xl font-bold mb-4">
        Liquidations
      </h2>

      <div className="space-y-2">

        {liquidations.map((liq, i) => {

          const usd =
            liq.price * liq.quantity

          return (
            <div
              key={i}
              className="
                flex justify-between
                text-sm
              "
            >
              <span
                className={
                  liq.side === "SELL"
                    ? "text-red-400"
                    : "text-green-400"
                }
              >
                {liq.side}
              </span>

              <span>
                ${usd.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}