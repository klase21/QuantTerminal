import type { ExecutionIntelligenceV3 } from "./executionIntelligenceV3"
import type { StableTacticalInputSnapshot } from "./stableTacticalInput"
import type { TacticalInsightV3 } from "./tacticalInsightEngineV3"

export type StrategyCategory = "breakout" | "mean_reversion" | "rotation" | "funding_reversal" | "liquidity_sweep" | "defensive"
export type StrategyExecutionMode = "aggressive" | "confirmation" | "scalp" | "swing" | "standby"
export type StrategyFitGrade = "PRIME" | "ACTIVE" | "WATCH" | "WEAK"
export type MarketRegime = "trend" | "chop" | "squeeze" | "expansion" | "risk_on" | "risk_off" | "late_cycle"

export type TacticalStrategyPlaybook = {
  id: string
  title: string
  category: StrategyCategory
  fitGrade: StrategyFitGrade
  confidence: number
  riskLevel: "low" | "medium" | "high"
  executionMode: StrategyExecutionMode
  marketRegime: MarketRegime[]
  linkedAssets: string[]
  reason: string
  conditions: string[]
  invalidation: string[]
  catalyst: string[]
  operatorNote: string
}

export type TacticalStrategyOS = {
  headline: string
  regime: MarketRegime[]
  primaryPlaybook: TacticalStrategyPlaybook
  playbooks: TacticalStrategyPlaybook[]
  suppressedPlaybooks: TacticalStrategyPlaybook[]
  strategyBias: "momentum" | "reversion" | "rotation" | "defensive" | "standby"
  summary: string
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function grade(score: number): StrategyFitGrade {
  if (score >= 78) return "PRIME"
  if (score >= 64) return "ACTIVE"
  if (score >= 48) return "WATCH"
  return "WEAK"
}

function riskLevel(score: number): TacticalStrategyPlaybook["riskLevel"] {
  if (score >= 68) return "high"
  if (score >= 46) return "medium"
  return "low"
}

function detectRegime(snapshot: StableTacticalInputSnapshot, insight: TacticalInsightV3, execution: ExecutionIntelligenceV3): MarketRegime[] {
  const s = snapshot.input
  const regimes: MarketRegime[] = []

  if (s.trendScore >= 62 && s.momentumScore >= 58) regimes.push("trend")
  if (s.volatilityScore <= 42 && s.momentumScore <= 54) regimes.push("squeeze")
  if (s.volatilityScore >= 58 || s.momentumScore >= 64) regimes.push("expansion")
  if ((s.rotationScore ?? 50) >= 60 && snapshot.macroInput.btcDominanceChange <= 0) regimes.push("risk_on")
  if ((s.macroRiskScore ?? 50) >= 62 || snapshot.macroInput.cryptoBetaScore <= 45) regimes.push("risk_off")
  if (insight.timing === "LATE" || insight.timing === "EXHAUSTED" || execution.chaseRisk >= 62) regimes.push("late_cycle")
  if (regimes.length === 0) regimes.push("chop")

  return Array.from(new Set(regimes))
}

function linkedAssets(insight: TacticalInsightV3, execution: ExecutionIntelligenceV3) {
  const ranked = insight.opportunities.slice(0, 3).map((item) => item.symbol)
  const primary = execution.primarySymbol !== "OBSERVE" ? [execution.primarySymbol] : []
  return Array.from(new Set([...primary, ...ranked])).slice(0, 4)
}

function playbook(input: {
  id: string
  title: string
  category: StrategyCategory
  baseScore: number
  risk: number
  mode: StrategyExecutionMode
  regimes: MarketRegime[]
  assets: string[]
  reason: string
  conditions: string[]
  invalidation: string[]
  catalyst: string[]
  operatorNote: string
}): TacticalStrategyPlaybook {
  return {
    id: input.id,
    title: input.title,
    category: input.category,
    fitGrade: grade(input.baseScore),
    confidence: Math.round(clamp(input.baseScore)),
    riskLevel: riskLevel(input.risk),
    executionMode: input.mode,
    marketRegime: input.regimes,
    linkedAssets: input.assets,
    reason: input.reason,
    conditions: input.conditions,
    invalidation: input.invalidation,
    catalyst: input.catalyst,
    operatorNote: input.operatorNote,
  }
}

export function buildTacticalStrategyOS(input: {
  snapshot: StableTacticalInputSnapshot
  insight: TacticalInsightV3
  execution: ExecutionIntelligenceV3
}): TacticalStrategyOS {
  const { snapshot, insight, execution } = input
  const s = snapshot.input
  const regimes = detectRegime(snapshot, insight, execution)
  const assets = linkedAssets(insight, execution)
  const riskDrag = Math.max(execution.friction, execution.chaseRisk, execution.decayAdjustedEventPressure)
  const macroDrag = Math.max(0, (s.macroRiskScore ?? 50) - 55)
  const flowEdge = Math.max(0, s.flowScore - 50)
  const rotationEdge = Math.max(0, (s.rotationScore ?? 50) - 50)
  const fundingHeat = s.fundingPressure ?? 42
  const liquidationHeat = s.liquidationPressure ?? 42

  const breakoutScore = clamp(
    s.momentumScore * 0.25 +
      s.trendScore * 0.2 +
      s.executionScore * 0.18 +
      s.liquidityScore * 0.12 +
      flowEdge * 0.42 +
      execution.readiness * 0.17 -
      execution.chaseRisk * 0.2 -
      macroDrag * 0.25,
  )

  const rotationScore = clamp(
    (s.rotationScore ?? 50) * 0.3 +
      s.momentumScore * 0.14 +
      s.flowScore * 0.18 +
      snapshot.macroInput.cryptoBetaScore * 0.12 +
      snapshot.macroInput.stablecoinLiquidityScore * 0.1 +
      execution.confidence * 0.1 -
      macroDrag * 0.2,
  )

  const sweepScore = clamp(
    liquidationHeat * 0.28 +
      s.liquidityScore * 0.2 +
      s.executionScore * 0.16 +
      Math.max(0, 60 - s.momentumScore) * 0.12 +
      Math.max(0, 68 - execution.chaseRisk) * 0.14 +
      flowEdge * 0.26,
  )

  const fundingReversalScore = clamp(
    fundingHeat * 0.32 +
      Math.max(0, 72 - s.momentumScore) * 0.12 +
      s.executionScore * 0.18 +
      Math.max(0, 72 - execution.chaseRisk) * 0.14 +
      liquidationHeat * 0.08 +
      (insight.timing === "LATE" ? 12 : 0),
  )

  const meanReversionScore = clamp(
    Math.max(0, 72 - s.trendScore) * 0.18 +
      Math.max(0, 62 - s.momentumScore) * 0.18 +
      s.liquidityScore * 0.16 +
      s.executionScore * 0.18 +
      Math.max(0, 58 - s.volatilityScore) * 0.14 -
      Math.max(0, s.trendScore - 68) * 0.2,
  )

  const defensiveScore = clamp(
    riskDrag * 0.34 +
      macroDrag * 0.5 +
      Math.max(0, 58 - s.executionScore) * 0.28 +
      Math.max(0, 58 - s.liquidityScore) * 0.22 +
      (snapshot.dataQuality === "LIVE" ? 0 : 12),
  )

  const playbooks = [
    playbook({
      id: "breakout-continuation",
      title: "Breakout Continuation",
      category: "breakout",
      baseScore: breakoutScore,
      risk: execution.chaseRisk,
      mode: breakoutScore >= 78 && execution.action === "ENTER" ? "aggressive" : "confirmation",
      regimes: ["trend", "expansion"],
      assets,
      reason: `Momentum ${Math.round(s.momentumScore)}, execution ${Math.round(s.executionScore)}, and flow ${Math.round(s.flowScore)} define the continuation fit.`,
      conditions: ["Fresh high/low expansion with flow confirmation", "Spread remains stable after trigger", "No immediate liquidation spike into entry"],
      invalidation: ["Failed retest after breakout", "Flow score drops below neutral", "Chase risk rises faster than readiness"],
      catalyst: ["Flow acceleration", "Narrative expansion", "Rotation leader strength"],
      operatorNote: "Use only after confirmation when timing is not late. This is not a blind momentum chase.",
    }),
    playbook({
      id: "sector-rotation-expansion",
      title: "Sector Rotation Expansion",
      category: "rotation",
      baseScore: rotationScore,
      risk: Math.max(execution.friction, macroDrag * 1.4),
      mode: rotationScore >= 76 ? "swing" : "confirmation",
      regimes: ["risk_on", "trend", "expansion"],
      assets,
      reason: `Rotation ${Math.round(s.rotationScore ?? 50)} with crypto beta ${Math.round(snapshot.macroInput.cryptoBetaScore)} determines whether capital is moving into leaders.`,
      conditions: ["Leader symbols hold relative strength", "BTC dominance does not crush alt rotation", "Narrative and flow remain aligned"],
      invalidation: ["Rotation score fades below 50", "Macro risk overrides beta appetite", "Leader breaks while laggards pump"],
      catalyst: ["Cross-sector inflow", "Narrative heat", "Smart money continuation"],
      operatorNote: "Prefer strongest ranked candidates instead of chasing every symbol in the sector.",
    }),
    playbook({
      id: "liquidity-sweep-reclaim",
      title: "Liquidity Sweep Reclaim",
      category: "liquidity_sweep",
      baseScore: sweepScore,
      risk: liquidationHeat,
      mode: "confirmation",
      regimes: ["chop", "expansion", "late_cycle"],
      assets,
      reason: `Liquidation pressure ${Math.round(liquidationHeat)} requires reclaim confirmation instead of immediate directional entry.`,
      conditions: ["Sweep occurs into known liquidity zone", "Reclaim candle closes back inside value", "CVD or orderbook imbalance stops deteriorating"],
      invalidation: ["Sweep extends without reclaim", "Absorption fails", "Spread widens during reclaim attempt"],
      catalyst: ["Liquidation flush", "Bid/ask absorption", "Fast reclaim"],
      operatorNote: "Best used as a reset play after forced liquidations, not before the sweep is complete.",
    }),
    playbook({
      id: "funding-reversal",
      title: "Funding Reversal Fade",
      category: "funding_reversal",
      baseScore: fundingReversalScore,
      risk: Math.max(fundingHeat, execution.friction),
      mode: "scalp",
      regimes: ["late_cycle", "chop"],
      assets,
      reason: `Funding pressure ${Math.round(fundingHeat)} and timing ${insight.timing} define contrarian fade quality.`,
      conditions: ["Crowded side shows exhaustion", "Price fails to continue after liquidation pressure", "Flow divergence appears"],
      invalidation: ["Crowded trend continues with fresh flow", "Funding cools without price reaction", "Macro aligns with the crowded direction"],
      catalyst: ["Crowding unwind", "Failed continuation", "Liquidation cascade fade"],
      operatorNote: "Treat as a tactical fade. Smaller size and faster invalidation are mandatory.",
    }),
    playbook({
      id: "mean-reversion-reset",
      title: "Mean Reversion Reset",
      category: "mean_reversion",
      baseScore: meanReversionScore,
      risk: Math.max(0, s.trendScore - 56) + Math.max(0, s.volatilityScore - 55),
      mode: "scalp",
      regimes: ["chop", "squeeze"],
      assets,
      reason: `Mean reversion fit improves when trend pressure is contained and execution quality remains clean.`,
      conditions: ["Range boundary reaction", "Volatility contained", "Execution score stays above neutral"],
      invalidation: ["Range breaks with volume", "Trend score accelerates", "No absorption near boundary"],
      catalyst: ["Range rejection", "Liquidity refill", "Volatility compression"],
      operatorNote: "This playbook is suppressed during strong trend expansion.",
    }),
    playbook({
      id: "defensive-observation",
      title: "Defensive Observation",
      category: "defensive",
      baseScore: defensiveScore,
      risk: riskDrag,
      mode: "standby",
      regimes: ["risk_off", "late_cycle"],
      assets: assets.length ? assets : ["OBSERVE"],
      reason: `Risk pressure ${Math.round(riskDrag)} and data quality ${snapshot.dataQuality} determine whether preserving optionality is superior.`,
      conditions: ["Execution friction high", "Macro or liquidation risk dominates", "No clean ranked candidate"],
      invalidation: ["Readiness recovers above friction", "Freshness returns to live", "Clear trigger appears with contained risk"],
      catalyst: ["Risk reset", "Spread normalization", "Cleaner event stack"],
      operatorNote: "Standing down is an active decision when signal quality is poor.",
    }),
  ].sort((a, b) => b.confidence - a.confidence)

  const active = playbooks.filter((item) => item.fitGrade !== "WEAK").slice(0, 4)
  const suppressed = playbooks.filter((item) => item.fitGrade === "WEAK" || item.confidence < 48).slice(0, 3)
  const primaryPlaybook = active[0] ?? playbooks[0]

  const strategyBias: TacticalStrategyOS["strategyBias"] =
    primaryPlaybook.category === "breakout"
      ? "momentum"
      : primaryPlaybook.category === "mean_reversion" || primaryPlaybook.category === "funding_reversal" || primaryPlaybook.category === "liquidity_sweep"
        ? "reversion"
        : primaryPlaybook.category === "rotation"
          ? "rotation"
          : primaryPlaybook.category === "defensive"
            ? "defensive"
            : "standby"

  const headline =
    execution.action === "AVOID" || primaryPlaybook.category === "defensive"
      ? "Strategy OS: preserve optionality"
      : `${primaryPlaybook.title} is the best live match`

  return {
    headline,
    regime: regimes,
    primaryPlaybook,
    playbooks: active,
    suppressedPlaybooks: suppressed,
    strategyBias,
    summary: `${primaryPlaybook.title} leads with ${primaryPlaybook.confidence}% confidence under ${regimes.join(" / ")} regime. ${primaryPlaybook.operatorNote}`,
  }
}
