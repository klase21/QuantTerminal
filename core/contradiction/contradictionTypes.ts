import type { IntelligenceEvidenceKind } from "@/core/intelligence-artifacts/artifactTypes"

export const CONTRADICTION_SCHEMA_VERSION = 1

export const CONTRADICTION_CATEGORIES = [
  "historical_analog",
  "event_impact",
  "market_memory",
] as const

export type ContradictionCategory = typeof CONTRADICTION_CATEGORIES[number]

export interface ContradictionEvidence {
  evidenceId: string
  kind: IntelligenceEvidenceKind
  title: string
  summary: string
  source: string
  observedAt?: string
  sourceArtifactId?: string
  metadata?: Record<string, unknown>
}

export interface ContradictionAnalysis {
  schemaVersion: typeof CONTRADICTION_SCHEMA_VERSION
  contradictionId: string
  category: ContradictionCategory
  supportingEvidence: ContradictionEvidence[]
  contradictingEvidence: ContradictionEvidence[]
  generatedAt: string
  sourceArtifactIds: string[]
}
