export type MarketRegimeId =
  | "ALT_ROTATION"
  | "BTC_DEFENSIVE"
  | "RISK_ON"
  | "RISK_OFF"
  | "MIXED"
  | "COMPRESSION"
  | "EXPANSION"
  | "EUPHORIA"
  | "CAPITULATION"

export interface RegimeTransitionRule {
  from: MarketRegimeId | "ANY"
  to: MarketRegimeId
  condition: string
  priority: number
}

export const REGIME_TRANSITION_RULES: RegimeTransitionRule[] = [
  { from: "ANY", to: "BTC_DEFENSIVE", condition: "BTC dominance rising while altseason weakens", priority: 80 },
  { from: "ANY", to: "ALT_ROTATION", condition: "Altseason, volume, and premium momentum align", priority: 90 },
  { from: "COMPRESSION", to: "EXPANSION", condition: "Volatility percentile exits low band with volume expansion", priority: 85 },
  { from: "ANY", to: "RISK_OFF", condition: "Fear falls, volatility expands, and breadth deteriorates", priority: 95 },
]
