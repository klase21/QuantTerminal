"use client"

import { Brain, Link2 } from "lucide-react"
import { getSymbolContext } from "@/core/focus/symbolContextEngine"
import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"

export default function SymbolContextCard() {
  const { activeSymbol } = useFocusRoutingStore()
  const context = getSymbolContext(activeSymbol)

  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        <Brain size={13} />
        Symbol Intelligence Context
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="text-2xl font-black text-white">{context.symbol}</div>
          <div className="mt-1 text-sm text-zinc-400">{context.narrative}</div>
          <div className="mt-2 text-xs text-zinc-500">
            Role: <span className="font-black text-cyan-100">{context.macroRole}</span>
          </div>
        </div>

        <div className="grid min-w-[260px] gap-2">
          <div className="rounded-2xl border border-zinc-900 bg-black/45 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
              <Link2 size={12} />
              Related
            </div>
            <div className="flex flex-wrap gap-1.5">
              {context.relatedSymbols.map((symbol) => (
                <span key={symbol} className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-black text-zinc-300">
                  {symbol}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/45 p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
              Preferred Panels
            </div>
            <div className="flex flex-wrap gap-1.5">
              {context.preferredPanels.map((panel) => (
                <span key={panel} className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2 py-1 text-[10px] font-black text-cyan-100">
                  {panel}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-2">
        {context.riskNotes.map((note) => (
          <div key={note} className="rounded-2xl border border-yellow-300/10 bg-yellow-400/5 p-3 text-xs leading-5 text-yellow-100/80">
            {note}
          </div>
        ))}
      </div>
    </div>
  )
}
