import {
  createArtifactDiscoveryRecord,
  type ArtifactDiscoveryCategory,
} from "@/core/artifact-discovery"
import type { IntelligenceArtifactReader } from "@/core/intelligence-artifacts"
import { evaluateMemoryEligibility } from "./memoryEligibility"
import type {
  MemoryEligibilityQuery,
  MemoryEligibilityResult,
} from "./memoryEligibilityTypes"

const MAX_ELIGIBILITY_SCAN = 500

export class MemoryEligibilityReader {
  constructor(private readonly artifactReader: IntelligenceArtifactReader) {}

  async evaluate(
    query: MemoryEligibilityQuery = {},
    options: { evaluatedAt?: string | number | Date } = {},
  ): Promise<MemoryEligibilityResult> {
    const offset = Math.max(0, query.offset ?? 0)
    const limit = Math.max(1, Math.min(MAX_ELIGIBILITY_SCAN, query.limit ?? 50))
    const evaluatedAt = options.evaluatedAt ?? Date.now()
    const artifacts = await this.artifactReader.search({
      ids: query.artifactIds,
      types: query.artifactTypes,
      symbols: query.symbols,
      tags: query.tags,
      generatedAfter: query.generatedAfter,
      generatedBefore: query.generatedBefore,
      includeExpired: query.includeExpired,
      includeArchived: query.includeArchived,
      limit: MAX_ELIGIBILITY_SCAN,
      offset: 0,
    })
    const categoryFilter = query.categories as ArtifactDiscoveryCategory[] | undefined
    const records = evaluateMemoryEligibility(
      artifacts.artifacts
        .map((artifact) => ({
          discovery: createArtifactDiscoveryRecord(artifact, evaluatedAt),
          coverageStatus: artifact.validity.coverageStatus,
        }))
        .filter((candidate) => (
          !categoryFilter?.length
          || categoryFilter.includes(candidate.discovery.category)
        )),
      evaluatedAt,
    ).filter((record) => (
      !query.eligibilityStatuses?.length
      || query.eligibilityStatuses.includes(record.eligibilityStatus)
    ))

    return {
      records: records.slice(offset, offset + limit),
      total: records.length,
      offset,
      limit,
    }
  }
}
