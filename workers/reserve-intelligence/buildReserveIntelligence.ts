import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  createReserveIntelligenceArtifact,
} from "@/core/reserve-intelligence"
import type {
  ExchangeReserveArtifactMetadata,
  ExchangeReserveSnapshot,
} from "@/core/exchange-reserve"
import {
  validateExchangeReserveSnapshot,
} from "@/core/exchange-reserve"
import type {
  ExchangeReserveDelta,
  ExchangeReserveDeltaArtifactMetadata,
} from "@/core/exchange-reserve-delta"
import {
  validateExchangeReserveDelta,
} from "@/core/exchange-reserve-delta"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"
import {
  buildReserveIntelligenceObservations,
} from "@/lib/reserve-intelligence/buildReserveIntelligence"
import { buildDeployableSnapshots } from "@/workers/data-snapshots/buildDeployableSnapshots"

function validSnapshot(value: unknown): value is ExchangeReserveSnapshot {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && validateExchangeReserveSnapshot(value as ExchangeReserveSnapshot).valid,
  )
}

function validDelta(value: unknown): value is ExchangeReserveDelta {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && validateExchangeReserveDelta(value as ExchangeReserveDelta).valid,
  )
}

export async function buildReserveIntelligence(input: {
  artifactRoot?: string
} = {}) {
  const registry = new FileBackedIntelligenceArtifactRegistry(
    input.artifactRoot ? path.resolve(input.artifactRoot) : undefined,
  )
  const reserveArtifacts = await registry.listByType("exchange_reserve_snapshot")
  const deltaArtifacts = await registry.listByType("exchange_reserve_delta")
  const snapshots = reserveArtifacts.flatMap((artifact) => {
    const snapshot = (
      artifact.metadata as Partial<ExchangeReserveArtifactMetadata>
    ).snapshot
    return validSnapshot(snapshot) ? [snapshot] : []
  })
  const deltas = deltaArtifacts.flatMap((artifact) => {
    const delta = (
      artifact.metadata as Partial<ExchangeReserveDeltaArtifactMetadata>
    ).delta
    return validDelta(delta) ? [delta] : []
  })
  if (!deltas.length) {
    throw new Error("No reserve delta artifacts are available for Reserve Intelligence.")
  }

  const latest = new Map<string, ExchangeReserveDelta>()
  for (const delta of deltas) {
    const current = latest.get(delta.asset)
    if (!current || Date.parse(delta.currentObservedAt) > Date.parse(current.currentObservedAt)) {
      latest.set(delta.asset, delta)
    }
  }
  const observations = buildReserveIntelligenceObservations({
    deltas: [...latest.values()],
    snapshots,
  })
  let artifactsPublished = 0
  for (const observation of observations) {
    await registry.publish(createReserveIntelligenceArtifact(observation))
    artifactsPublished += 1
  }
  const deployableSnapshots = input.artifactRoot
    ? null
    : await buildDeployableSnapshots()
  return {
    generatedAt: observations[0]?.generatedAt ?? new Date().toISOString(),
    reserveSnapshotArtifactsRead: reserveArtifacts.length,
    reserveDeltaArtifactsRead: deltaArtifacts.length,
    observationsGenerated: observations.length,
    artifactsPublished,
    observationCounts: Object.entries(
      observations.reduce<Record<string, number>>((counts, observation) => {
        counts[observation.observationType] = (counts[observation.observationType] ?? 0) + 1
        return counts
      }, {}),
    ).map(([observationType, count]) => ({ observationType, count })),
    classificationCounts: Object.entries(
      observations.reduce<Record<string, number>>((counts, observation) => {
        counts[observation.classification] = (counts[observation.classification] ?? 0) + 1
        return counts
      }, {}),
    ).map(([classification, count]) => ({ classification, count })),
    deployableSnapshots,
  }
}

async function main() {
  const result = await buildReserveIntelligence()
  process.stdout.write("RESERVE INTELLIGENCE BUILD\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `RESERVE INTELLIGENCE BUILD FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
