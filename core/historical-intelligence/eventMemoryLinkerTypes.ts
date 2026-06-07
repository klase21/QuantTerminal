import type { ReplayAgentName } from "@/core/replay/replayTypes"
import type { SimilarEventMatch } from "./historicalIntelligenceTypes"
import type { PredictionMarketEvent } from "./predictionMarketTypes"

export interface EventMemoryLinkerQuery {
  caseId?: string
  symbol?: string
}

export interface EventMemorySourceEvent {
  caseId: string
  title: string
  symbol: string
  verdict: string
  sourceRead: string
}

export interface EventMemorySetupPattern {
  sampleSize: number
  winRate: number
  commonFailureMode: string
  tacticalLesson: string
}

export interface EventMemoryExpectationAlignment {
  expectedOutcome: string
  probability: number
  pricedInStatus: string
  surpriseScore: number
  alignmentRead: string
}

export interface EventMemoryAgentContext {
  topAgent: Exclude<ReplayAgentName, "Final Verdict / Narrative vs Reality">
  weakestAgent: Exclude<ReplayAgentName, "Final Verdict / Narrative vs Reality">
  reliabilityRead: string
}

export interface EventMemoryPlaybookMatch {
  lesson: string
  confirmation: string
  executionChecklist: string[]
  invalidationChecklist: string[]
}

export interface EventMemoryLinkerSnapshot {
  ok: true
  generatedAt: string
  sourceEvent: EventMemorySourceEvent
  linkedPredictionMarketSignal: PredictionMarketEvent | null
  similarHistoricalEvents: SimilarEventMatch[]
  relatedSetupOutcomePattern: EventMemorySetupPattern
  expectationAlignment: EventMemoryExpectationAlignment
  agentReliabilityContext: EventMemoryAgentContext
  tacticalPlaybookMatch: EventMemoryPlaybookMatch
  memoryConfidenceScore: number
  executionImplication: string
  caveat: string
}
