"use client"

import TacticalDecisionStrip from "@/components/decision/TacticalDecisionStrip"
import DecisionReasonPanel from "@/components/decision/DecisionReasonPanel"
import OpportunityCompressionPanel from "@/components/decision/OpportunityCompressionPanel"

export default function TacticalDecisionCompressionPanel({ flow }: { flow?: any }) {
  return (
    <div className="min-w-0 space-y-3">
      <TacticalDecisionStrip flow={flow} />
      <div className="grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <DecisionReasonPanel flow={flow} />
        <OpportunityCompressionPanel />
      </div>
    </div>
  )
}
