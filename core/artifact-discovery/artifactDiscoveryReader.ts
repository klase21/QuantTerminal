import type { IntelligenceArtifactReader } from "@/core/intelligence-artifacts"
import {
  createArtifactDiscoveryRecord,
} from "./artifactDiscovery"
import type {
  ArtifactDiscoveryQuery,
  ArtifactDiscoveryResult,
} from "./artifactDiscoveryTypes"

const MAX_DISCOVERY_SCAN = 500

function normalized(value: string) {
  return value.trim().toLowerCase()
}

function intersects(left: string[], right: string[]) {
  const expected = new Set(right.map(normalized))
  return left.some((value) => expected.has(normalized(value)))
}

export class ArtifactDiscoveryReader {
  constructor(private readonly artifactReader: IntelligenceArtifactReader) {}

  async discover(
    query: ArtifactDiscoveryQuery = {},
    options: { discoveredAt?: string | number | Date } = {},
  ): Promise<ArtifactDiscoveryResult> {
    const offset = Math.max(0, query.offset ?? 0)
    const limit = Math.max(1, Math.min(MAX_DISCOVERY_SCAN, query.limit ?? 50))
    const result = await this.artifactReader.search({
      ids: query.artifactIds,
      types: query.artifactTypes,
      symbols: query.symbols,
      tags: query.tags,
      generatedAfter: query.generatedAfter,
      generatedBefore: query.generatedBefore,
      includeExpired: query.includeExpired,
      includeArchived: query.includeArchived,
      limit: MAX_DISCOVERY_SCAN,
      offset: 0,
    })
    const discoveredAt = options.discoveredAt ?? Date.now()
    const records = result.artifacts
      .map((artifact) => createArtifactDiscoveryRecord(artifact, discoveredAt))
      .filter((record) => (
        !query.categories?.length
        || query.categories.includes(record.category)
      ))
      .filter((record) => (
        !query.symbols?.length
        || intersects(record.symbols, query.symbols)
      ))
      .filter((record) => (
        !query.tags?.length
        || intersects(record.tags, query.tags)
      ))
      .sort((left, right) => (
        left.category.localeCompare(right.category)
        || left.artifactId.localeCompare(right.artifactId)
      ))

    return {
      records: records.slice(offset, offset + limit),
      total: records.length,
      offset,
      limit,
    }
  }

  async getByArtifactId(
    artifactId: string,
    options: { discoveredAt?: string | number | Date } = {},
  ) {
    const result = await this.discover(
      { artifactIds: [artifactId], limit: 1 },
      options,
    )
    return result.records[0] ?? null
  }
}
