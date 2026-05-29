"use client"

import AdvancedFlowSection from "@/components/flow/AdvancedFlowSection"
import TacticalAICopilotPanel from "@/components/copilot/TacticalAICopilotPanel"
import ProbabilisticTacticalEnginePanel from "@/components/scenario/ProbabilisticTacticalEnginePanel"
import TacticalDecisionCompressionPanel from "@/components/decision/TacticalDecisionCompressionPanel"
import ExecutionPlaybookPanel from "@/components/playbook/ExecutionPlaybookPanel"
import TacticalSignalInspector from "@/components/inspector/TacticalSignalInspector"
import PredictiveTradeIntelligencePanel from "@/components/predictive/PredictiveTradeIntelligencePanel"
import AdaptiveIntelligencePanel from "@/components/adaptive/AdaptiveIntelligencePanel"
import CorrelationRegimePanel from "@/components/correlation/CorrelationRegimePanel"
import MacroAwareDecisionPanel from "@/components/correlation/MacroAwareDecisionPanel"
import TacticalAIAgentPanel from "@/components/agent/TacticalAIAgentPanel"
import TacticalAlertPanel from "@/components/alerts/TacticalAlertPanel"
import StatefulTacticalAlertPanel from "@/components/alerts/StatefulTacticalAlertPanel"
import AIDebatePanel from "@/components/debate/AIDebatePanel"
import CrossAssetCorrelationMatrix from "@/components/correlation/CrossAssetCorrelationMatrix"
import LiquidityMapPanel from "@/components/liquidity/LiquidityMapPanel"
import ExecutionReplayPanel from "@/components/replay/ExecutionReplayPanel"
import { useTacticalWorkspaceStore } from "@/stores/useTacticalWorkspaceStore"
import { buildCorrelationRegimeState } from "@/core/correlation/correlationRegimeEngine"
import { buildDualMarketIntelligence, normalizeFlowSnapshot, emptyMarketFlow } from "@/core/dual-market/dualMarketEngine"

type FlowAdvancedWorkspaceProps = {
  flow: any
}

export default function FlowAdvancedWorkspace({ flow }: FlowAdvancedWorkspaceProps) {
  const { preset, openAdvancedSections } = useTacticalWorkspaceStore()

  const show = (id: string) => openAdvancedSections.includes(id as any)

  const macroState = buildCorrelationRegimeState()
  const futuresSnapshot = normalizeFlowSnapshot(flow, "FUTURES", flow?.symbol || "BTCUSDT")
  const spotSnapshot = emptyMarketFlow(flow?.symbol || "BTCUSDT", "SPOT")
  const dualMarketState = buildDualMarketIntelligence({
    symbol: flow?.symbol || "BTCUSDT",
    mode: "HYBRID",
    spot: spotSnapshot,
    futures: futuresSnapshot,
  })

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 rounded-3xl border border-zinc-900 bg-black/85 p-3 backdrop-blur-xl">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
            Advanced Flow Workspace
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Active preset: {preset.replace("_", " ")} · section visibility is saved automatically.
          </div>
        </div>
      </div>

      <AdvancedFlowSection
        title="Tactical AI Agent"
        subtitle="Context builder, decision engine, confidence tree, risk recommendation"
        badge="agent"
        defaultOpen={false}
      >
        <TacticalAIAgentPanel flow={flow} />
      </AdvancedFlowSection>

      <AdvancedFlowSection
        title="Correlation Regime"
        subtitle="Macro-aware risk-on/risk-off state machine"
        badge="macro"
        defaultOpen={false}
      >
        <CorrelationRegimePanel />
        <div className="mt-3">
          <MacroAwareDecisionPanel flow={flow} />
        </div>
      </AdvancedFlowSection>


      <AdvancedFlowSection
        title="Tactical Intelligence"
        subtitle="Alerts, debate system, liquidity map, replay scaffold"
        badge="expansion"
        defaultOpen={false}
      >
        <div className="space-y-3">
          <StatefulTacticalAlertPanel flow={flow} dualMarket={dualMarketState} />
          <AIDebatePanel flow={flow} dualMarket={dualMarketState} macro={macroState} />
          <CrossAssetCorrelationMatrix />
          <LiquidityMapPanel flow={flow} />
          <ExecutionReplayPanel dualMarket={dualMarketState} />
        </div>
      </AdvancedFlowSection>


      {show("decision") ? (
        <AdvancedFlowSection
          title="Decision Compression"
          subtitle="Action / readiness / size / timing"
          badge="default"
          defaultOpen={false}
        >
          <TacticalDecisionCompressionPanel flow={flow} />
        </AdvancedFlowSection>
      ) : null}

      {show("playbook") ? (
        <AdvancedFlowSection
          title="Execution Playbook"
          subtitle="Trigger / invalidation / checklist"
          badge="trade"
          defaultOpen
        >
          <ExecutionPlaybookPanel flow={flow} />
        </AdvancedFlowSection>
      ) : null}

      {show("inspector") ? (
        <AdvancedFlowSection
          title="Signal Inspector"
          subtitle="Priority queue and one-glance tactical decision"
          badge="queue"
          defaultOpen={false}
        >
          <TacticalSignalInspector flow={flow} />
        </AdvancedFlowSection>
      ) : null}

      {show("copilot") ? (
        <AdvancedFlowSection
          title="AI Co-Pilot"
          subtitle="Live reasoning, debate, attention routing"
          badge="AI"
          defaultOpen={false}
        >
          <TacticalAICopilotPanel flow={flow} />
        </AdvancedFlowSection>
      ) : null}

      {show("scenario") ? (
        <AdvancedFlowSection
          title="Probabilistic Scenarios"
          subtitle="Scenario tree, probability surface, risk cascade"
          badge="sim"
          defaultOpen={false}
        >
          <ProbabilisticTacticalEnginePanel flow={flow} />
        </AdvancedFlowSection>
      ) : null}

      {show("predictive") ? (
        <AdvancedFlowSection
          title="Predictive Intelligence"
          subtitle="Predictive trade intelligence and flow forecasts"
          badge="forecast"
          defaultOpen={false}
        >
          <PredictiveTradeIntelligencePanel flow={flow} />
        </AdvancedFlowSection>
      ) : null}

      {show("adaptive") ? (
        <AdvancedFlowSection
          title="Adaptive Intelligence"
          subtitle="MTF fusion, contradiction, confidence decay"
          badge="adaptive"
          defaultOpen={false}
        >
          <AdaptiveIntelligencePanel />
        </AdvancedFlowSection>
      ) : null}
    </div>
  )
}
