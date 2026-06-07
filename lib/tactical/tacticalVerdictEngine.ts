import { buildActionableRiskAlerts, buildExecutionRiskSummary, type ExecutionRiskSummary } from "./executionRiskEngine"
export type DirectionalBias = "LONG BIAS" | "SHORT BIAS" | "TWO-WAY" | "NO EDGE"
export type AggressionLevel = "AGGRESSIVE" | "SELECTIVE" | "DEFENSIVE" | "AVOID"
export type ExecutionState =
  | "GOOD EXECUTION"
  | "WAIT FOR RESET"
  | "HIGH SLIPPAGE RISK"
  | "CHOPPY"
  | "NO EDGE"

export type TacticalTimeframeRead = {
  htf: "BULLISH" | "BEARISH" | "MIXED"
  mtf: "ACCELERATING" | "SLOWING" | "RANGING"
  ltf: "CONFIRMING" | "EXHAUSTED" | "UNSTABLE"
  conflict: boolean
  summary: string
}

export type TacticalOpportunity = {
  category:
    | "High Quality Scalps"
    | "Breakout Continuations"
    | "Liquidity Traps"
    | "Funding Reversals"
    | "Whale Rotation"
    | "Sector Momentum"
    | "No Clean Setup"
  priority: "HIGH" | "MEDIUM" | "LOW"
  focus: string
}

export type TacticalAlert = {
  title: string
  detail: string
  severity: "info" | "warning" | "danger"
}

export type NarrativeReasoning = {
  possibleDrivers: string[]
  executionImpact: string
}

export type LiquidationIntelligence = {
  sweepRisk: "LOW" | "MEDIUM" | "HIGH"
  read: string
  executionImpact: string
}

export type TacticalVerdictInput = {
  trendScore: number
  momentumScore: number
  executionScore: number
  liquidityScore: number
  volatilityScore: number
  flowScore: number
  rotationScore?: number
  liquidationPressure?: number
  fundingPressure?: number
  macroRiskScore?: number
}

export type TacticalVerdictResult = {
  directionalBias: DirectionalBias
  verdict: string
  aggression: AggressionLevel
  executionState: ExecutionState
  confidence: number
  guidance: string
  timeframeRead: TacticalTimeframeRead
  opportunity: TacticalOpportunity
  narrative: NarrativeReasoning
  liquidation: LiquidationIntelligence
  executionRisk: ExecutionRiskSummary
  alerts: TacticalAlert[]
  riskFactors: string[]
  watchList: string[]
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function normalize(value: number | undefined, fallback = 50) {
  if (!Number.isFinite(Number(value))) return fallback
  return clamp(Number(value))
}

function buildTimeframeRead(input: Required<TacticalVerdictInput>): TacticalTimeframeRead {
  const htf = input.trendScore >= 58 ? "BULLISH" : input.trendScore <= 42 ? "BEARISH" : "MIXED"
  const mtf =
    input.momentumScore >= 62
      ? "ACCELERATING"
      : input.momentumScore <= 42
        ? "SLOWING"
        : "RANGING"
  const ltf =
    input.executionScore >= 62 && input.liquidityScore >= 55
      ? "CONFIRMING"
      : input.executionScore <= 42 || input.liquidityScore <= 42
        ? "UNSTABLE"
        : "EXHAUSTED"

  const conflict =
    (htf === "BULLISH" && (mtf === "SLOWING" || ltf !== "CONFIRMING")) ||
    (htf === "BEARISH" && (mtf === "ACCELERATING" || ltf !== "CONFIRMING")) ||
    htf === "MIXED"

  const summary = conflict
    ? `${htf} higher-timeframe read, but lower-timeframe execution is not clean.`
    : `${htf} structure is aligned with ${mtf.toLowerCase()} momentum and ${ltf.toLowerCase()} execution.`

  return { htf, mtf, ltf, conflict, summary }
}

function buildExecutionState(input: Required<TacticalVerdictInput>, timeframeRead: TacticalTimeframeRead): ExecutionState {
  if (input.executionScore < 38 || input.liquidityScore < 35) return "NO EDGE"
  if (input.volatilityScore > 78 && input.liquidityScore < 52) return "HIGH SLIPPAGE RISK"
  if (timeframeRead.conflict) return "WAIT FOR RESET"
  if (input.executionScore >= 62 && input.liquidityScore >= 55) return "GOOD EXECUTION"
  return "CHOPPY"
}

function buildDirectionalBias(input: Required<TacticalVerdictInput>, executionState: ExecutionState): DirectionalBias {
  const composite =
    input.trendScore * 0.28 +
    input.momentumScore * 0.22 +
    input.flowScore * 0.22 +
    input.rotationScore * 0.14 +
    (100 - input.macroRiskScore) * 0.07 +
    (100 - input.fundingPressure) * 0.07

  if (executionState === "NO EDGE") return "NO EDGE"
  if (composite >= 58) return "LONG BIAS"
  if (composite <= 42) return "SHORT BIAS"
  return "TWO-WAY"
}

function buildOpportunity(input: Required<TacticalVerdictInput>, bias: DirectionalBias, executionState: ExecutionState): TacticalOpportunity {
  if (bias === "NO EDGE" || executionState === "NO EDGE") {
    return {
      category: "No Clean Setup",
      priority: "LOW",
      focus: "Preserve capital until structure and execution quality improve.",
    }
  }

  if (input.liquidationPressure >= 72) {
    return {
      category: "Liquidity Traps",
      priority: "HIGH",
      focus: "Watch for sweep-and-reclaim or failed breakdown behavior.",
    }
  }

  if (input.fundingPressure >= 72) {
    return {
      category: "Funding Reversals",
      priority: "MEDIUM",
      focus: "Avoid chasing crowded direction; wait for funding pressure unwind.",
    }
  }

  if (bias === "LONG BIAS" && input.momentumScore >= 65 && input.executionScore >= 58) {
    return {
      category: "High Quality Scalps",
      priority: "HIGH",
      focus: "Look for pullback continuation entries in the strongest leaders.",
    }
  }

  if (bias === "LONG BIAS" && input.rotationScore >= 60) {
    return {
      category: "Sector Momentum",
      priority: "MEDIUM",
      focus: "Focus on sectors with expanding participation and clean retests.",
    }
  }

  if (bias === "SHORT BIAS") {
    return {
      category: "Breakout Continuations",
      priority: "MEDIUM",
      focus: "Prefer failed bounce or breakdown continuation setups.",
    }
  }

  return {
    category: "No Clean Setup",
    priority: "LOW",
    focus: "Wait for directional expansion or cleaner liquidity support.",
  }
}

function buildNarrative(input: Required<TacticalVerdictInput>, bias: DirectionalBias, opportunity: TacticalOpportunity): NarrativeReasoning {
  const possibleDrivers: string[] = []

  if (input.rotationScore >= 60) possibleDrivers.push("Sector rotation participation appears to be strengthening.")
  if (input.flowScore >= 62) possibleDrivers.push("Aggressive trade flow is supporting the current direction.")
  if (input.macroRiskScore <= 42) possibleDrivers.push("Macro risk tone may be supportive for selective risk exposure.")
  if (input.macroRiskScore >= 68) possibleDrivers.push("Macro risk pressure may be limiting clean follow-through.")
  if (input.liquidationPressure >= 70) possibleDrivers.push("Liquidation pressure may be influencing short-term price movement.")
  if (input.fundingPressure >= 70) possibleDrivers.push("Crowded positioning may be increasing reversal risk.")

  if (possibleDrivers.length === 0) {
    possibleDrivers.push("No dominant external driver is clear from current tactical inputs.")
  }

  const executionImpact =
    bias === "LONG BIAS"
      ? `Execution impact: ${opportunity.focus}`
      : bias === "SHORT BIAS"
        ? `Execution impact: ${opportunity.focus}`
        : "Execution impact: avoid forcing directional trades until confirmation improves."

  return { possibleDrivers, executionImpact }
}

function buildLiquidation(input: Required<TacticalVerdictInput>): LiquidationIntelligence {
  const sweepRisk =
    input.liquidationPressure >= 72 ? "HIGH" : input.liquidationPressure >= 50 ? "MEDIUM" : "LOW"

  if (sweepRisk === "HIGH") {
    return {
      sweepRisk,
      read: "Liquidation pressure is elevated.",
      executionImpact: "Avoid late entries into obvious liquidity zones; wait for sweep confirmation.",
    }
  }

  if (sweepRisk === "MEDIUM") {
    return {
      sweepRisk,
      read: "Liquidation pressure is present but not dominant.",
      executionImpact: "Use liquidation zones as risk filters, not standalone entry signals.",
    }
  }

  return {
    sweepRisk,
    read: "Liquidation pressure is currently low.",
    executionImpact: "Execution can focus more on flow, trend and liquidity quality.",
  }
}

function buildAlerts(input: Required<TacticalVerdictInput>, bias: DirectionalBias, executionState: ExecutionState): TacticalAlert[] {
  const alerts: TacticalAlert[] = []

  if (executionState === "HIGH SLIPPAGE RISK") {
    alerts.push({
      title: "High slippage risk",
      detail: "Volatility is expanding while liquidity quality is not strong enough.",
      severity: "danger",
    })
  }

  if (executionState === "WAIT FOR RESET") {
    alerts.push({
      title: "Confirmation required",
      detail: "Higher-timeframe and lower-timeframe conditions are not fully aligned.",
      severity: "warning",
    })
  }

  if (bias === "LONG BIAS") {
    alerts.push({
      title: "Long side has priority",
      detail: "Prefer pullback or liquidity-reset entries instead of chasing vertical candles.",
      severity: "info",
    })
  }

  if (bias === "SHORT BIAS") {
    alerts.push({
      title: "Short side pressure increasing",
      detail: "Prefer failed bounce or breakdown confirmation before aggressive shorts.",
      severity: "warning",
    })
  }

  if (input.fundingPressure >= 72) {
    alerts.push({
      title: "Crowding risk elevated",
      detail: "Funding pressure can turn continuation setups into reversal traps.",
      severity: "warning",
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "No urgent tactical alert",
      detail: "Wait for cleaner directional expansion or execution quality improvement.",
      severity: "info",
    })
  }

  return alerts.slice(0, 4)
}

export function buildTacticalVerdict(input: TacticalVerdictInput): TacticalVerdictResult {
  const normalized: Required<TacticalVerdictInput> = {
    trendScore: normalize(input.trendScore),
    momentumScore: normalize(input.momentumScore),
    executionScore: normalize(input.executionScore),
    liquidityScore: normalize(input.liquidityScore),
    volatilityScore: normalize(input.volatilityScore),
    flowScore: normalize(input.flowScore),
    rotationScore: normalize(input.rotationScore, input.momentumScore),
    liquidationPressure: normalize(input.liquidationPressure, 35),
    fundingPressure: normalize(input.fundingPressure, 35),
    macroRiskScore: normalize(input.macroRiskScore, 50),
  }

  const timeframeRead = buildTimeframeRead(normalized)
  const executionState = buildExecutionState(normalized, timeframeRead)
  const directionalBias = buildDirectionalBias(normalized, executionState)
  const opportunity = buildOpportunity(normalized, directionalBias, executionState)
  const narrative = buildNarrative(normalized, directionalBias, opportunity)
  const liquidation = buildLiquidation(normalized)
  const executionRisk = buildExecutionRiskSummary(normalized, directionalBias, executionState)
  const alerts = [
    ...buildActionableRiskAlerts(normalized, directionalBias, executionState),
    ...buildAlerts(normalized, directionalBias, executionState),
  ].slice(0, 5)

  const confidence = clamp(
    Math.round(
      Math.abs(
        normalized.trendScore * 0.25 +
          normalized.momentumScore * 0.2 +
          normalized.flowScore * 0.2 +
          normalized.executionScore * 0.2 +
          normalized.liquidityScore * 0.15 -
          50,
      ) * 1.6 + 35,
    ),
    35,
    92,
  )

  let verdict = "NO EDGE"
  let aggression: AggressionLevel = "AVOID"
  let guidance = "No clean edge. Preserve capital until structure improves."

  if (directionalBias === "LONG BIAS") {
    verdict = executionState === "GOOD EXECUTION" ? "GOOD FOR LONG SCALPS" : "WAIT FOR LONG SETUP"
    aggression = executionState === "GOOD EXECUTION" ? "AGGRESSIVE" : "SELECTIVE"
    guidance = executionState === "GOOD EXECUTION"
      ? "Long side has priority. Favor pullback continuation or liquidity-reset entries."
      : "Long bias exists, but execution is not clean. Wait for lower-timeframe confirmation."
  }

  if (directionalBias === "SHORT BIAS") {
    verdict = executionState === "GOOD EXECUTION" ? "GOOD FOR SHORT SCALPS" : "WAIT FOR SHORT SETUP"
    aggression = executionState === "GOOD EXECUTION" ? "AGGRESSIVE" : "SELECTIVE"
    guidance = executionState === "GOOD EXECUTION"
      ? "Short side has priority. Favor failed bounce or breakdown continuation entries."
      : "Short bias exists, but confirmation is incomplete. Avoid early aggressive shorts."
  }

  if (directionalBias === "TWO-WAY") {
    verdict = "TWO-WAY / CHOPPY"
    aggression = "DEFENSIVE"
    guidance = "Directional edge is weak. Focus on quick execution only after range extremes or liquidity sweeps."
  }

  if (executionState === "HIGH SLIPPAGE RISK") {
    aggression = "DEFENSIVE"
    guidance = "Execution risk is elevated. Reduce size and avoid chasing market orders."
  }

  if (executionState === "NO EDGE") {
    verdict = "NO EDGE"
    aggression = "AVOID"
    guidance = "Execution quality is weak. Do not force trades until liquidity and structure improve."
  }

  const riskFactors: string[] = []
  if (normalized.liquidityScore < 45) riskFactors.push("Thin liquidity")
  if (normalized.executionScore < 45) riskFactors.push("Weak execution quality")
  if (normalized.volatilityScore > 75) riskFactors.push("Volatility expansion")
  if (timeframeRead.conflict) riskFactors.push("Timeframe conflict")
  if (normalized.fundingPressure > 70) riskFactors.push("Funding crowding")
  if (normalized.liquidationPressure > 70) riskFactors.push("Liquidation sweep risk")

  const watchList =
    directionalBias === "LONG BIAS"
      ? ["Pullback bid support", "Leader continuation", "Failed breakdown reclaim"]
      : directionalBias === "SHORT BIAS"
        ? ["Failed bounce", "Breakdown continuation", "Bid liquidity deterioration"]
        : ["Range extremes", "Liquidity sweeps", "Fresh directional expansion"]

  return {
    directionalBias,
    verdict,
    aggression,
    executionState,
    confidence,
    guidance,
    timeframeRead,
    opportunity,
    narrative,
    liquidation,
    executionRisk,
    alerts,
    riskFactors,
    watchList,
  }
}

export function buildTacticalIntelligenceBrain(input: Partial<TacticalVerdictInput> = {}) {
  return buildTacticalVerdict({
    trendScore: input.trendScore ?? 55,
    momentumScore: input.momentumScore ?? 52,
    executionScore: input.executionScore ?? 50,
    liquidityScore: input.liquidityScore ?? 50,
    volatilityScore: input.volatilityScore ?? 50,
    flowScore: input.flowScore ?? 52,
    rotationScore: input.rotationScore ?? 50,
    liquidationPressure: input.liquidationPressure ?? 35,
    fundingPressure: input.fundingPressure ?? 35,
    macroRiskScore: input.macroRiskScore ?? 50,
  })
}
