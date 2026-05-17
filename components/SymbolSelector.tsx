"use client"

import { useMarketStore } from "@/stores/useMarketStore"

const symbols = [
  "btcusdt",
  "ethusdt",
  "solusdt",
  "bnbusdt",
]

export default function SymbolSelector() {
  const selectedSymbol =
    useMarketStore(
      (s) => s.selectedSymbol
    )

  const setSelectedSymbol =
    useMarketStore(
      (s) => s.setSelectedSymbol
    )

  return (
    <div className="flex gap-2 flex-wrap">
      {symbols.map((symbol) => {
        const active =
          selectedSymbol === symbol

        return (
          <button
            key={symbol}
            onClick={() =>
              setSelectedSymbol(symbol)
            }
            className={`
              px-4 py-2 rounded-xl text-sm font-medium transition
              ${
                active
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }
            `}
          >
            {symbol.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}