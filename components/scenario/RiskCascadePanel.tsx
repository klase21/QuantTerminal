"use client"

import type { RiskCascade } from "@/core/scenario/probabilisticScenarioEngine"

const severityTone: Record<RiskCascade["severity"], string> = {
  LOW: "border-zinc-700 bg-zinc-900/60 text-zinc-300",
  MEDIUM: "border-yellow-300/20 bg-yellow-400/5 text-yellow-100",
  HIGH: "border-red-300/20 bg-red-400/5 text-red-100",
}

export default function RiskCascadePanel({ cascades }: { cascades: RiskCascade[] }) {
  return (
    <div className="rounded-3xl border border-red-400/20 bg-red-950/10 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-red-300">
        Risk Cascade Prediction
      </div>

      <div className="space-y-2">
        {cascades.map((cascade) => (
          <div key={cascade.id} className={`rounded-2xl border p-3 ${severityTone[cascade.severity]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">{cascade.condition}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-400">{cascade.impact}</div>
              </div>
              <div className="shrink-0 text-sm font-black">+{cascade.probabilityDelta}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
