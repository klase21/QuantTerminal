export type MarketRegimeV2 =
  | "TREND"
  | "CHOP"
  | "SQUEEZE"
  | "EXPANSION"
  | "RISK_OFF"
  | "ROTATION"

export type RegimeStrategyBias = "BREAKOUT" | "PULLBACK" | "MEAN_REVERSION" | "DEFENSIVE" | "ROTATION_TRACKING"

export interface MarketRegimeInput {
  momentum?: number
  trend?: number
  volatility?: number
  flow?: number
  rotation?: number
  macroRisk?: number
  liquidityRisk?: number
  buyPressure?: number
  sellPressure?: number
}

export interface MarketRegimeAssessment {
  regime: MarketRegimeV2
  confidence: number
  strategyBias: RegimeStrategyBias
  summary: string
  favored: string[]
  suppressed: string[]
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : min)))
}

export function assessMarketRegimeV2(input: MarketRegimeInput = {}): MarketRegimeAssessment {
  const momentum = clamp(input.momentum ?? 58)
  const trend = clamp(input.trend ?? 62)
  const volatility = clamp(input.volatility ?? 54)
  const flow = clamp(input.flow ?? 55)
  const rotation = clamp(input.rotation ?? 68)
  const macroRisk = clamp(input.macroRisk ?? 48)
  const liquidityRisk = clamp(input.liquidityRisk ?? 58)
  const buyPressure = clamp(input.buyPressure ?? 50)
  const sellPressure = clamp(input.sellPressure ?? 50)
  const pressureSkew = Math.abs(buyPressure - sellPressure)

  if (macroRisk >= 72 || (sellPressure >= 70 && trend <= 52)) {
    return {
      regime: "RISK_OFF",
      confidence: clamp(Math.max(macroRisk, sellPressure) * 0.7 + liquidityRisk * 0.3),
      strategyBias: "DEFENSIVE",
      summary: "Risk-off pressure is high. Preserve capital and require stronger confirmation before acting.",
      favored: ["defensive scalps", "reduced size", "confirmation-only entries"],
      suppressed: ["aggressive longs", "late breakout chase", "weak narrative setups"],
    }
  }

  if (rotation >= 72 && momentum >= 55 && macroRisk < 65) {
    return {
      regime: "ROTATION",
      confidence: clamp(rotation * 0.58 + momentum * 0.24 + flow * 0.18),
      strategyBias: "ROTATION_TRACKING",
      summary: "Capital rotation is the main battlefield. Prioritize the strongest sector or relative-strength asset.",
      favored: ["sector continuation", "pullback into leader", "relative strength tracking"],
      suppressed: ["laggard catch-up trades", "isolated one-candle pumps"],
    }
  }

  if (volatility >= 70 && momentum >= 64 && trend >= 58) {
    return {
      regime: "EXPANSION",
      confidence: clamp(volatility * 0.36 + momentum * 0.34 + trend * 0.3),
      strategyBias: "BREAKOUT",
      summary: "Expansion is active. Breakout continuation can work, but late entries need chase-risk filtering.",
      favored: ["breakout continuation", "reclaim continuation", "momentum follow-through"],
      suppressed: ["blind mean reversion", "counter-trend fading without absorption"],
    }
  }

  if (volatility <= 42 && trend >= 48 && pressureSkew <= 18) {
    return {
      regime: "SQUEEZE",
      confidence: clamp((100 - volatility) * 0.48 + trend * 0.28 + (100 - pressureSkew) * 0.24),
      strategyBias: "BREAKOUT",
      summary: "Compression is building. Wait for expansion trigger instead of front-running direction.",
      favored: ["trigger-based breakout", "range reclaim", "volume expansion confirmation"],
      suppressed: ["early entry", "oversized probes", "directional conviction before break"],
    }
  }

  if (trend <= 48 && momentum <= 55 && pressureSkew <= 22) {
    return {
      regime: "CHOP",
      confidence: clamp((100 - trend) * 0.45 + (100 - momentum) * 0.25 + (100 - pressureSkew) * 0.3),
      strategyBias: "MEAN_REVERSION",
      summary: "Chop conditions dominate. Avoid trend assumptions and require clean edges.",
      favored: ["range fade", "liquidity sweep reclaim", "small size scalps"],
      suppressed: ["breakout chase", "multi-signal overconfidence", "late continuation"],
    }
  }

  return {
    regime: "TREND",
    confidence: clamp(trend * 0.44 + momentum * 0.34 + flow * 0.22),
    strategyBias: "PULLBACK",
    summary: "Trend structure is present, but execution should still wait for pullback or reclaim confirmation.",
    favored: ["pullback continuation", "structure reclaim", "leader follow-through"],
    suppressed: ["late entries", "counter-trend trades without catalyst"],
  }
}
