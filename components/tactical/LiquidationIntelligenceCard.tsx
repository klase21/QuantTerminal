"use client"

import { Waves } from "lucide-react"
import type { LiquidationIntelligenceV2 } from "@/lib/tactical/liquidationIntelligenceV2"

export default function LiquidationIntelligenceCard({ liquidation }: { liquidation: LiquidationIntelligenceV2 }) {
  const tone =
    liquidation.pressure === "HIGH"
      ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
      : liquidation.pressure === "MEDIUM"
        ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
        : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"

  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
            <Waves className="h-3.5 w-3.5" />
            Liquidation Intelligence
          </div>
          <div className="mt-2 text-xl font-black text-white">{liquidation.pressure} PRESSURE</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${tone}`}>
          Sweep {liquidation.sweepProbability}%
        </div>
      </div>

      <div className="mt-3 text-sm font-semibold leading-6 text-zinc-300">{liquidation.clusterRead}</div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs font-bold leading-5 text-zinc-400">
        {liquidation.tacticalRisk}
      </div>
      <div className="mt-2 text-xs font-semibold leading-5 text-cyan-200">{liquidation.executionGuidance}</div>
    </div>
  )
}
