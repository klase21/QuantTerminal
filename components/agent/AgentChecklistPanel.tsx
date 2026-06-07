"use client"

import { CheckCircle2 } from "lucide-react"
import type { RiskRecommendation } from "@/core/agent/tacticalRiskRecommendationEngine"

export default function AgentChecklistPanel({
  risk,
}: {
  risk: RiskRecommendation
}) {
  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        Agent Action Checklist
      </div>

      <div className="grid gap-2 xl:grid-cols-5">
        {risk.checklist.map((item) => (
          <div key={item} className="rounded-2xl border border-zinc-900 bg-black/45 p-3">
            <div className="mb-2 text-cyan-300">
              <CheckCircle2 size={15} />
            </div>
            <div className="text-xs leading-5 text-zinc-300">{item}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
