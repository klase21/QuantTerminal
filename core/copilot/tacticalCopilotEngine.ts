export type TacticalRegime =
  | "TREND_EXPANSION"
  | "EARLY_RISK_OFF"
  | "CHOPPY"
  | "ROTATION_EXPANSION"

export interface TacticalDebatePoint {
  label: string
  detail: string
}

export interface TacticalEscalation {
  level: "INFO" | "WARNING" | "CRITICAL"
  title: string
  detail: string
}

export interface TacticalCopilotState {
  conviction: number
  regime: TacticalRegime
  confidenceShift: string
  guidance: string[]
  narrator: string
  bullCase: TacticalDebatePoint[]
  bearCase: TacticalDebatePoint[]
  escalation: TacticalEscalation[]
  focusTargets: string[]
}

export function buildTacticalCopilotState({
  buyPressure = 38,
  sellPressure = 62,
  rotationConfidence = 81,
  contradictionPenalty = 14,
}: {
  buyPressure?: number
  sellPressure?: number
  rotationConfidence?: number
  contradictionPenalty?: number
} = {}): TacticalCopilotState {
  const conviction = Math.max(
    32,
    Math.min(
      94,
      Math.round(
        rotationConfidence * 0.48 +
        Math.max(0, 100 - contradictionPenalty * 3) * 0.26 +
        Math.max(buyPressure, sellPressure) * 0.16
      )
    )
  )

  const regime: TacticalRegime =
    contradictionPenalty > 20
      ? "CHOPPY"
      : sellPressure > buyPressure + 16
        ? "EARLY_RISK_OFF"
        : rotationConfidence > 74
          ? "ROTATION_EXPANSION"
          : "TREND_EXPANSION"

  const confidenceShift =
    sellPressure > buyPressure
      ? "Bullish confidence weakening due to execution imbalance."
      : "Execution confirmation improving."

  const guidance = [
    "Avoid early breakout chasing while sell pressure remains dominant.",
    "Prefer pullback confirmation over emotional entries.",
    "Reduce size if contradiction expands further.",
    "Track AI → RWA route for continuation confirmation.",
  ]

  const bullCase: TacticalDebatePoint[] = [
    {
      label: "Rotation acceleration",
      detail: "RWA continues to absorb tactical attention from overheated AI sectors.",
    },
    {
      label: "Liquidity support",
      detail: "Upside liquidity magnet still exists if execution improves.",
    },
  ]

  const bearCase: TacticalDebatePoint[] = [
    {
      label: "Execution weakness",
      detail: "Sell pressure continues to dominate tape behavior.",
    },
    {
      label: "Narrative overheating",
      detail: "AI sector remains crowded and vulnerable to fast unwind.",
    },
  ]

  const escalation: TacticalEscalation[] = [
    {
      level: "WARNING",
      title: "Execution imbalance",
      detail: "Sell pressure expanding while long conviction remains elevated.",
    },
    {
      level: "INFO",
      title: "Rotation route active",
      detail: "AI → RWA tactical route still active.",
    },
  ]

  const focusTargets = [
    "RWA continuation",
    "AI exhaustion",
    "Liquidity sweep risk",
    "BTC defensive migration",
  ]

  const narrator =
    "Co-Pilot currently prefers patience over aggression. Tactical edge exists in rotation tracking, but execution pressure is still preventing clean confirmation."

  return {
    conviction,
    regime,
    confidenceShift,
    guidance,
    narrator,
    bullCase,
    bearCase,
    escalation,
    focusTargets,
  }
}
