import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  validateReserveIntelligenceObservation,
  type ReserveIntelligenceArtifactMetadata,
  type ReserveIntelligenceObservation,
} from "@/core/reserve-intelligence"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

function validObservation(value: unknown): value is ReserveIntelligenceObservation {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && validateReserveIntelligenceObservation(value as ReserveIntelligenceObservation).valid,
  )
}

export async function auditReserveIntelligence() {
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const artifacts = await registry.listByType("reserve_intelligence")
  const observations: ReserveIntelligenceObservation[] = []
  let invalidArtifacts = 0
  for (const artifact of artifacts) {
    const observation = (
      artifact.metadata as Partial<ReserveIntelligenceArtifactMetadata>
    ).observation
    if (validObservation(observation)) observations.push(observation)
    else invalidArtifacts += 1
  }
  const latest = new Map<string, ReserveIntelligenceObservation>()
  for (const observation of observations) {
    const current = latest.get(observation.asset)
    if (
      !current
      || Date.parse(observation.currentObservedAt) > Date.parse(current.currentObservedAt)
    ) latest.set(observation.asset, observation)
  }
  const latestObservations = [...latest.values()]
  const verified = latestObservations.filter((item) => item.quality === "verified")
  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: invalidArtifacts ? "FAIL" : "PASS",
    coverage: {
      artifactsRead: artifacts.length,
      validArtifacts: observations.length,
      invalidArtifacts,
      assetsEvaluated: latestObservations.length,
      verifiedObservations: verified.length,
      unavailableObservations: latestObservations.length - verified.length,
      coveragePercent: latestObservations.length
        ? Number(((verified.length / latestObservations.length) * 100).toFixed(2))
        : 0,
    },
    observationCounts: Object.entries(
      latestObservations.reduce<Record<string, number>>((counts, observation) => {
        counts[observation.observationType] = (counts[observation.observationType] ?? 0) + 1
        return counts
      }, {}),
    ).map(([observationType, count]) => ({ observationType, count })),
    classificationCounts: Object.entries(
      latestObservations.reduce<Record<string, number>>((counts, observation) => {
        counts[observation.classification] = (counts[observation.classification] ?? 0) + 1
        return counts
      }, {}),
    ).map(([classification, count]) => ({ classification, count })),
    trendCoverage: ["1d", "7d", "30d"].map((horizon) => ({
      horizon,
      available: latestObservations.filter((observation) => (
        observation.trends.some((trend) => trend.horizon === horizon && trend.status === "available")
      )).length,
      unavailable: latestObservations.filter((observation) => (
        observation.trends.some((trend) => trend.horizon === horizon && trend.status === "unavailable")
      )).length,
    })),
  }
}

async function main() {
  const report = await auditReserveIntelligence()
  process.stdout.write("RESERVE INTELLIGENCE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== "PASS") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `RESERVE INTELLIGENCE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
