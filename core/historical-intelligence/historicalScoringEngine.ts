import { listAcceptedEventLinks } from "./acceptedEventLinkerService"
import { mockHistoricalPersistenceRepository } from "./mockHistoricalPersistenceRepository"
import type { DecisionRecord, OutcomeRecord } from "./decisionRecordTypes"
import type { EventRecord } from "./eventRecordTypes"
import type { MemoryRecord } from "./historicalRecordTypes"
import type { PlaybookRecord } from "./playbookRecordTypes"
import type {
  HistoricalCompositeScore,
  HistoricalConfidenceScore,
  HistoricalImportanceScore,
  HistoricalLearningScore,
  HistoricalScoringResult,
} from "./historicalScoringTypes"

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function severityScore(severity?: string) {
  if (severity === "HIGH") return 88
  if (severity === "MEDIUM") return 68
  if (severity === "LOW") return 45
  return 50
}

function countLinks(targetId: string) {
  return listAcceptedEventLinks({ limit: 100 }).links.filter((link) => link.targetId === targetId || link.sourceEventId === targetId).length
}

function importance(recordId: string, base: number, replayFrequency: number, analogCount: number): HistoricalImportanceScore {
  const value = clamp(base * 0.55 + replayFrequency * 0.2 + Math.min(100, analogCount * 18) * 0.25)
  return {
    value,
    eventSignificance: clamp(base),
    replayFrequency: clamp(replayFrequency),
    historicalAnalogCount: analogCount,
    rationale: "Mock score from significance, replay frequency, and accepted relationship density.",
  }
}

function confidence(sourceConfidence: number, reviewLinks: number, completeness: number): HistoricalConfidenceScore {
  const reviewAcceptanceQuality = clamp(reviewLinks * 18)
  const value = clamp(sourceConfidence * 0.55 + reviewAcceptanceQuality * 0.2 + completeness * 0.25)
  return {
    value,
    sourceConfidence: clamp(sourceConfidence),
    reviewAcceptanceQuality,
    dataCompleteness: clamp(completeness),
    rationale: "Mock score from source confidence, accepted review links, and data completeness.",
  }
}

function learning(playbookLinkage: number, outcomeQuality: number, decisionUsefulness: number): HistoricalLearningScore {
  const value = clamp(playbookLinkage * 0.34 + outcomeQuality * 0.33 + decisionUsefulness * 0.33)
  return {
    value,
    playbookLinkage: clamp(playbookLinkage),
    outcomeQuality: clamp(outcomeQuality),
    decisionUsefulness: clamp(decisionUsefulness),
    rationale: "Mock score from playbook linkage, outcome quality, and decision usefulness.",
  }
}

function composite(
  recordId: string,
  recordType: HistoricalCompositeScore["recordType"],
  title: string,
  importanceScore: HistoricalImportanceScore,
  confidenceScore: HistoricalConfidenceScore,
  learningScore: HistoricalLearningScore,
): HistoricalCompositeScore {
  return {
    recordId,
    recordType,
    title,
    importance: importanceScore,
    confidence: confidenceScore,
    learning: learningScore,
    composite: clamp(importanceScore.value * 0.38 + confidenceScore.value * 0.3 + learningScore.value * 0.32),
  }
}

export function scoreEvent(record: EventRecord): HistoricalCompositeScore {
  const links = countLinks(record.id)
  const completeness = [record.title, record.summary, record.symbol, record.impact, record.narrative].filter(Boolean).length * 18
  const importanceScore = importance(record.id, severityScore(record.severity), record.relatedCaseIds.length * 35, links)
  const confidenceScore = confidence(record.confidence, links, completeness)
  const learningScore = learning(links * 25, record.impact?.realizedMovePct !== undefined ? 78 : 45, record.narrative ? 72 : 45)
  return composite(record.id, "event", record.title, importanceScore, confidenceScore, learningScore)
}

export function scoreMemory(record: MemoryRecord): HistoricalCompositeScore {
  const links = countLinks(record.id)
  const importanceScore = importance(record.id, 62, record.eventIds.length * 30, links)
  const confidenceScore = confidence(record.confidence, links, [record.title, record.summary, record.data].filter(Boolean).length * 28)
  const learningScore = learning(links * 24, record.memoryType === "setup_pattern" ? 78 : 62, 65)
  return composite(record.id, "memory", record.title, importanceScore, confidenceScore, learningScore)
}

export function scoreDecision(record: DecisionRecord): HistoricalCompositeScore {
  const links = countLinks(record.id)
  const importanceScore = importance(record.id, 58, record.caseId ? 55 : 10, links)
  const confidenceScore = confidence(record.confidence, links, [record.decisionReason, record.expectedOutcome, record.actualOutcome, record.futureRule].filter(Boolean).length * 22)
  const learningScore = learning(links * 20, record.actualOutcome ? 76 : 45, record.mistakeTag === "none" ? 58 : 82)
  return composite(record.id, "decision", `${record.decision.toUpperCase()} decision`, importanceScore, confidenceScore, learningScore)
}

export function scoreOutcome(record: OutcomeRecord): HistoricalCompositeScore {
  const links = countLinks(record.id)
  const outcomeQuality = record.outcome === "win" || record.outcome === "avoided" ? 84 : record.outcome === "loss" ? 52 : 64
  const importanceScore = importance(record.id, 60, record.caseId ? 55 : 10, links)
  const confidenceScore = confidence(record.confidence, links, [record.actualOutcome, record.lesson, record.futureRule, record.realizedMovePct].filter((item) => item !== undefined).length * 22)
  const learningScore = learning(links * 20, outcomeQuality, record.mistakeTags.length ? 78 : 55)
  return composite(record.id, "outcome", record.actualOutcome, importanceScore, confidenceScore, learningScore)
}

export function scorePlaybook(record: PlaybookRecord): HistoricalCompositeScore {
  const links = countLinks(record.id)
  const checklistDepth = record.executionChecklist.length + record.invalidationChecklist.length
  const importanceScore = importance(record.id, 65, record.relatedCaseIds.length * 35, links)
  const confidenceScore = confidence(record.confidence, links, [record.historicalLesson, record.keyMistake, record.keyConfirmationSignal].filter(Boolean).length * 25)
  const learningScore = learning(Math.min(100, checklistDepth * 22 + links * 15), 76, 82)
  return composite(record.id, "playbook", record.title, importanceScore, confidenceScore, learningScore)
}

export async function getHistoricalScoringResult(): Promise<HistoricalScoringResult> {
  const [events, memories, decisions, outcomes, playbooks] = await Promise.all([
    mockHistoricalPersistenceRepository.events.list({ limit: 100 }),
    mockHistoricalPersistenceRepository.memories.list({ limit: 100 }),
    mockHistoricalPersistenceRepository.decisions.list({ limit: 100 }),
    mockHistoricalPersistenceRepository.outcomes.list({ limit: 100 }),
    mockHistoricalPersistenceRepository.playbooks.list({ limit: 100 }),
  ])

  const scored = {
    events: events.records.map(scoreEvent).sort((a, b) => b.composite - a.composite),
    memories: memories.records.map(scoreMemory).sort((a, b) => b.composite - a.composite),
    decisions: decisions.records.map(scoreDecision).sort((a, b) => b.composite - a.composite),
    outcomes: outcomes.records.map(scoreOutcome).sort((a, b) => b.composite - a.composite),
    playbooks: playbooks.records.map(scorePlaybook).sort((a, b) => b.composite - a.composite),
  }
  const allScores = [...scored.events, ...scored.memories, ...scored.decisions, ...scored.outcomes, ...scored.playbooks]

  return {
    ...scored,
    summary: {
      averageScore: average(allScores.map((score) => score.composite)),
      highestConfidenceItem: [...allScores].sort((a, b) => b.confidence.value - a.confidence.value)[0],
      highestLearningValueItem: [...allScores].sort((a, b) => b.learning.value - a.learning.value)[0],
    },
  }
}
