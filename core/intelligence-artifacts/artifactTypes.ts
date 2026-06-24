import type { EvidenceValidity } from "@/core/evidence-validity"
import type { InvestigationThesis } from "@/types/investigationThesis"
import type { ContradictionAnalysis } from "@/core/contradiction"
import type { DecisionBrief } from "@/core/decision-brief"

export const INTELLIGENCE_ARTIFACT_SCHEMA_VERSION = 1

export type IntelligenceArtifactType =
  | "historical_analog"
  | "replay_intelligence"
  | "replay_learning"
  | "dashboard_evidence"
  | "event_impact"
  | "market_memory"
  | "exchange_flow"
  | "exchange_reserve_snapshot"
  | "exchange_reserve_delta"
  | "reserve_intelligence"
  | "treasury_snapshot"
  | "etf_snapshot"
  | `custom:${string}`

export type IntelligenceArtifactStatus = "active" | "expired" | "archived"

export interface IntelligenceArtifactSource {
  system: string
  producerVersion: string
  dataset?: string
  cacheIdentity?: string
  references?: string[]
}

export type IntelligenceEvidenceKind =
  | "market_data"
  | "historical_case"
  | "outcome"
  | "event"
  | "expectation"
  | "narrative"
  | "calculation"
  | "source_reference"

export interface IntelligenceSupportingEvidence {
  id: string
  kind: IntelligenceEvidenceKind
  title: string
  summary?: string
  observedAt?: string
  source: string
  confidence?: number
  references?: string[]
  metadata?: Record<string, unknown>
}

export interface IntelligenceArtifact<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  schemaVersion: number
  id: string
  type: IntelligenceArtifactType
  title: string
  summary: string
  confidence: number
  source: IntelligenceArtifactSource
  generatedAt: string
  expiresAt: string | null
  validity: EvidenceValidity
  thesis?: InvestigationThesis
  contradiction?: ContradictionAnalysis
  decisionBrief?: DecisionBrief
  supportingEvidence: IntelligenceSupportingEvidence[]
  metadata: TMetadata
  tags?: string[]
  subjects?: {
    symbols?: string[]
    exchanges?: string[]
    eventIds?: string[]
    caseIds?: string[]
  }
}

export interface IntelligenceArtifactSummary {
  id: string
  schemaVersion: number
  type: IntelligenceArtifactType
  title: string
  summary: string
  confidence: number
  source: IntelligenceArtifactSource
  generatedAt: string
  expiresAt: string | null
  validity: EvidenceValidity
  thesis?: InvestigationThesis
  contradiction?: ContradictionAnalysis
  decisionBrief?: DecisionBrief
  status: IntelligenceArtifactStatus
  evidenceCount: number
  tags: string[]
  subjects: NonNullable<IntelligenceArtifact["subjects"]>
}

export type IntelligenceArtifactUnavailableCode =
  | "not_found"
  | "expired"
  | "archived"
  | "version_mismatch"
  | "invalid"

export type IntelligenceArtifactReadResult<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> =
  | {
      ok: true
      state: "ready"
      artifact: IntelligenceArtifact<TMetadata>
      status: IntelligenceArtifactStatus
    }
  | {
      ok: false
      state: IntelligenceArtifactUnavailableCode
      reason: string
      artifact?: IntelligenceArtifact<TMetadata>
    }

export interface IntelligenceArtifactQuery {
  ids?: string[]
  types?: IntelligenceArtifactType[]
  sourceSystems?: string[]
  symbols?: string[]
  exchanges?: string[]
  tags?: string[]
  generatedAfter?: string
  generatedBefore?: string
  minimumConfidence?: number
  text?: string
  includeExpired?: boolean
  includeArchived?: boolean
  limit?: number
  offset?: number
}

export interface IntelligenceArtifactSearchResult {
  artifacts: IntelligenceArtifactSummary[]
  total: number
  offset: number
  limit: number
}

export interface IntelligenceArtifactPublicationResult {
  artifact: IntelligenceArtifact
  replaced: boolean
}
