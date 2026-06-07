"use client"

import { ReactNode } from "react"
import { shouldRouteWidget } from "@/core/focus/symbolContextEngine"
import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"

export default function FocusAwarePanelShell({
  widget,
  children,
}: {
  widget: "FLOW" | "CHARTS" | "ORDERBOOK" | "ALERTS"
  children: ReactNode
}) {
  const { activeSymbol, focusScope } = useFocusRoutingStore()
  const linked = shouldRouteWidget({ scope: focusScope, widget })

  return (
    <div className={linked ? "relative" : "relative opacity-85"}>
      <div className={`mb-2 rounded-2xl border px-3 py-2 text-xs ${
        linked
          ? "border-cyan-400/20 bg-cyan-400/5 text-cyan-100"
          : "border-zinc-800 bg-zinc-950 text-zinc-500"
      }`}>
        {widget} routing: <span className="font-black">{linked ? activeSymbol : "Independent"}</span>
      </div>
      {children}
    </div>
  )
}
