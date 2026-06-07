import type { AdaptiveRegime } from "./adaptiveRegimeWeighting"

export interface AdaptiveCommentary {
  headline: string
  summary: string
  action: string
}

export function buildAdaptiveCommentary({
  regime,
  bias,
  contradictionScore,
  confidence,
}: {
  regime: AdaptiveRegime
  bias: "BULLISH" | "BEARISH" | "NEUTRAL"
  contradictionScore: number
  confidence: number
}): AdaptiveCommentary {
  if (regime === "CHOPPY") {
    return {
      headline: "Choppy regime: require confirmation",
      summary:
        "Breakout reliability is reduced. Flow confirmation and liquidity sweeps matter more than raw narrative strength.",
      action: "Use smaller size and wait for CVD or absorption confirmation.",
    }
  }

  if (regime === "TREND_EXPANSION" && bias === "BULLISH") {
    return {
      headline: "Trend expansion remains constructive",
      summary:
        "Higher timeframe structure supports continuation, but execution pressure should be monitored for pullback entries.",
      action: confidence > 70 && contradictionScore < 50 ? "Buy pullbacks with confirmation." : "Wait for cleaner tape.",
    }
  }

  if (regime === "RISK_OFF") {
    return {
      headline: "Risk-off filter active",
      summary:
        "Liquidity protection is more important than chasing rotations. Positive signals need stronger validation.",
      action: "Prioritize capital preservation and avoid weak confirmations.",
    }
  }

  return {
    headline: "Mixed tactical read",
    summary:
      "Signals are not fully aligned. Treat this as a watch state until flow, rotation, and liquidity agree.",
    action: "Observe and wait for alignment.",
  }
}
