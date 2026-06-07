import type { ReplayCase } from "@/core/replay/replayTypes"

export type ExpectationMomentum = "rising" | "falling" | "stable" | "unavailable"
export type ExpectationConviction = "low" | "medium" | "high"
export type ExpectationPricingStatus = "priced-in" | "underpriced" | "overreacted" | "placeholder"

export interface ExpectationIntelligenceSummary {
  dominantExpectedOutcome: string
  expectationProbability: number
  expectationMomentum: ExpectationMomentum
  convictionLevel: ExpectationConviction
  surpriseScore: number
  pricingStatus: ExpectationPricingStatus
  interpretation: string
  confidence: number
}

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function momentumFromProbabilities(probabilities: number[]): ExpectationMomentum {
  if (probabilities.length < 2) return "unavailable"
  const change = probabilities[probabilities.length - 1]! - probabilities[0]!
  if (change >= 5) return "rising"
  if (change <= -5) return "falling"
  return "stable"
}

function convictionFromProbability(probability: number): ExpectationConviction {
  if (probability >= 75) return "high"
  if (probability >= 50) return "medium"
  return "low"
}

function pricingStatus(probability: number, surpriseScore: number): ExpectationPricingStatus {
  if (probability <= 0) return "placeholder"
  if (probability >= 75 && surpriseScore <= 35) return "priced-in"
  if (probability < 50 && surpriseScore >= 55) return "underpriced"
  if (probability >= 65 && surpriseScore >= 55) return "overreacted"
  return "priced-in"
}

function outcomeAlignedWithExpectation(replay: ReplayCase, probability: number) {
  if (replay.verdict === "Narrative Confirmed") return probability >= 50
  if (replay.verdict === "Narrative Failed") return probability < 50
  return probability >= 35 && probability <= 70
}

export function getExpectationIntelligence(replay: ReplayCase): ExpectationIntelligenceSummary {
  const snapshots = replay.frames.map((frame) => frame.expectation)
  const usableSnapshots = snapshots.filter((snapshot) => snapshot.status !== "placeholder" && snapshot.probability > 0)

  if (!usableSnapshots.length) {
    return {
      dominantExpectedOutcome: "No prediction market snapshot available",
      expectationProbability: 0,
      expectationMomentum: "unavailable",
      convictionLevel: "low",
      surpriseScore: 0,
      pricingStatus: "placeholder",
      interpretation: "Expectation layer is a placeholder for this case. Future adapters can map CME FedWatch, Polymarket, Kalshi, or internal expectation snapshots here.",
      confidence: 20,
    }
  }

  const probabilities = usableSnapshots.map((snapshot) => snapshot.probability)
  const probability = Math.round(average(probabilities))
  const firstProbability = probabilities[0] ?? probability
  const lastProbability = probabilities[probabilities.length - 1] ?? probability
  const repricingMagnitude = Math.abs(lastProbability - firstProbability)
  const aligned = outcomeAlignedWithExpectation(replay, probability)
  const surpriseScore = clamp(Math.round((100 - probability) * (aligned ? 0.55 : 0.85) + repricingMagnitude * 1.5))
  const status = pricingStatus(probability, surpriseScore)
  const dominantExpectedOutcome = usableSnapshots[usableSnapshots.length - 1]?.label ?? "Mock expectation outcome"
  const convictionLevel = convictionFromProbability(probability)

  return {
    dominantExpectedOutcome,
    expectationProbability: probability,
    expectationMomentum: momentumFromProbabilities(probabilities),
    convictionLevel,
    surpriseScore,
    pricingStatus: status,
    interpretation:
      status === "underpriced"
        ? "The replay suggests expectations did not fully price the realized event path."
        : status === "overreacted"
          ? "Expectation was elevated, but realized evidence did not cleanly justify the reaction."
          : `${usableSnapshots[usableSnapshots.length - 1]?.interpretation ?? "Mock expectation snapshot"} Expectation read looks ${convictionLevel} conviction.`,
    confidence: clamp(Math.round(probability * 0.55 + usableSnapshots.length * 8 + (aligned ? 18 : 6))),
  }
}
