export type MarketRegime =
  | "TREND_EXPANSION"
  | "RISK_OFF"
  | "SHORT_SQUEEZE"
  | "CHOPPY"

export function detectRegime({
  oiExpansion,
  funding,
  volatility,
}: {
  oiExpansion: number
  funding: number
  volatility: number
}): MarketRegime {
  if (oiExpansion > 70 && funding > 0) return "TREND_EXPANSION"
  if (volatility > 80) return "SHORT_SQUEEZE"
  if (funding < 0) return "RISK_OFF"
  return "CHOPPY"
}