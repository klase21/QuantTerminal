import { NextResponse } from "next/server"

import {
  evaluateFreshness,
  evaluateSourceHealth,
  getFreshnessSummary,
  getRegistryHealthSummary,
  listActiveSources,
  listDegradedSources,
  listDisabledSources,
  listHealthySources,
  listProductionSources,
  listSources,
  listUnavailableSources,
} from "@/lib/data-governance"

export const dynamic = "force-dynamic"

function buildSourceGovernanceDiagnostics() {
  const sources = listSources()
  const freshnessEvaluations = sources.map((source) => evaluateFreshness({
    sourceId: source.id,
    lastUpdatedAt: null,
    retrievedAt: null,
  }))
  const freshnessBySourceId = new Map(
    freshnessEvaluations.map((evaluation) => [evaluation.sourceId, evaluation]),
  )
  const healthEvaluations = sources.map((source) => evaluateSourceHealth({
    sourceId: source.id,
    freshness: freshnessBySourceId.get(source.id),
    qualityLevel: source.quality,
    sourceStatus: source.status,
  }))
  const healthBySourceId = new Map(
    healthEvaluations.map((evaluation) => [evaluation.sourceId, evaluation]),
  )
  const freshnessSummary = getFreshnessSummary(freshnessEvaluations)
  const healthSummary = getRegistryHealthSummary(healthEvaluations)

  return {
    generatedAt: new Date().toISOString(),
    registry: {
      totalSources: sources.length,
      productionSources: listProductionSources().length,
      activeSources: listActiveSources().length,
      disabledSources: sources.filter((source) => source.status === "DISABLED").length,
    },
    freshness: {
      summary: freshnessSummary,
      currentSources: freshnessSummary.currentSourceIds,
      staleSources: freshnessSummary.staleSourceIds,
      expiredSources: freshnessSummary.expiredSourceIds,
      unavailableSources: freshnessSummary.unavailableSourceIds,
    },
    health: {
      summary: healthSummary,
      healthySources: listHealthySources(healthEvaluations).map((source) => source.sourceId),
      degradedSources: listDegradedSources(healthEvaluations).map((source) => source.sourceId),
      unavailableSources: listUnavailableSources(healthEvaluations).map((source) => source.sourceId),
      disabledSources: listDisabledSources(healthEvaluations).map((source) => source.sourceId),
      unknownSources: healthEvaluations
        .filter((source) => source.health === "UNKNOWN")
        .map((source) => source.sourceId),
    },
    sources: sources.map((source) => {
      const freshness = freshnessBySourceId.get(source.id)
      const health = healthBySourceId.get(source.id)

      return {
        sourceId: source.id,
        displayName: source.displayName,
        owner: source.owner,
        consumers: source.consumers,
        criticality: source.criticality,
        productionApproved: source.productionApproved,
        sourceStatus: source.status,
        quality: source.quality,
        freshness: freshness?.status ?? "UNAVAILABLE",
        freshnessReason: freshness?.reason ?? "SOURCE_NOT_REGISTERED",
        health: health?.health ?? "UNKNOWN",
        healthReason: health?.reason ?? "SOURCE_NOT_REGISTERED",
        fallbackSource: source.fallbackSource,
      }
    }),
  }
}

export async function GET() {
  return NextResponse.json(buildSourceGovernanceDiagnostics())
}
