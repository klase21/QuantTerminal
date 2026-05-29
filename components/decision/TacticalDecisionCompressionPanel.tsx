"use client"

import TacticalDecisionStrip from "@/components/decision/TacticalDecisionStrip"
import OpportunityCompressionPanel from "@/components/decision/OpportunityCompressionPanel"
import MarketMoverSignalCard from "@/components/market-movers/MarketMoverSignalCard"

export default function TacticalDecisionCompressionPanel({ flow }: { flow?: any }) {
  return (
    <div className="min-w-0 space-y-3">
      <TacticalDecisionStrip flow={flow} />
      <MarketMoverSignalCard />
      <OpportunityCompressionPanel />
    </div>
  )
}
