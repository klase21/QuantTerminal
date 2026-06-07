export type MarketMode = "FUTURES" | "SPOT" | "HYBRID"

export interface MarketFlowSnapshot {
  symbol: string
  source: "SPOT" | "FUTURES"
  buyVolume: number
  sellVolume: number
  delta: number
  cvd: number
  buyPressure: number
  sellPressure: number
}

export interface DualMarketIntelligence {
  symbol: string
  mode: MarketMode
  spot: MarketFlowSnapshot
  futures: MarketFlowSnapshot
  divergenceScore: number
  fakeBreakoutRisk: number
  realDemandConfirmation: number
  absorptionScore: number
  summary: string
  warnings: string[]
}
