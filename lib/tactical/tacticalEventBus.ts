import type { StableTacticalInputSnapshot } from "./stableTacticalInput"
import type { DirectionalBias, TacticalVerdictResult } from "./tacticalVerdictEngine"
import type { MacroReasoningResult } from "./macroReasoningEngine"
import type { FlowIntelligenceResult } from "./flowIntelligenceEngine"

export type TacticalEventType =
  | "FLOW_ACCELERATION"
  | "FLOW_DISTRIBUTION"
  | "LIQUIDATION_SWEEP_RISK"
  | "ROTATION_EXPANSION"
  | "MACRO_TAILWIND"
  | "MACRO_HEADWIND"
  | "EXECUTION_FRICTION"
  | "BREAKOUT_CONTINUATION"
  | "CHASE_RISK"
  | "NO_CLEAN_EDGE"

export type TacticalEvent = {
  id: string
  type: TacticalEventType
  label: string
  severity: number
  confidence: number
  direction: "LONG" | "SHORT" | "NEUTRAL"
  source: "flow" | "liquidation" | "rotation" | "macro" | "execution" | "verdict"
  decayMs: number
  timestamp: number
  executionImpact: string
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function directionFromBias(bias: DirectionalBias): TacticalEvent["direction"] {
  if (bias === "LONG BIAS") return "LONG"
  if (bias === "SHORT BIAS") return "SHORT"
  return "NEUTRAL"
}

function eventId(type: TacticalEventType, timestamp: number) {
  return `${type}:${Math.floor(timestamp / 1000)}`
}

export function buildTacticalEvents(input: {
  snapshot: StableTacticalInputSnapshot
  verdict: TacticalVerdictResult
  macro?: MacroReasoningResult
  flow?: FlowIntelligenceResult
}): TacticalEvent[] {
  const { snapshot, verdict, macro, flow } = input
  const now = snapshot.updatedAt || Date.now()
  const scores = snapshot.input
  const events: TacticalEvent[] = []
  const push = (event: Omit<TacticalEvent, "id" | "timestamp">) => {
    events.push({ ...event, id: eventId(event.type, now), timestamp: now })
  }

  if (scores.flowScore >= 62 || flow?.microstructureBias === "LONG") {
    push({
      type: "FLOW_ACCELERATION",
      label: "Buyer flow confirming",
      severity: clamp(scores.flowScore),
      confidence: clamp((scores.flowScore + scores.executionScore) / 2),
      direction: "LONG",
      source: "flow",
      decayMs: 45_000,
      executionImpact: "Flow supports continuation, but entry should still wait for liquidity quality.",
    })
  }

  if (scores.flowScore <= 38 || flow?.microstructureBias === "SHORT") {
    push({
      type: "FLOW_DISTRIBUTION",
      label: "Seller flow active",
      severity: clamp(100 - scores.flowScore),
      confidence: clamp((100 - scores.flowScore + scores.executionScore) / 2),
      direction: "SHORT",
      source: "flow",
      decayMs: 45_000,
      executionImpact: "Flow warns against blind long exposure until buy-side pressure recovers.",
    })
  }

  if ((scores.rotationScore ?? 50) >= 60) {
    push({
      type: "ROTATION_EXPANSION",
      label: "Rotation participation expanding",
      severity: clamp(scores.rotationScore ?? 50),
      confidence: clamp(((scores.rotationScore ?? 50) + scores.momentumScore) / 2),
      direction: directionFromBias(verdict.directionalBias),
      source: "rotation",
      decayMs: 120_000,
      executionImpact: "Prioritize leaders with cleaner pullback/retest structure over laggards.",
    })
  }

  if ((scores.liquidationPressure ?? 35) >= 65) {
    push({
      type: "LIQUIDATION_SWEEP_RISK",
      label: "Liquidation sweep risk",
      severity: clamp(scores.liquidationPressure ?? 35),
      confidence: clamp((scores.liquidationPressure ?? 35) * 0.8 + scores.volatilityScore * 0.2),
      direction: "NEUTRAL",
      source: "liquidation",
      decayMs: 60_000,
      executionImpact: "Avoid late chase entries near obvious liquidation zones; wait for sweep/reclaim behavior.",
    })
  }

  if ((scores.macroRiskScore ?? 50) <= 42 || macro?.regime === "RISK-ON SUPPORTIVE") {
    push({
      type: "MACRO_TAILWIND",
      label: "Macro backdrop supportive",
      severity: clamp(100 - (scores.macroRiskScore ?? 50)),
      confidence: clamp(62 + Math.abs(snapshot.macroInput.nasdaqChange) * 3),
      direction: "LONG",
      source: "macro",
      decayMs: 300_000,
      executionImpact: "Macro conditions allow selective risk-on continuation if flow and execution align.",
    })
  }

  if ((scores.macroRiskScore ?? 50) >= 64 || macro?.regime === "RISK-OFF PRESSURE" || macro?.regime === "LIQUIDITY STRESS") {
    push({
      type: "MACRO_HEADWIND",
      label: "Macro pressure present",
      severity: clamp(scores.macroRiskScore ?? 50),
      confidence: clamp((scores.macroRiskScore ?? 50) * 0.75 + scores.volatilityScore * 0.25),
      direction: "SHORT",
      source: "macro",
      decayMs: 300_000,
      executionImpact: "Reduce directional aggression unless price action confirms through macro friction.",
    })
  }

  if (scores.executionScore <= 44 || scores.liquidityScore <= 42 || verdict.executionState === "HIGH SLIPPAGE RISK") {
    push({
      type: "EXECUTION_FRICTION",
      label: "Execution friction elevated",
      severity: clamp((100 - scores.executionScore) * 0.55 + (100 - scores.liquidityScore) * 0.45),
      confidence: clamp(70 + scores.volatilityScore * 0.2),
      direction: "NEUTRAL",
      source: "execution",
      decayMs: 30_000,
      executionImpact: "Prefer limit entries, smaller size, or wait mode until liquidity normalizes.",
    })
  }

  if (scores.momentumScore >= 68 && scores.volatilityScore >= 65 && scores.executionScore < 58) {
    push({
      type: "CHASE_RISK",
      label: "Late-move chase risk",
      severity: clamp((scores.momentumScore + scores.volatilityScore + (100 - scores.executionScore)) / 3),
      confidence: clamp(64 + scores.volatilityScore * 0.25),
      direction: directionFromBias(verdict.directionalBias),
      source: "execution",
      decayMs: 45_000,
      executionImpact: "Do not market chase. Wait for reset, absorption, or a clean continuation trigger.",
    })
  }

  if (verdict.executionState === "GOOD EXECUTION" && verdict.directionalBias !== "TWO-WAY" && verdict.directionalBias !== "NO EDGE") {
    push({
      type: "BREAKOUT_CONTINUATION",
      label: "Execution window open",
      severity: clamp((scores.executionScore + scores.liquidityScore + scores.momentumScore) / 3),
      confidence: clamp(verdict.confidence),
      direction: directionFromBias(verdict.directionalBias),
      source: "verdict",
      decayMs: 35_000,
      executionImpact: "Setup can be traded with confirmation; invalidation should stay tight around failed flow continuation.",
    })
  }

  if (verdict.directionalBias === "NO EDGE" || verdict.executionState === "NO EDGE") {
    push({
      type: "NO_CLEAN_EDGE",
      label: "No clean execution edge",
      severity: 72,
      confidence: clamp(100 - verdict.confidence + 35),
      direction: "NEUTRAL",
      source: "verdict",
      decayMs: 60_000,
      executionImpact: "Observe-only mode. Let structure, flow, or liquidity reset create a new edge.",
    })
  }

  return events.sort((a, b) => b.severity * b.confidence - a.severity * a.confidence)
}
