import type { ReplayCase } from "@/core/replay/replayTypes"
import type { SimilarEventMatch } from "./historicalIntelligenceTypes"

export type ReplaySetupResult = "worked" | "failed" | "mixed"

export interface ReplayExplanationQuery {
  caseId?: string
  symbol?: string
}

export interface ReplayExplanation {
  ok: true
  generatedAt: string
  selectedReplayCase: {
    id: string
    title: string
    symbol: string
    verdict: ReplayCase["verdict"]
  }
  setupResult: ReplaySetupResult
  primaryReason: string
  supportingFactors: string[]
  failureFactors: string[]
  similarHistoricalAnalogs: SimilarEventMatch[]
  expectationAlignment: string
  agentAccuracyContext: string
  marketMemoryContext: string
  predictionMarketContext: string
  tacticalLesson: string
  futureExecutionRule: string
  caveat: string
}
