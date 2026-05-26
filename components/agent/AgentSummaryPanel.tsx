"use client"

import { Bot, ShieldAlert, Target } from "lucide-react"
import type { AgentDecision } from "@/core/agent/tacticalAgentDecisionEngine"
import type { RiskRecommendation } from "@/core/agent/tacticalRiskRecommendationEngine"

export default function AgentSummaryPanel({
  decision,
  risk,
}: {
  decision: AgentDecision
  risk: RiskRecommendation
}) {
  const tone =
    decision.action === "LONG"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
      : decision.action === "SCALP_ONLY" || decision.action === "SHORT"
        ? "border-red-300/25 bg-red-400/10 text-red-100"
        : decision.action === "NO_TRADE" || decision.action === "REDUCE_RISK"
          ? "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
          : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"

  return (
    <section className={`rounded-[2rem] border p-4 ${tone}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-current/30 bg-black/30">
            <Bot size={22} />
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">
              Tactical AI Agent
            </div>
            <div className="mt-1 text-2xl font-black text-white">
              {decision.headline}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
              {decision.summary}
            </p>
          </div>
        </div>

        <div className="grid min-w-[280px] gap-2">
          <Box label="Action" value={decision.action.replaceAll("_", " ")} />
          <Box label="Confidence" value={`${decision.confidence}% · ${decision.conviction}`} />
          <Box label="Size" value={risk.suggestedSize} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-white">
            <Target size={15} />
            Timing
          </div>
          <div className="text-sm leading-6 text-zinc-300">{risk.timing}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-white">
            <ShieldAlert size={15} />
            Invalidation
          </div>
          <div className="text-sm leading-6 text-zinc-300">{risk.invalidation}</div>
        </div>
      </div>
    </section>
  )
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  )
}
