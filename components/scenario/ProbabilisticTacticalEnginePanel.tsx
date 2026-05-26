"use client"

import { buildProbabilisticScenarioState } from "@/core/scenario/probabilisticScenarioEngine"
import ScenarioNarratorCard from "@/components/scenario/ScenarioNarratorCard"
import ScenarioTreePanel from "@/components/scenario/ScenarioTreePanel"
import ProbabilitySurfacePanel from "@/components/scenario/ProbabilitySurfacePanel"
import RiskCascadePanel from "@/components/scenario/RiskCascadePanel"
import ScenarioTimelineProjection from "@/components/scenario/ScenarioTimelineProjection"
import ScenarioGhostMap from "@/components/scenario/ScenarioGhostMap"

export default function ProbabilisticTacticalEnginePanel({ flow }: { flow?: any }) {
  const state = buildProbabilisticScenarioState({
    buyPressure: Number(flow?.buyPressure ?? flow?.buyRatio ?? 38),
    sellPressure: Number(flow?.sellPressure ?? flow?.sellRatio ?? 62),
    rotationConfidence: 81,
    liquidityRisk: 72,
    contradictionPenalty: 14,
  })

  return (
    <div className="space-y-3">
      <ScenarioNarratorCard text={state.narrator} collapseRisk={state.confidenceCollapseRisk} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <ScenarioTreePanel branches={state.branches} />
          <ScenarioGhostMap branches={state.branches} />
        </div>

        <div className="space-y-3">
          <ProbabilitySurfacePanel surface={state.surface} />
          <ScenarioTimelineProjection timeline={state.timeline} />
          <RiskCascadePanel cascades={state.cascades} />
        </div>
      </div>
    </div>
  )
}
