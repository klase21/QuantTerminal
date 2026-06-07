import type { StableTacticalInputSnapshot } from "./stableTacticalInput"
import { buildExecutionRiskSummary } from "./executionRiskEngine"
import { buildFlowIntelligence } from "./flowIntelligenceEngine"
import { buildMacroReasoning } from "./macroReasoningEngine"
import { rankTacticalOpportunities, type RankedOpportunity } from "./opportunityRankingEngine"
import { buildTacticalEvents, type TacticalEvent } from "./tacticalEventBus"
import { buildTacticalIntelligenceBrain, type TacticalVerdictResult } from "./tacticalVerdictEngine"

export type TacticalExecutionMode = "WAIT" | "SCALE-IN" | "SCALP" | "BREAKOUT" | "TREND" | "DEFENSIVE" | "AVOID"
export type TacticalTiming = "EARLY" | "CONFIRMED" | "LATE" | "EXHAUSTED"
export type TacticalRiskLevel = "LOW" | "MEDIUM" | "HIGH"
export type TacticalAttention = "NORMAL" | "ELEVATED" | "EXTREME"

export type TacticalInsightV3 = {
  verdict: TacticalVerdictResult
  events: TacticalEvent[]
  opportunities: RankedOpportunity[]
  bias: "LONG" | "SHORT" | "NEUTRAL"
  conviction: number
  executionMode: TacticalExecutionMode
  timing: TacticalTiming
  timingConfidence: number
  riskLevel: TacticalRiskLevel
  attention: TacticalAttention
  headline: string
  playbook: string[]
  invalidation: string
  waitFor: string[]
  summary: string
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function biasLabel(verdict: TacticalVerdictResult): TacticalInsightV3["bias"] {
  if (verdict.directionalBias === "LONG BIAS") return "LONG"
  if (verdict.directionalBias === "SHORT BIAS") return "SHORT"
  return "NEUTRAL"
}

function buildTiming(snapshot: StableTacticalInputSnapshot, events: TacticalEvent[]): TacticalTiming {
  const { momentumScore, volatilityScore, executionScore } = snapshot.input
  const hasChaseRisk = events.some((event) => event.type === "CHASE_RISK")
  if (hasChaseRisk || (momentumScore >= 72 && volatilityScore >= 65)) return "LATE"
  if (volatilityScore >= 78 && executionScore < 55) return "EXHAUSTED"
  if (momentumScore >= 58 && executionScore >= 58) return "CONFIRMED"
  return "EARLY"
}

function buildExecutionMode(verdict: TacticalVerdictResult, snapshot: StableTacticalInputSnapshot, timing: TacticalTiming): TacticalExecutionMode {
  if (verdict.directionalBias === "NO EDGE" || verdict.executionState === "NO EDGE") return "AVOID"
  if (verdict.executionState === "HIGH SLIPPAGE RISK") return "DEFENSIVE"
  if (verdict.executionState === "WAIT FOR RESET" || timing === "LATE" || timing === "EXHAUSTED") return "WAIT"
  if (snapshot.input.executionScore >= 68 && snapshot.input.momentumScore >= 64) return "BREAKOUT"
  if (snapshot.input.trendScore >= 64 && snapshot.input.flowScore >= 58) return "TREND"
  if (snapshot.input.executionScore >= 56) return "SCALP"
  return "SCALE-IN"
}

export function buildTacticalInsightV3(snapshot: StableTacticalInputSnapshot): TacticalInsightV3 {
  const verdict = buildTacticalIntelligenceBrain(snapshot.input)
  const macro = buildMacroReasoning(snapshot.macroInput)
  const flow = buildFlowIntelligence(snapshot.flowInput)
  const events = buildTacticalEvents({ snapshot, verdict, macro, flow })
  const opportunities = rankTacticalOpportunities({ snapshot, events, bias: verdict.directionalBias })
  const timing = buildTiming(snapshot, events)
  const executionMode = buildExecutionMode(verdict, snapshot, timing)
  const risk = buildExecutionRiskSummary(snapshot.input, verdict.directionalBias, verdict.executionState)
  const riskLevel: TacticalRiskLevel = risk.level === "HIGH" || risk.level === "ELEVATED" ? "HIGH" : risk.level === "MODERATE" ? "MEDIUM" : "LOW"
  const attentionScore = clamp(
    risk.score * 0.42 +
      snapshot.input.volatilityScore * 0.18 +
      (snapshot.input.liquidationPressure ?? 35) * 0.2 +
      events.slice(0, 3).reduce((sum, event) => sum + event.severity, 0) * 0.067,
  )
  const attention: TacticalAttention = attentionScore >= 74 ? "EXTREME" : attentionScore >= 54 ? "ELEVATED" : "NORMAL"
  const bias = biasLabel(verdict)
  const best = opportunities[0]
  const conviction = Math.round(clamp(verdict.confidence * 0.55 + (best?.score ?? 50) * 0.3 + (100 - risk.score) * 0.15))
  const timingConfidence = Math.round(
    clamp(snapshot.input.executionScore * 0.34 + snapshot.input.liquidityScore * 0.28 + snapshot.input.flowScore * 0.22 + (100 - snapshot.input.volatilityScore) * 0.16),
  )

  const headline =
    executionMode === "AVOID"
      ? "No clean edge — preserve capital"
      : executionMode === "WAIT"
        ? "Edge exists, but timing needs reset"
        : executionMode === "DEFENSIVE"
          ? "Trade defensively — execution friction is high"
          : `${bias} ${executionMode.toLowerCase()} window forming`

  const playbook = [
    executionMode === "WAIT" || executionMode === "AVOID"
      ? "Do not chase. Wait for flow reset, sweep/reclaim, or confirmed retest."
      : "Use confirmation-first entry. Avoid market chasing into thin liquidity.",
    best ? `Primary focus: ${best.label} · ${best.grade} · ${best.setup}.` : "Primary focus: wait for a cleaner candidate.",
    riskLevel === "HIGH" ? "Reduce size and require stronger confirmation." : "Size can remain tactical if invalidation is clear.",
  ]

  const invalidation =
    bias === "LONG"
      ? "Invalidate if buyer flow fades below neutral or liquidity support fails after retest."
      : bias === "SHORT"
        ? "Invalidate if seller pressure fails and price reclaims with positive flow."
        : "Invalidate directional thesis until bias, flow, and execution quality align."

  const waitFor = [
    timing === "LATE" ? "Pullback or absorption reset after expansion." : "Fresh execution trigger candle.",
    snapshot.input.executionScore < 55 ? "Execution score above 55 with tighter spread." : "Flow continuation without liquidity deterioration.",
    (snapshot.input.liquidationPressure ?? 35) >= 65 ? "Sweep/reclaim confirmation around liquidation zones." : "No sudden liquidation pressure spike.",
  ]

  const summary = `${headline}. Conviction ${conviction}%, timing ${timing} (${timingConfidence}%), attention ${attention}.`

  return {
    verdict,
    events,
    opportunities,
    bias,
    conviction,
    executionMode,
    timing,
    timingConfidence,
    riskLevel,
    attention,
    headline,
    playbook,
    invalidation,
    waitFor,
    summary,
  }
}
