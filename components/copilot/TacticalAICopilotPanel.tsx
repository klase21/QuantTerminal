"use client"

import { buildTacticalCopilotState } from "@/core/copilot/tacticalCopilotEngine"
import AICopilotHeader from "@/components/copilot/AICopilotHeader"
import TacticalGuidancePanel from "@/components/copilot/TacticalGuidancePanel"
import InternalDebateEngine from "@/components/copilot/InternalDebateEngine"
import ConfidenceShiftPanel from "@/components/copilot/ConfidenceShiftPanel"
import TacticalEscalationFeed from "@/components/copilot/TacticalEscalationFeed"
import AttentionRoutingPanel from "@/components/copilot/AttentionRoutingPanel"
import TacticalCopilotNarrator from "@/components/copilot/TacticalCopilotNarrator"

export default function TacticalAICopilotPanel({
  flow,
}: {
  flow?: any
}) {
  const state = buildTacticalCopilotState({
    buyPressure: Number(flow?.buyPressure ?? flow?.buyRatio ?? 38),
    sellPressure: Number(flow?.sellPressure ?? flow?.sellRatio ?? 62),
    rotationConfidence: 81,
    contradictionPenalty: 14,
  })

  return (
    <div className="space-y-3">
      <AICopilotHeader
        conviction={state.conviction}
        regime={state.regime}
      />

      <TacticalCopilotNarrator text={state.narrator} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <TacticalGuidancePanel guidance={state.guidance} />

          <InternalDebateEngine
            bullCase={state.bullCase}
            bearCase={state.bearCase}
          />

          <ConfidenceShiftPanel shift={state.confidenceShift} />
        </div>

        <div className="space-y-3">
          <AttentionRoutingPanel targets={state.focusTargets} />

          <TacticalEscalationFeed escalation={state.escalation} />
        </div>
      </div>
    </div>
  )
}
