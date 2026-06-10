import type { InformationSourceCategory, InformationSourceProvider, InformationSourceVerificationMode } from "./informationSourceTypes"
import type { CompositeIntelligenceScore } from "./informationScoringTypes"

export type InformationItemStatus = "raw" | "normalized" | "clustered" | "scored" | "archived"
export type InformationTimeSensitivity = "minutes" | "hours" | "days" | "weeks"
export type InformationSignalDirection = "bullish" | "bearish" | "neutral" | "mixed"
export type InformationSignalType = "reliability" | "attention" | "narrative" | "impact" | "novelty" | "corroboration"

export interface InformationSource {
  id: string
  provider: InformationSourceProvider
  category: InformationSourceCategory
  displayName: string
  verificationMode: InformationSourceVerificationMode
  reputationScore: number
  sourceUrl?: string
}

export interface InformationItem {
  id: string
  source: InformationSource
  title: string
  summary: string
  rawText?: string
  symbol?: string
  assetTags: string[]
  narrativeTags: string[]
  topicTags: string[]
  publishedAt: string
  firstSeenAt: string
  ingestedAt: string
  status: InformationItemStatus
  timeSensitivity: InformationTimeSensitivity
  language?: string
  region?: string
  sourceUrl?: string
  metadata: Record<string, unknown>
}

export interface InformationSignal {
  id: string
  itemId: string
  type: InformationSignalType
  direction: InformationSignalDirection
  strength: number
  confidence: number
  explanation: string
  observedAt: string
}

export interface InformationNarrative {
  id: string
  label: string
  stage: "emerging" | "growing" | "dominant" | "declining" | "dead"
  summary: string
  itemIds: string[]
  symbols: string[]
  narrativeTags: string[]
  confidence: number
  firstSeenAt: string
  updatedAt: string
}

export interface InformationCluster {
  id: string
  title: string
  summary: string
  itemIds: string[]
  sourceProviders: InformationSourceProvider[]
  symbols: string[]
  narrativeIds: string[]
  dominantNarrative?: string
  spreadScore: number
  averageReliability: number
  createdAt: string
  updatedAt: string
}

export interface InformationScore {
  itemId: string
  score: CompositeIntelligenceScore
  scoredAt: string
  scoringVersion: "information-intelligence-v1"
}

