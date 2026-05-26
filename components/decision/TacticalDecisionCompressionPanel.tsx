"use client"

import TacticalDecisionStrip from "@/components/decision/TacticalDecisionStrip"
import DecisionReasonPanel from "@/components/decision/DecisionReasonPanel"
import OpportunityCompressionPanel from "@/components/decision/OpportunityCompressionPanel"

export default function TacticalDecisionCompressionPanel({ flow }: { flow?: any }) {
  return (
    <div className="space-y-3">
      <TacticalDecisionStrip flow={flow} />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DecisionReasonPanel flow={flow} />
        <OpportunityCompressionPanel />
      </div>
    </div>
  )
}
