"use client"

import { Layers3 } from "lucide-react"
import { type MarketMode, useMarketModeStore } from "@/stores/useMarketModeStore"

const modes: MarketMode[] = ["FUTURES", "SPOT", "HYBRID"]

export default function MarketModeToggle() {
  const { marketMode, setMarketMode } = useMarketModeStore()

  return (
    <div className="rounded-3xl border border-zinc-900 bg-black/70 p-3">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        <Layers3 size={13} />
        Market Mode
      </div>

      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMarketMode(mode)}
            className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${
              marketMode === mode
                ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
