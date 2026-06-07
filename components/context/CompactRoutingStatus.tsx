"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { useTacticalRoute } from "@/hooks/tactical/useTacticalRoute"

export default function CompactRoutingStatus() {
  const [open, setOpen] = useState(false)
  const route = useTacticalRoute()

  return (
    <section className="rounded-3xl border border-zinc-900 bg-black/45">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          <div>
            <div className="text-sm font-black text-white">
              {route.symbol} · {route.marketMode} · {route.timeframe} · {route.executionStyle.replace("_", " ")}
            </div>
            <div className="text-xs text-zinc-500">
              Tactical state: {route.tacticalState.replaceAll("_", " ")}
            </div>
          </div>
        </div>

        <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase text-cyan-100">
          Routing Synced
        </div>
      </button>

      {open ? (
        <div className="grid gap-2 border-t border-zinc-900 p-3 sm:grid-cols-4">
          {["Orderbook", "Flow", "Footprint", "AI Agent"].map((item) => (
            <div key={item} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">{item}</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{route.symbol}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
