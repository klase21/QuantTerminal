import { getAgentAccuracyStats } from "./agentAccuracyEngine"
import { getExpectationIntelligence } from "./expectationIntelligenceEngine"
import { getAllReplayCases, getReplayCaseById } from "./mockHistoricalIntelligenceRepository"
import { getPredictionMarketIntelligence } from "./predictionMarketEngine"
import { getSetupOutcomeMemory } from "./setupOutcomeMemoryEngine"
import { findSimilarReplayCases } from "./similarHistoricalEventEngine"
import { getTacticalPlaybook } from "./tacticalPlaybookEngine"
import type { EventMemoryLinkerQuery, EventMemoryLinkerSnapshot } from "./eventMemoryLinkerTypes"

const GENERATED_AT = "2026-06-07T00:00:00.000Z"

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function getEventMemoryLinker(query?: EventMemoryLinkerQuery): EventMemoryLinkerSnapshot | null {
  const replay =
    (query?.caseId ? getReplayCaseById(query.caseId) : null) ??
    getAllReplayCases().find((item) => !query?.symbol || item.symbol === query.symbol) ??
    null

  if (!replay) return null

  const predictionMarkets = getPredictionMarketIntelligence({ caseId: replay.id, symbol: replay.symbol })
  const predictionSignal = predictionMarkets.marketEvents[0] ?? null
  const similarEvents = findSimilarReplayCases(replay, 3)
  const setupMemory = getSetupOutcomeMemory(replay)
  const expectation = getExpectationIntelligence(replay)
  const playbook = getTacticalPlaybook(replay)
  const agentStats = getAgentAccuracyStats()
  const topAgent = agentStats[0]
  const weakestAgent = agentStats[agentStats.length - 1]
  const confidenceInputs = [
    predictionSignal ? 18 : 6,
    similarEvents.length * 8,
    Math.min(20, setupMemory.sampleSize * 5),
    expectation.confidence * 0.18,
    (topAgent?.accuracyScore ?? 50) * 0.18,
  ]
  const memoryConfidenceScore = clamp(confidenceInputs.reduce((sum, value) => sum + value, 0))

  return {
    ok: true,
    generatedAt: GENERATED_AT,
    sourceEvent: {
      caseId: replay.id,
      title: replay.title,
      symbol: replay.symbol,
      verdict: replay.verdict,
      sourceRead: replay.realityCheck,
    },
    linkedPredictionMarketSignal: predictionSignal,
    similarHistoricalEvents: similarEvents,
    relatedSetupOutcomePattern: {
      sampleSize: setupMemory.sampleSize,
      winRate: setupMemory.winRate,
      commonFailureMode: setupMemory.commonFailureMode,
      tacticalLesson: setupMemory.tacticalLesson,
    },
    expectationAlignment: {
      expectedOutcome: expectation.dominantExpectedOutcome,
      probability: expectation.expectationProbability,
      pricedInStatus: expectation.pricingStatus,
      surpriseScore: expectation.surpriseScore,
      alignmentRead: `Crowd expectation context is ${expectation.pricingStatus}; confidence is limited by mock data.`,
    },
    agentReliabilityContext: {
      topAgent: topAgent?.agent ?? "Risk Agent",
      weakestAgent: weakestAgent?.agent ?? "Narrative Agent",
      reliabilityRead: `${topAgent?.agent ?? "Risk Agent"} is the strongest mock reliability context; cross-check ${weakestAgent?.agent ?? "Narrative Agent"} before execution.`,
    },
    tacticalPlaybookMatch: {
      lesson: playbook.lesson,
      confirmation: playbook.confirmation,
      executionChecklist: playbook.executionChecklist,
      invalidationChecklist: playbook.invalidationChecklist,
    },
    memoryConfidenceScore,
    executionImplication:
      memoryConfidenceScore >= 72
        ? "Possible linkage is useful as a historical analog, but execution still requires fresh flow and structure confirmation."
        : "Possible linkage is weak-to-moderate; treat this as crowd expectation context, not a live trading signal.",
    caveat: "This is a mock-first memory link. Confidence is limited by mock data and should not be treated as a live trading signal.",
  }
}
