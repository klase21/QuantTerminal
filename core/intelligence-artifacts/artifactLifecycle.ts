import type {
  IntelligenceArtifact,
  IntelligenceArtifactSource,
  IntelligenceSupportingEvidence,
  IntelligenceArtifactType,
} from "@/core/intelligence-artifacts/artifactTypes"
import { INTELLIGENCE_ARTIFACT_SCHEMA_VERSION } from "@/core/intelligence-artifacts/artifactTypes"

export interface CreateIntelligenceArtifactInput<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string
  type: IntelligenceArtifactType
  title: string
  summary: string
  confidence: number
  source: IntelligenceArtifactSource
  generatedAt?: string | Date
  expiresAt?: string | Date | null
  supportingEvidence?: IntelligenceSupportingEvidence[]
  metadata?: TMetadata
  tags?: string[]
  subjects?: IntelligenceArtifact["subjects"]
}

function isoDate(value: string | Date | undefined, fallback: Date) {
  const date = value === undefined ? fallback : value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error("Intelligence artifact timestamp is invalid.")
  return date.toISOString()
}

export function createIntelligenceArtifact<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
>(
  input: CreateIntelligenceArtifactInput<TMetadata>,
): IntelligenceArtifact<TMetadata> {
  const generatedAt = isoDate(input.generatedAt, new Date())
  const expiresAt = input.expiresAt === null
    ? null
    : input.expiresAt === undefined
      ? null
      : isoDate(input.expiresAt, new Date(generatedAt))

  return {
    schemaVersion: INTELLIGENCE_ARTIFACT_SCHEMA_VERSION,
    id: input.id,
    type: input.type,
    title: input.title,
    summary: input.summary,
    confidence: input.confidence,
    source: input.source,
    generatedAt,
    expiresAt,
    supportingEvidence: input.supportingEvidence ?? [],
    metadata: (input.metadata ?? {}) as TMetadata,
    tags: input.tags,
    subjects: input.subjects,
  }
}
