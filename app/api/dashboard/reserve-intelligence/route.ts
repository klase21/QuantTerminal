import { readFile } from "node:fs/promises"
import path from "node:path"

import { NextResponse } from "next/server"

import { isDeployableSnapshot } from "@/core/deployable-snapshots"
import type { DeployableReserveIntelligenceObservation } from "@/core/reserve-intelligence"
import {
  createSourceDegraded,
  createSourceSuccess,
  createSourceUnavailable,
  normalizeSourceMetadata,
  type SourceMetadataEnvelope,
} from "@/lib/data-governance/envelope"
import { evaluateFreshness } from "@/lib/data-governance/freshnessPolicy"
import type { SourceUnavailableReason } from "@/lib/data-governance/unavailable"

export const dynamic = "force-dynamic"

const SOURCE_ID = "exchange-reserve"

type ReserveIntelligenceSnapshot = {
  schemaVersion: number
  snapshotId: string
  metadata: {
    source: string
    generatedAt: string
    observedAt: string | null
    freshness: "current" | "stale" | "missing"
    coverage: "full" | "partial" | "unavailable"
    reason?: string
  }
  data: DeployableReserveIntelligenceObservation[]
}

function baseAsset(symbol: string) {
  return symbol.replace(/(?:USDT|USDC|USD|BUSD)$/i, "").toUpperCase()
}

function observationRank(observation: DeployableReserveIntelligenceObservation) {
  const hasChange = ![
    "reserve_no_change",
    "stablecoin_no_change",
    "delta_unavailable",
  ].includes(observation.observationType)
  return [
    hasChange ? 1 : 0,
    observation.quality === "verified" ? 1 : 0,
    Math.abs(observation.balanceUsdChange ?? observation.currentBalanceUsd ?? 0),
  ] as const
}

function compareObservation(
  left: DeployableReserveIntelligenceObservation,
  right: DeployableReserveIntelligenceObservation,
) {
  const leftRank = observationRank(left)
  const rightRank = observationRank(right)
  for (let index = 0; index < leftRank.length; index += 1) {
    const difference = rightRank[index] - leftRank[index]
    if (difference !== 0) return difference
  }
  return left.asset.localeCompare(right.asset)
}

function unavailableSourceMetadata(input: {
  reason: SourceUnavailableReason
  retrievedAt: string
  observedAt?: string | null
}) {
  const freshness = evaluateFreshness({
    sourceId: SOURCE_ID,
    lastUpdatedAt: input.observedAt ?? null,
    retrievedAt: input.retrievedAt,
  })
  const unavailable = createSourceUnavailable(SOURCE_ID, input.reason)
  return normalizeSourceMetadata(SOURCE_ID, {
    freshnessStatus: freshness.status,
    qualityLevel: unavailable.metadata.qualityLevel,
    sourceStatus: unavailable.metadata.sourceStatus,
    lastUpdatedAt: freshness.lastUpdatedAt,
    retrievedAt: input.retrievedAt,
    unavailableReason: unavailable.metadata.unavailableReason,
    cacheStatus: unavailable.metadata.cacheStatus,
  })
}

function availableSourceMetadata(input: {
  snapshot: ReserveIntelligenceSnapshot
  observations: DeployableReserveIntelligenceObservation[]
  retrievedAt: string
}): SourceMetadataEnvelope {
  const freshness = evaluateFreshness({
    sourceId: SOURCE_ID,
    lastUpdatedAt: input.snapshot.metadata.observedAt,
    retrievedAt: input.retrievedAt,
  })

  if (freshness.status === "EXPIRED" || freshness.status === "UNAVAILABLE") {
    return unavailableSourceMetadata({
      reason: freshness.status === "EXPIRED" ? "EXPIRED" : "INVALID_RESPONSE",
      retrievedAt: input.retrievedAt,
      observedAt: input.snapshot.metadata.observedAt,
    })
  }

  const metadata = {
    freshnessStatus: freshness.status,
    lastUpdatedAt: freshness.lastUpdatedAt,
    retrievedAt: input.retrievedAt,
    cacheStatus: "HIT" as const,
  }
  if (freshness.status === "STALE") {
    return createSourceDegraded(SOURCE_ID, input.observations, "STALE_DATA", undefined, {
      ...metadata,
      qualityLevel: "LOW",
    }).metadata
  }

  const partial = input.snapshot.metadata.coverage !== "full"
    || input.snapshot.metadata.freshness !== "current"
    || input.observations.some((observation) => observation.quality !== "verified")
  if (partial) {
    return createSourceDegraded(SOURCE_ID, input.observations, "PARTIAL_DATA", undefined, {
      ...metadata,
      qualityLevel: "LOW",
    }).metadata
  }

  return createSourceSuccess(SOURCE_ID, input.observations, {
    ...metadata,
    qualityLevel: "MEDIUM",
  }).metadata
}

export async function GET(request: Request) {
  const retrievedAt = new Date().toISOString()
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.trim().toUpperCase() ?? ""
  const asset = symbol ? baseAsset(symbol) : null
  try {
    const filePath = path.join(process.cwd(), ".data", "artifacts", "reserve-intelligence-latest.json")
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown
    if (!isDeployableSnapshot(parsed)) {
      return NextResponse.json({
        ok: false,
        status: "unavailable",
        reason: "Reserve Intelligence deployable artifact is invalid.",
        _source: unavailableSourceMetadata({
          reason: "INVALID_RESPONSE",
          retrievedAt,
        }),
      }, { status: 200 })
    }

    const snapshot = parsed as ReserveIntelligenceSnapshot
    const observations = Array.isArray(snapshot.data)
      ? snapshot.data
      : []
    const relevant = asset
      ? observations.filter((observation) => observation.asset.toUpperCase() === asset)
      : observations
    const selected = (relevant.length ? relevant : observations)
      .filter((observation) => observation.quality !== "unavailable")
      .sort(compareObservation)
      .slice(0, 8)

    if (!selected.length) {
      return NextResponse.json({
        ok: true,
        status: "unavailable",
        source: snapshot.metadata.source,
        generatedAt: snapshot.metadata.generatedAt,
        observedAt: snapshot.metadata.observedAt,
        freshness: snapshot.metadata.freshness,
        coverage: snapshot.metadata.coverage,
        observations: [],
        reason: snapshot.metadata.reason ?? "Reserve Intelligence observations unavailable.",
        _source: unavailableSourceMetadata({
          reason: "EMPTY_RESPONSE",
          retrievedAt,
          observedAt: snapshot.metadata.observedAt,
        }),
      })
    }

    return NextResponse.json({
      ok: true,
      status: "available",
      source: snapshot.metadata.source,
      generatedAt: snapshot.metadata.generatedAt,
      observedAt: snapshot.metadata.observedAt,
      freshness: snapshot.metadata.freshness,
      coverage: snapshot.metadata.coverage,
      observations: selected,
      _source: availableSourceMetadata({
        snapshot,
        observations: selected,
        retrievedAt,
      }),
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      reason: error instanceof Error
        ? error.message
        : "Reserve Intelligence unavailable.",
      _source: unavailableSourceMetadata({
        reason: "SOURCE_UNAVAILABLE",
        retrievedAt,
      }),
    }, { status: 200 })
  }
}
