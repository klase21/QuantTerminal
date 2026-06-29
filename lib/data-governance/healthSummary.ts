import type { SourceHealthEvaluation, SourceHealthLevel } from "@/lib/data-governance/health"
import { listSources } from "@/lib/data-governance/registry"

export interface SourceHealthSummary {
  health: SourceHealthLevel
  total: number
  counts: Record<SourceHealthLevel, number>
  sourceIds: Record<SourceHealthLevel, string[]>
}

export interface RegistryHealthSummary extends SourceHealthSummary {
  registeredSourceCount: number
  evaluatedSourceCount: number
  unevaluatedSourceIds: string[]
  unregisteredSourceIds: string[]
}

function emptyCounts(): Record<SourceHealthLevel, number> {
  return { HEALTHY: 0, DEGRADED: 0, UNAVAILABLE: 0, DISABLED: 0, UNKNOWN: 0 }
}

function emptySourceIds(): Record<SourceHealthLevel, string[]> {
  return { HEALTHY: [], DEGRADED: [], UNAVAILABLE: [], DISABLED: [], UNKNOWN: [] }
}

function overallHealth(counts: Record<SourceHealthLevel, number>): SourceHealthLevel {
  if (counts.UNAVAILABLE > 0) return "UNAVAILABLE"
  if (counts.DEGRADED > 0) return "DEGRADED"
  if (counts.UNKNOWN > 0) return "UNKNOWN"
  if (counts.HEALTHY > 0) return "HEALTHY"
  if (counts.DISABLED > 0) return "DISABLED"
  return "UNKNOWN"
}

export function listHealthySources(results: readonly SourceHealthEvaluation[]): SourceHealthEvaluation[] {
  return results.filter((result) => result.health === "HEALTHY")
}

export function listDegradedSources(results: readonly SourceHealthEvaluation[]): SourceHealthEvaluation[] {
  return results.filter((result) => result.health === "DEGRADED")
}

export function listUnavailableSources(results: readonly SourceHealthEvaluation[]): SourceHealthEvaluation[] {
  return results.filter((result) => result.health === "UNAVAILABLE")
}

export function listDisabledSources(results: readonly SourceHealthEvaluation[]): SourceHealthEvaluation[] {
  return results.filter((result) => result.health === "DISABLED")
}

export function summarizeSourceHealth(results: readonly SourceHealthEvaluation[]): SourceHealthSummary {
  const counts = emptyCounts()
  const sourceIds = emptySourceIds()

  for (const result of results) {
    counts[result.health] += 1
    sourceIds[result.health].push(result.sourceId)
  }
  for (const ids of Object.values(sourceIds)) ids.sort()

  return {
    health: overallHealth(counts),
    total: results.length,
    counts,
    sourceIds,
  }
}

export function getRegistryHealthSummary(
  results: readonly SourceHealthEvaluation[],
): RegistryHealthSummary {
  const registeredSources = listSources()
  const registeredIds = new Set(registeredSources.map((source) => source.id))
  const latestBySourceId = new Map<string, SourceHealthEvaluation>()
  const unregisteredSourceIds = new Set<string>()

  for (const result of results) {
    if (!registeredIds.has(result.sourceId)) {
      unregisteredSourceIds.add(result.sourceId)
      continue
    }
    latestBySourceId.set(result.sourceId, result)
  }

  const evaluated = [...latestBySourceId.values()]
  const summary = summarizeSourceHealth(evaluated)
  const unevaluatedSourceIds = registeredSources
    .map((source) => source.id)
    .filter((sourceId) => !latestBySourceId.has(sourceId))
    .sort()

  summary.counts.UNKNOWN += unevaluatedSourceIds.length
  summary.sourceIds.UNKNOWN.push(...unevaluatedSourceIds)
  summary.sourceIds.UNKNOWN.sort()

  return {
    ...summary,
    health: overallHealth(summary.counts),
    total: registeredSources.length,
    registeredSourceCount: registeredSources.length,
    evaluatedSourceCount: evaluated.length,
    unevaluatedSourceIds,
    unregisteredSourceIds: [...unregisteredSourceIds].sort(),
  }
}

