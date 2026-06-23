import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  STANDARD_ARTIFACT_HARD_LIMIT_BYTES,
  STANDARD_ARTIFACT_SCHEMA_VERSION,
  STANDARD_ARTIFACT_TYPES,
  STANDARD_ARTIFACT_WARNING_BYTES,
  type StandardArtifactIndex,
} from "@/core/artifact-standardization"
import {
  DEPLOYABLE_COVERAGE_SURFACES,
  DEPLOYABLE_COVERAGE_TYPES,
  DEPLOYABLE_SNAPSHOT_COVERAGE,
  DEPLOYABLE_SNAPSHOT_FRESHNESS,
  DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION,
  isDeployableSnapshot,
  type DeployableCoverageIndex,
} from "@/core/deployable-snapshots"

const ARTIFACT_ROOT = path.join(process.cwd(), ".data", "artifacts")
const EXPECTED_FILES = [
  "artifact-index.json",
  "latest-market-drivers.json",
  "etf-latest.json",
  "funding-latest.json",
  "open-interest-latest.json",
  "liquidation-latest.json",
  "exchange-flow-latest.json",
  "treasury-latest.json",
  "coverage-index.json",
]

function isCoverageIndex(value: unknown): value is DeployableCoverageIndex {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const index = value as Partial<DeployableCoverageIndex>
  return (
    index.schemaVersion === DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION
    && typeof index.generatedAt === "string"
    && Number.isFinite(Date.parse(index.generatedAt))
    && Array.isArray(index.entries)
    && index.entries.every((entry) => (
      DEPLOYABLE_COVERAGE_SURFACES.includes(entry.surface)
      && DEPLOYABLE_COVERAGE_TYPES.includes(entry.type)
      && DEPLOYABLE_SNAPSHOT_FRESHNESS.includes(entry.freshness)
      && DEPLOYABLE_SNAPSHOT_COVERAGE.includes(entry.coverage)
      && (entry.artifact === null || typeof entry.artifact === "string")
    ))
  )
}

function isArtifactIndex(value: unknown): value is StandardArtifactIndex {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const index = value as Partial<StandardArtifactIndex>
  return (
    index.schemaVersion === STANDARD_ARTIFACT_SCHEMA_VERSION
    && typeof index.generatedAt === "string"
    && Number.isFinite(Date.parse(index.generatedAt))
    && Array.isArray(index.entries)
    && index.entries.every((entry) => (
      STANDARD_ARTIFACT_TYPES.includes(entry.artifactType)
      && typeof entry.partitionKey === "string"
      && Boolean(entry.partitionKey)
      && typeof entry.path === "string"
      && entry.path.endsWith(".json")
      && typeof entry.generatedAt === "string"
      && Number.isFinite(Date.parse(entry.generatedAt))
      && DEPLOYABLE_SNAPSHOT_FRESHNESS.includes(entry.freshness)
      && Number.isInteger(entry.payloadSizeBytes)
      && entry.payloadSizeBytes > 0
      && Number.isInteger(entry.recordCount)
      && entry.recordCount >= 0
      && /^[a-f0-9]{64}$/.test(entry.sourceHash)
    ))
  )
}

export async function auditDeployableSnapshots() {
  let names: string[] = []
  try {
    names = await readdir(ARTIFACT_ROOT)
  } catch {
    names = []
  }
  const unexpectedFiles = names.filter((name) => (
    !EXPECTED_FILES.includes(name) || path.extname(name).toLowerCase() !== ".json"
  ))
  const missingFiles = EXPECTED_FILES.filter((name) => !names.includes(name))
  const artifacts = []
  const invalidFiles: string[] = []
  let coverageIndex: DeployableCoverageIndex | null = null
  let artifactIndex: StandardArtifactIndex | null = null

  for (const name of names.filter((item) => item.endsWith(".json"))) {
    const file = path.join(ARTIFACT_ROOT, name)
    try {
      const details = await stat(file)
      const text = await readFile(file, "utf8")
      const parsed: unknown = JSON.parse(text)
      const deployable = isDeployableSnapshot(parsed) ? parsed : null
      const valid = name === "artifact-index.json"
        ? isArtifactIndex(parsed)
        : deployable !== null
      const reportedSizeMatches = name === "artifact-index.json"
        ? true
        : deployable?.metadata.payloadSizeBytes === details.size
      if (
        !valid
        || !reportedSizeMatches
        || details.size > STANDARD_ARTIFACT_HARD_LIMIT_BYTES
      ) invalidFiles.push(name)
      if (name === "artifact-index.json" && isArtifactIndex(parsed)) {
        artifactIndex = parsed
      }
      if (
        name === "coverage-index.json"
        && deployable
        && isCoverageIndex(deployable.data)
      ) {
        coverageIndex = deployable.data
      }
      artifacts.push({
        file: name,
        bytes: details.size,
        valid,
        reportedSizeMatches,
        warningThresholdExceeded: details.size > STANDARD_ARTIFACT_WARNING_BYTES,
        freshness: deployable?.metadata.freshness ?? null,
        coverage: deployable?.metadata.coverage ?? null,
        storageClass: deployable?.metadata.storageClass ?? null,
        partitionKey: deployable?.metadata.partitionKey ?? null,
        generatedAt: deployable?.metadata.generatedAt ?? null,
        sourceHash: deployable?.metadata.sourceHash ?? null,
        recordCount: deployable?.metadata.recordCount ?? null,
      })
    } catch {
      invalidFiles.push(name)
    }
  }

  const freshnessSummary = Object.fromEntries(
    DEPLOYABLE_SNAPSHOT_FRESHNESS.map((value) => [
      value,
      artifacts.filter((item) => item.freshness === value).length,
    ]),
  )
  const coverageSummary = Object.fromEntries(
    DEPLOYABLE_SNAPSHOT_COVERAGE.map((value) => [
      value,
      coverageIndex?.entries.filter((entry) => entry.coverage === value).length ?? 0,
    ]),
  )
  const status = (
    !missingFiles.length
    && !unexpectedFiles.length
    && !invalidFiles.length
    && coverageIndex !== null
    && artifactIndex !== null
  ) ? "PASS" : "FAIL"
  const payloadArtifacts = artifacts.filter((item) => item.file !== "artifact-index.json")
  const indexMismatch = artifactIndex
    ? payloadArtifacts.flatMap((item) => {
        const entry = artifactIndex!.entries.find((candidate) => candidate.path === item.file)
        if (!entry) return [`${item.file}: missing index entry`]
        if (
          entry.payloadSizeBytes !== item.bytes
          || entry.partitionKey !== item.partitionKey
          || entry.generatedAt !== item.generatedAt
          || entry.sourceHash !== item.sourceHash
          || entry.recordCount !== item.recordCount
          || entry.freshness !== item.freshness
        ) return [`${item.file}: index metadata mismatch`]
        return []
      }).concat(
        artifactIndex.entries
          .filter((entry) => !payloadArtifacts.some((item) => item.file === entry.path))
          .map((entry) => `${entry.path}: orphan index entry`),
      )
    : ["artifact-index.json is unavailable"]
  const finalStatus = status === "PASS" && !indexMismatch.length ? "PASS" : "FAIL"
  const invalidStorageClasses = payloadArtifacts
    .filter((item) => item.storageClass !== "deployable_snapshot")
    .map((item) => item.file)

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: finalStatus === "PASS" && !invalidStorageClasses.length ? "PASS" : "FAIL",
    artifactCount: artifacts.length,
    indexedArtifactCount: artifactIndex?.entries.length ?? 0,
    totalBytes: artifacts.reduce((sum, item) => sum + item.bytes, 0),
    warningThresholdBytes: STANDARD_ARTIFACT_WARNING_BYTES,
    hardFailureThresholdBytes: STANDARD_ARTIFACT_HARD_LIMIT_BYTES,
    artifacts,
    freshnessSummary,
    coverageSummary,
    coverageEntries: coverageIndex?.entries.length ?? 0,
    missingFiles,
    unexpectedFiles,
    invalidFiles: [...new Set(invalidFiles)],
    indexMismatch,
    rawDatasetFiles: unexpectedFiles.filter((name) => (
      /\.(?:parquet|zst|zip|arrow|feather|csv)$/i.test(name)
    )),
    invalidStorageClasses,
  }
}

async function main() {
  const report = await auditDeployableSnapshots()
  process.stdout.write("DEPLOYABLE SNAPSHOT AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== "PASS") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `DEPLOYABLE SNAPSHOT AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
