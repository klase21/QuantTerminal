import {
  intelligenceArtifactStatus,
  validateIntelligenceArtifact,
} from "@/core/intelligence-artifacts/artifactValidation"
import type { IntelligenceArtifactRegistry } from "@/core/intelligence-artifacts/artifactRegistry"
import type {
  IntelligenceArtifact,
  IntelligenceArtifactQuery,
  IntelligenceArtifactSearchResult,
  IntelligenceArtifactSummary,
} from "@/core/intelligence-artifacts/artifactTypes"

function normalized(value: string) {
  return value.trim().toLowerCase()
}

function intersects(left: string[], right: string[]) {
  const expected = new Set(right.map(normalized))
  return left.some((value) => expected.has(normalized(value)))
}

function dateMatches(value: string, after?: string, before?: string) {
  const timestamp = Date.parse(value)
  if (after && timestamp < Date.parse(after)) return false
  if (before && timestamp > Date.parse(before)) return false
  return true
}

function textMatches(artifact: IntelligenceArtifact, text?: string) {
  if (!text?.trim()) return true
  const query = normalized(text)
  return [
    artifact.title,
    artifact.summary,
    artifact.type,
    artifact.source.system,
    ...(artifact.tags ?? []),
    ...(artifact.subjects?.symbols ?? []),
    ...artifact.supportingEvidence.flatMap((evidence) => [evidence.title, evidence.summary ?? ""]),
  ].some((value) => normalized(value).includes(query))
}

function summary(artifact: IntelligenceArtifact, archived: boolean): IntelligenceArtifactSummary {
  return {
    id: artifact.id,
    schemaVersion: artifact.schemaVersion,
    type: artifact.type,
    title: artifact.title,
    summary: artifact.summary,
    confidence: artifact.confidence,
    source: artifact.source,
    generatedAt: artifact.generatedAt,
    expiresAt: artifact.expiresAt,
    validity: artifact.validity,
    thesis: artifact.thesis,
    contradiction: artifact.contradiction,
    decisionBrief: artifact.decisionBrief,
    status: intelligenceArtifactStatus(artifact, { archived }),
    evidenceCount: artifact.supportingEvidence.length,
    tags: artifact.tags ?? [],
    subjects: artifact.subjects ?? {},
  }
}

export class InMemoryIntelligenceArtifactRegistry implements IntelligenceArtifactRegistry {
  private readonly artifacts = new Map<string, IntelligenceArtifact>()
  private readonly archived = new Set<string>()

  async publish(artifact: IntelligenceArtifact) {
    const validation = validateIntelligenceArtifact(artifact)
    if (!validation.valid) {
      throw new Error(`Invalid intelligence artifact: ${validation.errors.join(" ")}`)
    }
    const replaced = this.artifacts.has(artifact.id)
    this.artifacts.set(artifact.id, structuredClone(artifact))
    this.archived.delete(artifact.id)
    return { artifact: structuredClone(artifact), replaced }
  }

  async get(id: string) {
    const artifact = this.artifacts.get(id)
    return artifact ? structuredClone(artifact) : null
  }

  async archive(id: string) {
    if (!this.artifacts.has(id)) return false
    this.archived.add(id)
    return true
  }

  async isArchived(id: string) {
    return this.archived.has(id)
  }

  async search(query: IntelligenceArtifactQuery = {}): Promise<IntelligenceArtifactSearchResult> {
    const offset = Math.max(0, query.offset ?? 0)
    const limit = Math.max(1, Math.min(500, query.limit ?? 50))
    const ids = query.ids ? new Set(query.ids) : null
    const types = query.types ? new Set(query.types) : null
    const sourceSystems = query.sourceSystems?.map(normalized)
    const symbols = query.symbols?.map(normalized)
    const exchanges = query.exchanges?.map(normalized)
    const tags = query.tags?.map(normalized)

    const matches = [...this.artifacts.values()]
      .filter((artifact) => {
        const archived = this.archived.has(artifact.id)
        const status = intelligenceArtifactStatus(artifact, { archived })
        if (ids && !ids.has(artifact.id)) return false
        if (types && !types.has(artifact.type)) return false
        if (sourceSystems && !sourceSystems.includes(normalized(artifact.source.system))) return false
        if (symbols && !intersects(artifact.subjects?.symbols ?? [], symbols)) return false
        if (exchanges && !intersects(artifact.subjects?.exchanges ?? [], exchanges)) return false
        if (tags && !intersects(artifact.tags ?? [], tags)) return false
        if (!dateMatches(artifact.generatedAt, query.generatedAfter, query.generatedBefore)) return false
        if (query.minimumConfidence !== undefined && artifact.confidence < query.minimumConfidence) return false
        if (!query.includeExpired && status === "expired") return false
        if (!query.includeArchived && status === "archived") return false
        return textMatches(artifact, query.text)
      })
      .sort((left, right) => (
        Date.parse(right.generatedAt) - Date.parse(left.generatedAt)
        || right.confidence - left.confidence
        || left.id.localeCompare(right.id)
      ))

    return {
      artifacts: matches.slice(offset, offset + limit).map((artifact) => summary(artifact, this.archived.has(artifact.id))),
      total: matches.length,
      offset,
      limit,
    }
  }
}
