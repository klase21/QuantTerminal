"use client"

import type { ProbabilitySurface } from "@/core/scenario/probabilisticScenarioEngine"

const rows: { key: keyof ProbabilitySurface; label: string; tone: string }[] = [
  { key: "continuation", label: "Continuation", tone: "bg-emerald-300" },
  { key: "reversal", label: "Sweep Reversal", tone: "bg-cyan-300" },
  { key: "fakeBreakout", label: "Fake Breakout", tone: "bg-yellow-300" },
  { key: "riskOff", label: "Risk Off", tone: "bg-red-300" },
  { key: "sweepRisk", label: "Sweep Risk", tone: "bg-purple-300" },
]

export default function ProbabilitySurfacePanel({ surface }: { surface: ProbabilitySurface }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        Tactical Probability Surface
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-zinc-400">{row.label}</span>
              <span className="font-black text-white">{surface[row.key]}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${surface[row.key]}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
