import { readFile } from "node:fs/promises"
import path from "node:path"

import { NextResponse } from "next/server"

import { isDeployableSnapshot } from "@/core/deployable-snapshots"
import type { DeployableReserveIntelligenceObservation } from "@/core/reserve-intelligence"

export const dynamic = "force-dynamic"

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

export async function GET(request: Request) {
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
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      reason: error instanceof Error
        ? error.message
        : "Reserve Intelligence unavailable.",
    }, { status: 200 })
  }
}
