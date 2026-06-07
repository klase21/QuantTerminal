import { getAgentAccuracyStats } from "./agentAccuracyEngine"
import { getEventMemoryLinker } from "./eventMemoryLinkerEngine"
import { getExpectationIntelligence } from "./expectationIntelligenceEngine"
import { getMarketMemory } from "./marketMemoryEngine"
import { getAllReplayCases, getReplayCaseById } from "./mockHistoricalIntelligenceRepository"
import { getPredictionMarketIntelligence } from "./predictionMarketEngine"
import { getSetupOutcomeMemory } from "./setupOutcomeMemoryEngine"
import { findSimilarReplayCases } from "./similarHistoricalEventEngine"
import { getTacticalPlaybook } from "./tacticalPlaybookEngine"
import type { ReplayExplanation, ReplayExplanationQuery, ReplaySetupResult } from "./replayExplanationTypes"

const GENERATED_AT = "2026-06-07T00:00:00.000Z"

function setupResult(verdict: string): ReplaySetupResult {
  if (verdict === "Narrative Confirmed") return "worked"
  if (verdict === "Narrative Failed") return "failed"
  return "mixed"
}

function selectedReplay(query?: ReplayExplanationQuery) {
  return (
    (query?.caseId ? getReplayCaseById(query.caseId) : null) ??
    getAllReplayCases().find((replay) => !query?.symbol || replay.symbol === query.symbol) ??
    null
  )
}

export function getReplayExplanation(query?: ReplayExplanationQuery): ReplayExplanation | null {
  const replay = selectedReplay(query)
  if (!replay) return null

  const result = setupResult(replay.verdict)
  const similar = findSimilarReplayCases(replay, 3)
  const setupMemory = getSetupOutcomeMemory(replay)
  const expectation = getExpectationIntelligence(replay)
  const playbook = getTacticalPlaybook(replay)
  const agentAccuracy = getAgentAccuracyStats()
  const marketMemory = getMarketMemory({ caseId: replay.id })
  const predictionMarkets = getPredictionMarketIntelligence({ caseId: replay.id })
  const eventLink = getEventMemoryLinker({ caseId: replay.id })
  const topDriver = replay.frames.at(-1)?.narrative.possibleDrivers[0]
  const topAgent = agentAccuracy[0]

  return {
    ok: true,
    generatedAt: GENERATED_AT,
    selectedReplayCase: {
      id: replay.id,
      title: replay.title,
      symbol: replay.symbol,
      verdict: replay.verdict,
    },
    setupResult: result,
    primaryReason:
      result === "worked"
        ? `${topDriver?.driver ?? "Confirmed driver stack"} likely contributed because narrative, flow, and expectation context aligned.`
        : result === "failed"
          ? "The setup likely failed because the narrative did not receive enough confirming flow or expectation evidence."
          : `${topDriver?.driver ?? "Driver divergence"} likely contributed, but historical context suggests the headline narrative was incomplete.`,
    supportingFactors: [
      playbook.confirmation,
      `${expectation.pricingStatus} expectation context at ${expectation.expectationProbability}% probability`,
      marketMemory.tacticalMemoryTakeaway,
    ],
    failureFactors: [
      setupMemory.commonFailureMode,
      playbook.worstExecutionCondition,
      eventLink?.caveat ?? "Confidence is limited by mock data.",
    ],
    similarHistoricalAnalogs: similar,
    expectationAlignment: `Historical context suggests expectation was ${expectation.pricingStatus}; surprise score ${expectation.surpriseScore}/100.`,
    agentAccuracyContext: `${topAgent?.agent ?? "Agent committee"} is the strongest mock reliability context at ${topAgent?.accuracyScore ?? 0}%.`,
    marketMemoryContext: marketMemory.tacticalMemoryTakeaway,
    predictionMarketContext: predictionMarkets.tacticalInterpretation,
    tacticalLesson: playbook.lesson,
    futureExecutionRule: `Next time: ${playbook.playbook.slice(0, 3).join(" -> ")}.`,
    caveat: "Mock data only. This explanation is not a live signal and should be used as historical context.",
  }
}
