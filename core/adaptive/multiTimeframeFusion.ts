export type TimeframeBias = "BULLISH" | "BEARISH" | "NEUTRAL"

export interface TimeframeSignal {
  timeframe: "5m" | "15m" | "1h" | "4h"
  bias: TimeframeBias
  confidence: number
  note: string
}

export interface FusedTimeframeView {
  tacticalBias: TimeframeBias
  alignmentScore: number
  executionRead: string
  signals: TimeframeSignal[]
}

export function fuseTimeframes(signals: TimeframeSignal[]): FusedTimeframeView {
  const bullish = signals.filter((s) => s.bias === "BULLISH").reduce((a, b) => a + b.confidence, 0)
  const bearish = signals.filter((s) => s.bias === "BEARISH").reduce((a, b) => a + b.confidence, 0)
  const total = Math.max(1, signals.reduce((a, b) => a + b.confidence, 0))

  const alignmentScore = Math.round((Math.max(bullish, bearish) / total) * 100)
  const tacticalBias: TimeframeBias =
    bullish > bearish * 1.15 ? "BULLISH" : bearish > bullish * 1.15 ? "BEARISH" : "NEUTRAL"

  const executionRead =
    tacticalBias === "BULLISH" && alignmentScore > 65
      ? "Pullback long bias while higher timeframe rotation remains constructive."
      : tacticalBias === "BEARISH" && alignmentScore > 65
        ? "Sell pressure has multi-timeframe support. Avoid chasing longs until tape improves."
        : "Mixed timeframe structure. Require flow confirmation before sizing."

  return {
    tacticalBias,
    alignmentScore,
    executionRead,
    signals,
  }
}

export function buildDefaultTimeframeFusion(): FusedTimeframeView {
  return fuseTimeframes([
    { timeframe: "5m", bias: "BEARISH", confidence: 62, note: "Short-term tape remains heavy." },
    { timeframe: "15m", bias: "NEUTRAL", confidence: 54, note: "Absorption watch but no clear impulse." },
    { timeframe: "1h", bias: "BULLISH", confidence: 71, note: "Rotation structure still positive." },
    { timeframe: "4h", bias: "BULLISH", confidence: 78, note: "Higher timeframe risk appetite intact." },
  ])
}
