"use client"

import { shouldRouteWidget } from "@/core/focus/symbolContextEngine"
import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"

const widgets = ["ORDERBOOK", "FLOW", "CHARTS", "ALERTS"] as const

export default function LinkedRoutingStatus() {
  const { activeSymbol, focusScope } = useFocusRoutingStore()

  return (
    <div className="rounded-3xl border border-zinc-900 bg-black/55 p-3">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
        Widget Routing Status
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {widgets.map((widget) => {
          const linked = shouldRouteWidget({ scope: focusScope, widget })
          return (
            <div
              key={widget}
              className={`rounded-2xl border p-3 ${
                linked
                  ? "border-cyan-400/20 bg-cyan-400/5"
                  : "border-zinc-800 bg-zinc-950/70"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">{widget}</div>
              <div className={`mt-1 text-sm font-black ${linked ? "text-cyan-100" : "text-zinc-500"}`}>
                {linked ? activeSymbol : "Independent"}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
