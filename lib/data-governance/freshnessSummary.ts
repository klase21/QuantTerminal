import { SOURCE_FRESHNESS_STATES, type SourceFreshness } from "@/lib/data-governance/freshness"
import type { SourceFreshnessEvaluation } from "@/lib/data-governance/freshnessPolicy"

export type FreshnessCounts = Record<SourceFreshness, number>

export interface FreshnessSummary {
  status: SourceFreshness
  total: number
  counts: FreshnessCounts
}

export interface DetailedFreshnessSummary extends FreshnessSummary {
  currentSourceIds: string[]
  staleSourceIds: string[]
  expiredSourceIds: string[]
  unavailableSourceIds: string[]
}

function emptyCounts(): FreshnessCounts {
  return Object.fromEntries(SOURCE_FRESHNESS_STATES.map((status) => [status, 0])) as FreshnessCounts
}

function aggregateStatus(counts: FreshnessCounts, total: number): SourceFreshness {
  if (!total || counts.UNAVAILABLE) return "UNAVAILABLE"
  if (counts.EXPIRED) return "EXPIRED"
  if (counts.STALE) return "STALE"
  if (counts.CURRENT) return "CURRENT"
  return "LIVE"
}

export function listStaleSources(
  results: readonly SourceFreshnessEvaluation[],
): SourceFreshnessEvaluation[] {
  return results.filter((result) => result.status === "STALE")
}

export function listExpiredSources(
  results: readonly SourceFreshnessEvaluation[],
): SourceFreshnessEvaluation[] {
  return results.filter((result) => result.status === "EXPIRED")
}

export function listCurrentSources(
  results: readonly SourceFreshnessEvaluation[],
): SourceFreshnessEvaluation[] {
  return results.filter((result) => result.status === "LIVE" || result.status === "CURRENT")
}

export function summarizeFreshness(
  results: readonly SourceFreshnessEvaluation[],
): FreshnessSummary {
  const counts = results.reduce((summary, result) => {
    summary[result.status] += 1
    return summary
  }, emptyCounts())
  return {
    status: aggregateStatus(counts, results.length),
    total: results.length,
    counts,
  }
}

export function getFreshnessSummary(
  results: readonly SourceFreshnessEvaluation[],
): DetailedFreshnessSummary {
  const summary = summarizeFreshness(results)
  return {
    ...summary,
    currentSourceIds: listCurrentSources(results).map((result) => result.sourceId),
    staleSourceIds: listStaleSources(results).map((result) => result.sourceId),
    expiredSourceIds: listExpiredSources(results).map((result) => result.sourceId),
    unavailableSourceIds: results
      .filter((result) => result.status === "UNAVAILABLE")
      .map((result) => result.sourceId),
  }
}
