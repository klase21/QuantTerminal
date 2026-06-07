import { getExpectationIntelligence } from "./expectationIntelligenceEngine"
import { getAllReplayCases, getReplayCaseById } from "./mockHistoricalIntelligenceRepository"
import { getReplayExplanation } from "./replayExplanationEngine"
import { getSetupOutcomeMemory } from "./setupOutcomeMemoryEngine"
import { getTacticalPlaybook } from "./tacticalPlaybookEngine"
import type { ReplayDecision, ReplayDecisionJournal, ReplayDecisionJournalQuery } from "./replayDecisionJournalTypes"

const GENERATED_AT = "2026-06-07T00:00:00.000Z"

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function selectedReplay(query?: ReplayDecisionJournalQuery) {
  return (
    (query?.caseId ? getReplayCaseById(query.caseId) : null) ??
    getAllReplayCases().find((replay) => !query?.symbol || replay.symbol === query.symbol) ??
    null
  )
}

function decisionFor(verdict: string, winRate: number, riskLevel: string): ReplayDecision {
  if (riskLevel === "HIGH" && verdict !== "Narrative Confirmed") return "avoid"
  if (winRate < 45) return "wait"
  if (verdict === "Narrative Confirmed") return "long"
  if (verdict === "Reality Diverged") return "wait"
  return "avoid"
}

export function getReplayDecisionJournal(query?: ReplayDecisionJournalQuery): ReplayDecisionJournal | null {
  const replay = selectedReplay(query)
  if (!replay) return null

  const explanation = getReplayExplanation({ caseId: replay.id })
  const setupMemory = getSetupOutcomeMemory(replay)
  const expectation = getExpectationIntelligence(replay)
  const playbook = getTacticalPlaybook(replay)
  const latestRisk = replay.frames.at(-1)?.risk.level ?? "MEDIUM"
  const decision = decisionFor(replay.verdict, setupMemory.winRate, latestRisk)
  const confidence = clamp(
    expectation.confidence * 0.28 +
      setupMemory.winRate * 0.22 +
      (explanation?.setupResult === "worked" ? 24 : explanation?.setupResult === "mixed" ? 16 : 10) +
      (decision === "avoid" || decision === "wait" ? 12 : 8),
  )

  return {
    ok: true,
    generatedAt: GENERATED_AT,
    selectedCase: {
      id: replay.id,
      title: replay.title,
      symbol: replay.symbol,
      verdict: replay.verdict,
    },
    hypotheticalDecision: decision,
    decisionReason:
      decision === "long"
        ? "Mock journal would wait for confirmation, then take the aligned continuation setup."
        : decision === "short"
          ? "Mock journal would only short after structure and flow confirmed downside continuation."
          : decision === "wait"
            ? "Mock journal would wait because the driver stack was mixed or incomplete."
            : "Mock journal would avoid because execution risk outweighed confirmation quality.",
    invalidationCondition: playbook.invalidationChecklist[0] ?? "Narrative unsupported by flow.",
    expectedOutcome: expectation.dominantExpectedOutcome,
    actualOutcome: replay.outcome,
    mistakeTag:
      replay.verdict === "Reality Diverged"
        ? "headline_attribution_risk"
        : replay.verdict === "Narrative Failed"
          ? "unsupported_narrative"
          : "late_entry_risk",
    lesson: explanation?.tacticalLesson ?? playbook.lesson,
    futureRule: explanation?.futureExecutionRule ?? `Next time: ${playbook.playbook.slice(0, 3).join(" -> ")}.`,
    confidence,
  }
}
