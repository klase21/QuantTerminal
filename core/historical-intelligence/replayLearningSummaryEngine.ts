import { getAgentAccuracyStats } from "./agentAccuracyEngine"
import { getEventMemoryLinker } from "./eventMemoryLinkerEngine"
import { getExpectationIntelligence } from "./expectationIntelligenceEngine"
import { getMarketMemory } from "./marketMemoryEngine"
import { getAllReplayCases, getReplayCaseById } from "./mockHistoricalIntelligenceRepository"
import { getPredictionMarketIntelligence } from "./predictionMarketEngine"
import { getReplayExplanation } from "./replayExplanationEngine"
import { getSetupOutcomeMemory } from "./setupOutcomeMemoryEngine"
import { getTacticalPlaybook } from "./tacticalPlaybookEngine"
import type { ReplayLearningSummary, ReplayLearningSummaryQuery } from "./replayLearningSummaryTypes"

const GENERATED_AT = "2026-06-07T00:00:00.000Z"

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function selectedReplay(query?: ReplayLearningSummaryQuery) {
  return (
    (query?.caseId ? getReplayCaseById(query.caseId) : null) ??
    getAllReplayCases().find((replay) => !query?.symbol || replay.symbol === query.symbol) ??
    null
  )
}

export function getReplayLearningSummary(query?: ReplayLearningSummaryQuery): ReplayLearningSummary | null {
  const replay = selectedReplay(query)
  if (!replay) return null

  const explanation = getReplayExplanation({ caseId: replay.id })
  const setupMemory = getSetupOutcomeMemory(replay)
  const expectation = getExpectationIntelligence(replay)
  const marketMemory = getMarketMemory({ caseId: replay.id })
  const predictionMarkets = getPredictionMarketIntelligence({ caseId: replay.id })
  const eventLink = getEventMemoryLinker({ caseId: replay.id })
  const playbook = getTacticalPlaybook(replay)
  const agentStats = getAgentAccuracyStats({ replay })
  const topAgent = agentStats[0]
  const confidence = clamp(
    (explanation ? 18 : 8) +
      expectation.confidence * 0.22 +
      (eventLink?.memoryConfidenceScore ?? 40) * 0.24 +
      (topAgent?.accuracyScore ?? 50) * 0.18 +
      Math.min(18, setupMemory.sampleSize * 4),
  )

  return {
    ok: true,
    generatedAt: GENERATED_AT,
    caseId: replay.id,
    caseTitle: replay.title,
    symbol: replay.symbol,
    caseVerdict: replay.verdict,
    whatWorked:
      explanation?.supportingFactors[0] ??
      `${playbook.confirmation} was the strongest mock confirmation path for this replay.`,
    whatFailedOrWarned:
      explanation?.failureFactors[0] ??
      `${setupMemory.commonFailureMode} remained the primary warning from setup memory.`,
    historicalLesson: explanation?.tacticalLesson ?? playbook.lesson,
    agentLesson: topAgent?.alignmentRead
      ? `${topAgent.agent}: ${topAgent.alignmentRead}`
      : `${topAgent?.agent ?? "Agent committee"} carried the strongest mock reliability context; use weaker agents as cross-checks, not sole triggers.`,
    agentAlignment: topAgent?.caseAlignment,
    agentAlignmentRead: topAgent?.alignmentRead,
    agentFallbackNote: topAgent?.fallbackNote,
    futureExecutionRule: explanation?.futureExecutionRule ?? `Next time: ${playbook.playbook.slice(0, 3).join(" -> ")}.`,
    confidence,
    caveat: `Mock data only. ${marketMemory.tacticalMemoryTakeaway} Crowd context: ${predictionMarkets.dominantCrowdExpectation}`,
  }
}
