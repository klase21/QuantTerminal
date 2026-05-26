"use client"

import { AlertTriangle } from "lucide-react"
import type { MarketThreatOverlay } from "@/core/market-map/tacticalMarketMapEngine"

const severityTone: Record<MarketThreatOverlay["severity"], string> = {
  HIGH: "border-red-300/40 bg-red-400/10 text-red-200",
  MEDIUM: "border-yellow-300/35 bg-yellow-400/10 text-yellow-200",
  LOW: "border-zinc-600 bg-zinc-900 text-zinc-300",
}

export default function ThreatOverlay({ threats }: { threats: MarketThreatOverlay[] }) {
  return (
    <div className="absolute inset-0">
      {threats.map((threat) => (
        <div
          key={threat.id}
          className="group absolute z-30 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${threat.x}%`, top: `${threat.y}%` }}
        >
          <div className={`grid h-9 w-9 place-items-center rounded-full border backdrop-blur ${severityTone[threat.severity]}`}>
            <AlertTriangle size={15} />
          </div>

          <div className="pointer-events-none absolute left-1/2 top-11 hidden w-[170px] -translate-x-1/2 rounded-xl border border-zinc-800 bg-black/90 p-2 text-xs text-zinc-400 opacity-0 shadow-2xl backdrop-blur transition duration-200 group-hover:opacity-100 lg:block">
            <div className="font-black text-white">{threat.label}</div>
            <div className="mt-1 text-[10px] text-zinc-500">{threat.note}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
