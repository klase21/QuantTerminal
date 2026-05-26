"use client"

import { useState } from "react"
import AdvancedFlowSection from "@/components/flow/AdvancedFlowSection"
import TacticalAICopilotPanel from "@/components/copilot/TacticalAICopilotPanel"
import ProbabilisticTacticalEnginePanel from "@/components/scenario/ProbabilisticTacticalEnginePanel"
import TacticalDecisionCompressionPanel from "@/components/decision/TacticalDecisionCompressionPanel"
import ExecutionPlaybookPanel from "@/components/playbook/ExecutionPlaybookPanel"
import TacticalSignalInspector from "@/components/inspector/TacticalSignalInspector"
import PredictiveTradeIntelligencePanel from "@/components/predictive/PredictiveTradeIntelligencePanel"
import AdaptiveIntelligencePanel from "@/components/adaptive/AdaptiveIntelligencePanel"

type FlowAdvancedWorkspaceProps = {
  flow: any
}

type Preset = "trading" | "analysis" | "full"

const presets: Record<Preset, string[]> = {
  trading: ["decision", "playbook", "inspector"],
  analysis: ["copilot", "scenario", "predictive"],
  full: ["copilot", "scenario", "decision", "playbook", "inspector", "predictive", "adaptive"],
}

export default function FlowAdvancedWorkspace({ flow }: FlowAdvancedWorkspaceProps) {
  const [preset, setPreset] = useState<Preset>("trading")
  const visible = presets[preset]

  const show = (id: string) => visible.includes(id)

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 rounded-3xl border border-zinc-900 bg-black/85 p-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
              Advanced Flow Workspace
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              Toggle only what you need during live trading.
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["trading", "analysis", "full"] as Preset[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPreset(item)}
                className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${
                  preset === item
                    ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
                    : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {show("decision") ? (
        <AdvancedFlowSection
          title="Decision Compression"
          subtitle="Action / readiness / size / timing"
          badge="default"
          defaultOpen
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
          defaultOpen={preset === "analysis"}
        >
          <TacticalAICopilotPanel flow={flow} />
        </AdvancedFlowSection>
      ) : null}

      {show("scenario") ? (
        <AdvancedFlowSection
          title="Probabilistic Scenarios"
          subtitle="Scenario tree, probability surface, risk cascade"
          badge="sim"
          defaultOpen={preset === "analysis"}
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
