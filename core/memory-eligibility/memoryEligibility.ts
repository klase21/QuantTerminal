import type { ArtifactDiscoveryCategory } from "@/core/artifact-discovery"
import type { EvidenceCoverageStatus } from "@/core/evidence-validity"
import {
  MEMORY_ELIGIBILITY_SCHEMA_VERSION,
  type MemoryEligibilityCandidate,
  type MemoryEligibilityRecord,
  type MemoryEligibilityStatus,
} from "./memoryEligibilityTypes"

function iso(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Memory Eligibility evaluatedAt is invalid.")
  }
  return date.toISOString()
}

function scopeKey(candidate: MemoryEligibilityCandidate) {
  const symbols = [...new Set(
    candidate.discovery.symbols
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean),
  )].sort()
  return symbols.length ? symbols.join("+") : "unscoped"
}

function aggregateCoverage(
  candidates: MemoryEligibilityCandidate[],
): EvidenceCoverageStatus {
  const statuses = candidates.map((candidate) => candidate.coverageStatus)
  if (statuses.length === 0) return "UNAVAILABLE"
  if (statuses.every((status) => status === "FULL")) return "FULL"
  if (statuses.some((status) => status === "FULL" || status === "PARTIAL")) {
    return "PARTIAL"
  }
  if (statuses.every((status) => status === "UNAVAILABLE")) return "UNAVAILABLE"
  return "UNKNOWN"
}

function status(input: {
  category: ArtifactDiscoveryCategory
  artifactCount: number
  coverageStatus: EvidenceCoverageStatus
}): MemoryEligibilityStatus {
  if (
    input.category === "unknown"
    || input.artifactCount === 0
    || input.coverageStatus === "UNKNOWN"
    || input.coverageStatus === "UNAVAILABLE"
  ) {
    return "insufficient_evidence"
  }
  if (input.artifactCount === 1) return "candidate"
  if (input.artifactCount >= 5 && input.coverageStatus === "FULL") {
    return "population_ready"
  }
  return "eligible"
}

export function evaluateMemoryEligibility(
  candidates: MemoryEligibilityCandidate[],
  evaluatedAt: string | number | Date = Date.now(),
): MemoryEligibilityRecord[] {
  const groups = new Map<string, MemoryEligibilityCandidate[]>()
  for (const candidate of candidates) {
    const key = `${candidate.discovery.category}:${scopeKey(candidate)}`
    groups.set(key, [...(groups.get(key) ?? []), candidate])
  }

  const evaluated = iso(evaluatedAt)
  return [...groups.entries()]
    .map(([key, group]): MemoryEligibilityRecord => {
      const category = group[0].discovery.category
      const supportingArtifactIds = [...new Set(
        group.map((candidate) => candidate.discovery.artifactId),
      )].sort()
      const coverageStatus = aggregateCoverage(group)
      return {
        schemaVersion: MEMORY_ELIGIBILITY_SCHEMA_VERSION,
        eligibilityId: `memory-eligibility:${key}`,
        category,
        artifactCount: supportingArtifactIds.length,
        coverageStatus,
        eligibilityStatus: status({
          category,
          artifactCount: supportingArtifactIds.length,
          coverageStatus,
        }),
        evaluatedAt: evaluated,
        supportingArtifactIds,
      }
    })
    .sort((left, right) => left.eligibilityId.localeCompare(right.eligibilityId))
}
