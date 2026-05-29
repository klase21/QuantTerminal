export type FlowIntelligenceInput = {
  buyVolume?: number
  sellVolume?: number
  cvd?: number
  orderbookImbalance?: number
  spreadBps?: number
  volatilityScore?: number
}

export type FlowRegime =
  | "BUYER DOMINANT"
  | "SELLER DOMINANT"
  | "BALANCED FLOW"
  | "ABSORPTION WATCH"
  | "LIQUIDITY VACUUM"

export type FlowIntelligenceResult = {
  regime: FlowRegime
  score: number
  read: string
  microstructureBias: "LONG" | "SHORT" | "NEUTRAL"
  executionHint: string
  alerts: string[]
}

function n(value: number | undefined, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function buildFlowIntelligence(input: FlowIntelligenceInput = {}): FlowIntelligenceResult {
  const buy = n(input.buyVolume)
  const sell = n(input.sellVolume)
  const total = Math.max(1, buy + sell)
  const flowBalance = ((buy - sell) / total) * 50 + 50
  const cvd = n(input.cvd)
  const imbalance = n(input.orderbookImbalance)
  const spread = n(input.spreadBps, 8)
  const volatility = n(input.volatilityScore, 50)

  const alerts: string[] = []

  let regime: FlowRegime = "BALANCED FLOW"
  let microstructureBias: FlowIntelligenceResult["microstructureBias"] = "NEUTRAL"

  if (spread > 18 || (volatility > 75 && total < 10)) {
    regime = "LIQUIDITY VACUUM"
  } else if (flowBalance >= 62 && imbalance >= -20) {
    regime = "BUYER DOMINANT"
    microstructureBias = "LONG"
  } else if (flowBalance <= 38 && imbalance <= 20) {
    regime = "SELLER DOMINANT"
    microstructureBias = "SHORT"
  } else if ((flowBalance >= 62 && imbalance < -25) || (flowBalance <= 38 && imbalance > 25)) {
    regime = "ABSORPTION WATCH"
  }

  if (spread > 15) alerts.push("Spread is widening; avoid aggressive market entries.")
  if (regime === "ABSORPTION WATCH") alerts.push("Flow && orderbook pressure conflict; watch for absorption.")
  if (Math.abs(cvd) > total * 0.6 && total > 0) alerts.push("CVD dominance is strong; trend continuation or squeeze risk may increase.")
  if (regime === "LIQUIDITY VACUUM") alerts.push("Liquidity vacuum risk; slippage can dominate signal quality.")

  const score = clamp(flowBalance * 0.55 + (imbalance + 100) * 0.225)

  const read =
    regime === "BUYER DOMINANT"
      ? "Aggressive buyers are controlling short-term flow."
      : regime === "SELLER DOMINANT"
        ? "Aggressive sellers are controlling short-term flow."
        : regime === "ABSORPTION WATCH"
          ? "Flow is active, but orderbook response suggests absorption or trap risk."
          : regime === "LIQUIDITY VACUUM"
            ? "Liquidity is thin enough that execution risk may dominate direction."
            : "Flow is balanced; directional edge is not strong from microstructure alone."

  const executionHint =
    regime === "BUYER DOMINANT"
      ? "Prefer pullback longs if liquidity support remains stable."
      : regime === "SELLER DOMINANT"
        ? "Prefer failed bounce shorts if bid support deteriorates."
        : regime === "ABSORPTION WATCH"
          ? "Wait for absorption resolution before taking aggressive entries."
          : regime === "LIQUIDITY VACUUM"
            ? "Reduce size && avoid market chasing."
            : "Wait for flow expansion or liquidity sweep."

  return {
    regime,
    score: Math.round(score),
    read,
    microstructureBias,
    executionHint,
    alerts,
  }
}
