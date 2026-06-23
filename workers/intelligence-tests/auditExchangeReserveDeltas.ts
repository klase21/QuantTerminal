import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  validateExchangeReserveDelta,
  type ExchangeReserveDelta,
  type ExchangeReserveDeltaArtifactMetadata,
} from "@/core/exchange-reserve-delta"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

function validDelta(value: unknown): value is ExchangeReserveDelta {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && validateExchangeReserveDelta(value as ExchangeReserveDelta).valid,
  )
}

export async function auditExchangeReserveDeltas() {
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const artifacts = await registry.listByType("exchange_reserve_delta")
  const deltas: ExchangeReserveDelta[] = []
  let invalidArtifacts = 0
  for (const artifact of artifacts) {
    const delta = (
      artifact.metadata as Partial<ExchangeReserveDeltaArtifactMetadata>
    ).delta
    if (validDelta(delta)) deltas.push(delta)
    else invalidArtifacts += 1
  }
  const latest = new Map<string, ExchangeReserveDelta>()
  for (const delta of deltas) {
    const current = latest.get(delta.asset)
    if (
      !current
      || Date.parse(delta.currentObservedAt) > Date.parse(current.currentObservedAt)
    ) latest.set(delta.asset, delta)
  }
  const values = [...latest.values()]
  const available = values.filter((item) => item.status === "available")
  const unavailable = values.filter((item) => item.status === "unavailable")
  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: "PASS",
    coverage: {
      artifactsRead: artifacts.length,
      validArtifacts: deltas.length,
      invalidArtifacts,
      assetsEvaluated: values.length,
      availableDeltas: available.length,
      unavailableDeltas: unavailable.length,
      coveragePercent: values.length
        ? Number(((available.length / values.length) * 100).toFixed(2))
        : 0,
    },
    topIncreasesByUsd: [...available]
      .sort((left, right) => right.balanceUsdDelta! - left.balanceUsdDelta!)
      .slice(0, 20),
    topDecreasesByUsd: [...available]
      .sort((left, right) => left.balanceUsdDelta! - right.balanceUsdDelta!)
      .slice(0, 20),
    topIncreasesByQuantity: [...available]
      .sort((left, right) => right.balanceDelta! - left.balanceDelta!)
      .slice(0, 20),
    topDecreasesByQuantity: [...available]
      .sort((left, right) => left.balanceDelta! - right.balanceDelta!)
      .slice(0, 20),
    unavailableReasons: Object.entries(
      unavailable.reduce<Record<string, number>>((counts, item) => {
        const reason = item.reason ?? "Unknown unavailable reason."
        counts[reason] = (counts[reason] ?? 0) + 1
        return counts
      }, {}),
    ).map(([reason, count]) => ({ reason, count })),
  }
}

async function main() {
  const report = await auditExchangeReserveDeltas()
  process.stdout.write("EXCHANGE RESERVE DELTA AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `EXCHANGE RESERVE DELTA AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
