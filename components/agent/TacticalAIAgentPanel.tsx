"use client"

import { buildTacticalAgentContext } from "@/core/agent/tacticalContextBuilder"
import { buildAgentDecision } from "@/core/agent/tacticalAgentDecisionEngine"
import { buildRiskRecommendation } from "@/core/agent/tacticalRiskRecommendationEngine"
import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"
import AgentSummaryPanel from "@/components/agent/AgentSummaryPanel"
import ConfidenceTreePanel from "@/components/agent/ConfidenceTreePanel"
import AgentChecklistPanel from "@/components/agent/AgentChecklistPanel"
import TacticalMemoryPanel from "@/components/agent/TacticalMemoryPanel"

export default function TacticalAIAgentPanel({
  symbol,
  flow,
  spotFlow,
  futuresFlow,
}: {
  symbol?: string
  flow?: any
  spotFlow?: any
  futuresFlow?: any
}) {
  const { activeSymbol, focusScope } = useFocusRoutingStore()

  const context = buildTacticalAgentContext({
    symbol: symbol || activeSymbol,
    flow,
    spotFlow,
    futuresFlow,
    focusTarget: activeSymbol,
    focusScope,
  })

  const decision = buildAgentDecision(context)
  const risk = buildRiskRecommendation(decision, context)

  return (
    <div className="space-y-3">
      <AgentSummaryPanel decision={decision} risk={risk} />
      <AgentChecklistPanel risk={risk} />
      <ConfidenceTreePanel factors={decision.confidenceTree} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-zinc-900 bg-black/50 p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
            Agent Context
          </div>

          <div className="grid gap-2 xl:grid-cols-2">
            <ContextBox label="Symbol" value={context.symbol} />
            <ContextBox label="Macro" value={context.macro.regime.replaceAll("_", " ")} />
            <ContextBox label="Scenario" value={`${context.scenario.topProbability}% · ${context.scenario.topScenario}`} />
            <ContextBox label="Dual Market" value={context.dualMarket.summary} />
          </div>
        </div>

        <TacticalMemoryPanel />
      </div>
    </div>
  )
}

function ContextBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-black leading-5 text-white">{value}</div>
    </div>
  )
}
