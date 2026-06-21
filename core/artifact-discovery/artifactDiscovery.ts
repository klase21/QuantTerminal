import type {
  IntelligenceArtifactSummary,
  IntelligenceArtifactType,
} from "@/core/intelligence-artifacts"
import {
  ARTIFACT_DISCOVERY_SCHEMA_VERSION,
  type ArtifactDiscoveryCategory,
  type ArtifactDiscoveryRecord,
} from "./artifactDiscoveryTypes"

function iso(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Artifact Discovery discoveredAt is invalid.")
  }
  return date.toISOString()
}

function unique(values: string[], normalize: (value: string) => string) {
  return [...new Set(values.map(normalize).filter(Boolean))].sort()
}

export function artifactDiscoveryCategoryForType(
  artifactType: IntelligenceArtifactType,
): ArtifactDiscoveryCategory {
  if (artifactType === "historical_analog") return "historical_pattern"
  if (artifactType === "event_impact") return "event_pattern"
  if (
    artifactType === "replay_intelligence"
    || artifactType === "replay_learning"
  ) {
    return "replay_pattern"
  }
  if (artifactType === "market_memory") return "market_memory_candidate"
  return "unknown"
}

export function createArtifactDiscoveryRecord(
  artifact: IntelligenceArtifactSummary,
  discoveredAt: string | number | Date = Date.now(),
): ArtifactDiscoveryRecord {
  return {
    schemaVersion: ARTIFACT_DISCOVERY_SCHEMA_VERSION,
    discoveryId: `discovery:${artifact.id}`,
    artifactId: artifact.id,
    artifactType: artifact.type,
    symbols: unique(
      artifact.subjects.symbols ?? [],
      (value) => value.trim().toUpperCase(),
    ),
    tags: unique(
      artifact.tags,
      (value) => value.trim().toLowerCase(),
    ),
    category: artifactDiscoveryCategoryForType(artifact.type),
    discoveredAt: iso(discoveredAt),
  }
}
