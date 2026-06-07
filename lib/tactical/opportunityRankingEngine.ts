import type { StableTacticalInputSnapshot } from "./stableTacticalInput"
import type { TacticalEvent } from "./tacticalEventBus"
import type { DirectionalBias } from "./tacticalVerdictEngine"

export type OpportunityGrade = "A+ Tactical" | "A Tactical" | "B Reactive" | "C Noise"

export type RankedOpportunity = {
  symbol: string
  label: string
  score: number
  grade: OpportunityGrade
  bias: "LONG" | "SHORT" | "NEUTRAL"
  setup: string
  reason: string
  risk: string
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function biasFromDirectionalBias(bias: DirectionalBias): RankedOpportunity["bias"] {
  if (bias === "LONG BIAS") return "LONG"
  if (bias === "SHORT BIAS") return "SHORT"
  return "NEUTRAL"
}

function grade(score: number): OpportunityGrade {
  if (score >= 82) return "A+ Tactical"
  if (score >= 70) return "A Tactical"
  if (score >= 55) return "B Reactive"
  return "C Noise"
}

export function rankTacticalOpportunities(input: {
  snapshot: StableTacticalInputSnapshot
  events: TacticalEvent[]
  bias: DirectionalBias
}): RankedOpportunity[] {
  const { snapshot, events, bias } = input
  const candidates = snapshot.opportunityCandidates?.length
    ? snapshot.opportunityCandidates
    : [
        { symbol: "BTCUSDT", label: "BTC", scores: snapshot.input },
        {
          symbol: "ETHUSDT",
          label: "ETH",
          scores: {
            ...snapshot.input,
            momentumScore: clamp(snapshot.input.momentumScore - 3),
            rotationScore: clamp((snapshot.input.rotationScore ?? 50) + 2),
          },
        },
        {
          symbol: "SOLUSDT",
          label: "SOL",
          scores: {
            ...snapshot.input,
            momentumScore: clamp(snapshot.input.momentumScore + 5),
            volatilityScore: clamp(snapshot.input.volatilityScore + 7),
            liquidityScore: clamp(snapshot.input.liquidityScore - 5),
          },
        },
      ]

  const eventTailwind = events
    .filter((event) => event.type !== "CHASE_RISK" && event.type !== "EXECUTION_FRICTION" && event.type !== "NO_CLEAN_EDGE")
    .reduce((sum, event) => sum + event.severity * event.confidence, 0) / 10000

  const eventDrag = events
    .filter((event) => event.type === "CHASE_RISK" || event.type === "EXECUTION_FRICTION" || event.type === "NO_CLEAN_EDGE")
    .reduce((sum, event) => sum + event.severity * event.confidence, 0) / 10000

  return candidates
    .map((candidate) => {
      const s = candidate.scores
      const opportunityScore = clamp(
        s.momentumScore * 0.2 +
          s.trendScore * 0.18 +
          s.flowScore * 0.18 +
          (s.rotationScore ?? 50) * 0.14 +
          s.executionScore * 0.16 +
          s.liquidityScore * 0.1 +
          eventTailwind * 4 -
          eventDrag * 5 -
          Math.max(0, (s.volatilityScore - 70) * 0.35) -
          Math.max(0, ((s.macroRiskScore ?? 50) - 60) * 0.45),
      )

      const setup =
        opportunityScore >= 76
          ? "Primary tactical candidate"
          : opportunityScore >= 62
            ? "Selective continuation candidate"
            : opportunityScore >= 50
              ? "Reactive only"
              : "Noise / standby"

      const risk =
        s.volatilityScore >= 70
          ? "Chase/exhaustion risk"
          : s.executionScore <= 45
            ? "Execution quality weak"
            : (s.liquidationPressure ?? 35) >= 65
              ? "Liquidation sweep risk"
              : "Risk contained"

      return {
        symbol: candidate.symbol,
        label: candidate.label ?? candidate.symbol,
        score: Math.round(opportunityScore),
        grade: grade(opportunityScore),
        bias: biasFromDirectionalBias(bias),
        setup,
        reason: `Momentum ${Math.round(s.momentumScore)}, flow ${Math.round(s.flowScore)}, execution ${Math.round(s.executionScore)}.`,
        risk,
      }
    })
    .sort((a, b) => b.score - a.score)
}
