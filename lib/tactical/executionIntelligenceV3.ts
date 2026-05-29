import type { StableTacticalInputSnapshot } from "./stableTacticalInput"
import type { TacticalInsightV3, TacticalExecutionMode } from "./tacticalInsightEngineV3"
import type { TacticalEvent } from "./tacticalEventBus"

export type FinalExecutionAction = "ENTER" | "WATCH" | "WAIT" | "AVOID"

export type ExecutionIntelligenceV3 = {
  action: FinalExecutionAction
  label: string
  confidence: number
  readiness: number
  friction: number
  chaseRisk: number
  decayAdjustedEventPressure: number
  primarySymbol: string
  primaryGrade: string
  routeSync: "ALIGNED" | "PARTIAL" | "CONFLICTED" | "STANDBY"
  decisionStrip: {
    left: string
    center: string
    right: string
  }
  reasons: string[]
  nextTrigger: string
  avoidCondition: string
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function freshnessScore(snapshot: StableTacticalInputSnapshot) {
  const entries = Object.values(snapshot.freshness)
  const active = entries.filter(Boolean).length
  return clamp((active / Math.max(1, entries.length)) * 100)
}

function eventDecayWeight(event: TacticalEvent, now: number) {
  const age = Math.max(0, now - event.timestamp)
  const decayMs = Math.max(1, event.decayMs)
  return Math.exp(-age / decayMs)
}

function riskEventPressure(events: TacticalEvent[], now: number) {
  return clamp(
    events
      .filter((event) =>
        event.type === "CHASE_RISK" ||
        event.type === "EXECUTION_FRICTION" ||
        event.type === "LIQUIDATION_SWEEP_RISK" ||
        event.type === "MACRO_HEADWIND" ||
        event.type === "NO_CLEAN_EDGE",
      )
      .reduce((sum, event) => sum + event.severity * (event.confidence / 100) * eventDecayWeight(event, now), 0) / 2.6,
  )
}

function supportiveEventPressure(events: TacticalEvent[], now: number) {
  return clamp(
    events
      .filter((event) =>
        event.type === "FLOW_ACCELERATION" ||
        event.type === "ROTATION_EXPANSION" ||
        event.type === "MACRO_TAILWIND" ||
        event.type === "BREAKOUT_CONTINUATION",
      )
      .reduce((sum, event) => sum + event.severity * (event.confidence / 100) * eventDecayWeight(event, now), 0) / 2.8,
  )
}

function actionFromScores(input: {
  insight: TacticalInsightV3
  readiness: number
  friction: number
  chaseRisk: number
  dataFreshness: number
}): FinalExecutionAction {
  const { insight, readiness, friction, chaseRisk, dataFreshness } = input

  if (insight.executionMode === "AVOID" || insight.riskLevel === "HIGH" && readiness < 58) return "AVOID"
  if (dataFreshness < 34) return "WAIT"
  if (chaseRisk >= 68 || insight.timing === "LATE" || insight.timing === "EXHAUSTED") return "WAIT"
  if (friction >= 70) return "WAIT"
  if (readiness >= 72 && insight.conviction >= 66 && insight.executionMode !== "WAIT") return "ENTER"
  if (readiness >= 56 && insight.conviction >= 52) return "WATCH"
  return "WAIT"
}

function modeLabel(action: FinalExecutionAction, executionMode: TacticalExecutionMode) {
  if (action === "ENTER") return executionMode === "BREAKOUT" ? "ENTER ON BREAKOUT CONFIRMATION" : "ENTER WITH CONFIRMATION"
  if (action === "WATCH") return "WATCH FOR TRIGGER"
  if (action === "AVOID") return "AVOID / CAPITAL PRESERVATION"
  return "WAIT FOR RESET"
}

export function buildExecutionIntelligenceV3(input: {
  snapshot: StableTacticalInputSnapshot
  insight: TacticalInsightV3
  now?: number
}): ExecutionIntelligenceV3 {
  const { snapshot, insight } = input
  const now = input.now ?? Date.now()
  const scores = snapshot.input
  const best = insight.opportunities[0]
  const dataFreshness = freshnessScore(snapshot)
  const riskPressure = riskEventPressure(insight.events, now)
  const supportPressure = supportiveEventPressure(insight.events, now)

  const friction = clamp(
    (100 - scores.executionScore) * 0.32 +
      (100 - scores.liquidityScore) * 0.26 +
      scores.volatilityScore * 0.18 +
      (scores.liquidationPressure ?? 35) * 0.16 +
      riskPressure * 0.08,
  )

  const chaseRisk = clamp(
    Math.max(0, scores.momentumScore - 55) * 1.15 +
      Math.max(0, scores.volatilityScore - 52) * 0.9 +
      Math.max(0, 58 - scores.executionScore) * 0.9 +
      (insight.timing === "LATE" ? 24 : insight.timing === "EXHAUSTED" ? 34 : 0),
  )

  const readiness = clamp(
    scores.executionScore * 0.26 +
      scores.liquidityScore * 0.2 +
      scores.flowScore * 0.16 +
      scores.momentumScore * 0.14 +
      insight.conviction * 0.12 +
      dataFreshness * 0.08 +
      supportPressure * 0.1 -
      friction * 0.09 -
      chaseRisk * 0.08,
  )

  const action = actionFromScores({ insight, readiness, friction, chaseRisk, dataFreshness })
  const label = modeLabel(action, insight.executionMode)

  const routeSync: ExecutionIntelligenceV3["routeSync"] = !best
    ? "STANDBY"
    : best.bias === insight.bias && insight.bias !== "NEUTRAL"
      ? "ALIGNED"
      : best.bias === "NEUTRAL" || insight.bias === "NEUTRAL"
        ? "PARTIAL"
        : "CONFLICTED"

  const reasons = [
    `Readiness ${Math.round(readiness)} vs friction ${Math.round(friction)}; action favors ${action.toLowerCase()}.`,
    `Timing is ${insight.timing}; chase risk ${Math.round(chaseRisk)} keeps execution discipline central.`,
    best ? `${best.label} leads ranking with ${best.grade} (${best.score}).` : "No ranked symbol has a clean tactical edge yet.",
  ]

  const nextTrigger =
    action === "ENTER"
      ? "Confirm continuation with stable spread, positive flow, and no liquidation spike."
      : action === "WATCH"
        ? "Wait for trigger candle, retest hold, or flow acceleration above neutral."
        : action === "AVOID"
          ? "Stand down until execution quality and directional bias realign."
          : "Wait for reset: pullback, absorption, or liquidity reclaim."

  const avoidCondition =
    insight.bias === "LONG"
      ? "Avoid if buyer flow falls below neutral or bid support fails after retest."
      : insight.bias === "SHORT"
        ? "Avoid if seller pressure fades and price reclaims failed support."
        : "Avoid directional entries while bias remains neutral or conflicted."

  return {
    action,
    label,
    confidence: Math.round(clamp(readiness * 0.55 + insight.conviction * 0.3 + (100 - friction) * 0.15)),
    readiness: Math.round(readiness),
    friction: Math.round(friction),
    chaseRisk: Math.round(chaseRisk),
    decayAdjustedEventPressure: Math.round(riskPressure),
    primarySymbol: best?.symbol ?? "OBSERVE",
    primaryGrade: best?.grade ?? "No Grade",
    routeSync,
    decisionStrip: {
      left: `${action} · ${insight.bias}`,
      center: `${insight.executionMode} / ${insight.timing}`,
      right: `Risk ${insight.riskLevel} · ${snapshot.dataQuality}`,
    },
    reasons,
    nextTrigger,
    avoidCondition,
  }
}
