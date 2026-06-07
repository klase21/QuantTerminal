"use client"

import { ShieldAlert } from "lucide-react"
import type { ExecutionRiskSummary } from "@/lib/tactical/executionRiskEngine"

const toneByLevel = {
  LOW: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
  MODERATE: "border-amber-300/20 bg-amber-400/10 text-amber-100",
  ELEVATED: "border-orange-300/20 bg-orange-400/10 text-orange-100",
  HIGH: "border-rose-300/25 bg-rose-400/10 text-rose-100",
}

export default function ExecutionRiskSummaryCard({ risk }: { risk: ExecutionRiskSummary }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-rose-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Execution Risk
          </div>
          <div className="mt-2 text-xl font-black text-white">{risk.headline}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${toneByLevel[risk.level]}`}>
          {risk.level} · {risk.score}
        </div>
      </div>

      <div className="mt-3 text-sm font-semibold leading-6 text-zinc-300">{risk.action}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {risk.reasons.map((reason) => (
          <span key={reason} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            {reason}
          </span>
        ))}
      </div>
    </div>
  )
}
