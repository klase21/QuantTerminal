"use client"

import { Link2 } from "lucide-react"
import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"
import { shouldRouteWidget } from "@/core/focus/symbolContextEngine"

export default function FocusLinkedStateCard() {
  const { activeSymbol, focusScope } = useFocusRoutingStore()

  return (
    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
        <Link2 size={13} />
        Linked Workspace State
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-900 bg-black/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Orderbook
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {shouldRouteWidget({ scope: focusScope, widget: "ORDERBOOK" })
              ? activeSymbol
              : "Independent"}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-black/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Flow
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {shouldRouteWidget({ scope: focusScope, widget: "FLOW" })
              ? activeSymbol
              : "Independent"}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-black/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Charts
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {shouldRouteWidget({ scope: focusScope, widget: "CHARTS" })
              ? activeSymbol
              : "Independent"}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-black/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Alerts
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {shouldRouteWidget({ scope: focusScope, widget: "ALERTS" })
              ? activeSymbol
              : "Independent"}
          </div>
        </div>
      </div>
    </div>
  )
}
