import type { ReplayDecision } from "./replayDecisionJournalTypes"
import type { HistoricalRecordAudit, HistoricalRecordStatus } from "./historicalRecordTypes"
import type { TradeOutcome } from "./historicalIntelligenceTypes"

export type DecisionRecordMode = "hypothetical" | "paper" | "live_review"
export type DecisionMistakeTag =
  | "headline_attribution_risk"
  | "unsupported_narrative"
  | "late_entry_risk"
  | "poor_invalidation"
  | "expectation_misread"
  | "flow_ignored"
  | "none"

export interface DecisionRecord {
  id: string
  caseId: string
  mode: DecisionRecordMode
  decidedAt: string
  symbol: string
  decision: ReplayDecision
  decisionReason: string
  invalidationCondition: string
  expectedOutcome: string
  actualOutcome?: string
  mistakeTag: DecisionMistakeTag
  lesson: string
  futureRule: string
  confidence: number
  sourceIds: string[]
  relatedOutcomeId?: string
  status: HistoricalRecordStatus
  audit: HistoricalRecordAudit
}

export interface OutcomeRecord {
  id: string
  caseId?: string
  decisionId?: string
  symbol: string
  observedAt: string
  outcome: TradeOutcome
  realizedMovePct?: number
  maxAdverseMovePct?: number
  maxFavorableMovePct?: number
  holdMinutes?: number
  expectedOutcome?: string
  actualOutcome: string
  mistakeTags: DecisionMistakeTag[]
  lesson: string
  futureRule: string
  confidence: number
  tags: string[]
  sourceIds: string[]
  status: HistoricalRecordStatus
  audit: HistoricalRecordAudit
}
