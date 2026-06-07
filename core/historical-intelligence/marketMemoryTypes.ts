import type { ReplayAgentName, ReplayVerdict } from "@/core/replay/replayTypes"
import type { HistoricalReplayEventType } from "./mockHistoricalIntelligenceRepository"

export interface MarketMemoryQuery {
  caseId?: string
  symbol?: string
  eventType?: HistoricalReplayEventType
  limit?: number
}

export interface RememberedMarketRegime {
  id: string
  label: string
  eventType: HistoricalReplayEventType
  symbol: string
  shockLevel: "low" | "medium" | "high"
  verdict: ReplayVerdict
  memoryRead: string
}

export interface SimilarEventCluster {
  id: string
  label: string
  caseIds: string[]
  sharedDrivers: string[]
  averageSimilarity: number
  clusterRead: string
}

export interface RecurringSetupPattern {
  id: string
  label: string
  sampleSize: number
  winRate: number
  commonFailureMode: string
  tacticalLesson: string
}

export interface AgentReliabilityNote {
  agent: Exclude<ReplayAgentName, "Final Verdict / Narrative vs Reality">
  accuracyScore: number
  strongestEnvironment: string
  weakestEnvironment: string
  takeaway: string
}

export interface ExpectedReactionSummary {
  caseId: string
  expectedOutcome: string
  probability: number
  pricedInStatus: string
  surpriseScore: number
  interpretation: string
}

export interface MarketMemorySnapshot {
  ok: true
  generatedAt: string
  scope: "catalog" | "case" | "filtered"
  rememberedMarketRegimes: RememberedMarketRegime[]
  similarEventClusters: SimilarEventCluster[]
  recurringSetupPatterns: RecurringSetupPattern[]
  agentReliabilityNotes: AgentReliabilityNote[]
  expectedReactionSummaries: ExpectedReactionSummary[]
  tacticalMemoryTakeaway: string
}

export interface MarketMemoryRepository {
  getMarketMemory(query?: MarketMemoryQuery): MarketMemorySnapshot
}
