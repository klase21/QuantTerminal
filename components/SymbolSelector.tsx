"use client"

import { tacticalSymbols, useGlobalTacticalContextStore } from "@/stores/useGlobalTacticalContextStore"

export default function SymbolSelector() {
  const primarySymbol = useGlobalTacticalContextStore((s) => s.primarySymbol)
  const setPrimarySymbol = useGlobalTacticalContextStore((s) => s.setPrimarySymbol)

  return (
    <div className="flex flex-wrap gap-2">
      {tacticalSymbols.slice(0, 4).map((symbol) => {
        const active = primarySymbol === symbol
        return (
          <button
            key={symbol}
            type="button"
            onClick={() => setPrimarySymbol(symbol)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              active ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {symbol}
          </button>
        )
      })}
    </div>
  )
}
