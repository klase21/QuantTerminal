"use client"

import type { TacticalSectorNode } from "@/core/market-map/tacticalMarketMapEngine"

const stateTone: Record<TacticalSectorNode["state"], string> = {
  ACCUMULATING: "border-emerald-300/40 bg-emerald-400/10 text-emerald-100 shadow-emerald-500/20",
  ACCELERATING: "border-cyan-300/50 bg-cyan-400/10 text-cyan-100 shadow-cyan-500/25",
  EXHAUSTED: "border-yellow-300/45 bg-yellow-400/10 text-yellow-100 shadow-yellow-500/20",
  DEFENSIVE: "border-red-300/40 bg-red-400/10 text-red-100 shadow-red-500/20",
  NEUTRAL: "border-zinc-600 bg-zinc-900/70 text-zinc-200 shadow-zinc-900",
}

export default function SectorPressureNode({ node }: { node: TacticalSectorNode }) {
  const size = 56 + node.dominance * 0.45
  const pulse = node.state === "ACCELERATING" || node.state === "EXHAUSTED"

  return (
    <div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
    >
      <div
        className={`relative grid place-items-center rounded-full border shadow-2xl transition duration-300 hover:scale-110 ${stateTone[node.state]} ${pulse ? "animate-pulse" : ""}`}
        style={{ width: size * 0.92, height: size * 0.92 }}
      >
        <div className="pointer-events-none absolute inset-[-10px] rounded-full border border-white/5" />
        <div className="pointer-events-none absolute inset-[-18px] rounded-full border border-white/5" />

        <div className="text-center">
          <div className="text-sm font-black">{node.label}</div>
          <div className="text-[10px] font-black opacity-70">{node.inflow}</div>
        </div>

        <div
          className="absolute -bottom-2 left-1/2 h-1.5 -translate-x-1/2 overflow-hidden rounded-full bg-black/80"
          style={{ width: Math.max(34, size * 0.62) }}
        >
          <div
            className="h-full rounded-full bg-current opacity-80"
            style={{ width: `${node.pressure}%` }}
          />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-zinc-800 bg-black/70 px-2 py-1 text-center backdrop-blur">
        <div className="text-[9px] font-black uppercase tracking-wide text-zinc-500">{node.state}</div>
        <div className="text-[10px] text-zinc-400">SM {node.smartMoney} · NT {node.narrativeTemp}</div>
      </div>
    </div>
  )
}
