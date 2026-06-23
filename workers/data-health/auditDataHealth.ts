import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  STANDARD_ARTIFACT_SCHEMA_VERSION,
} from "@/core/artifact-standardization"
import {
  DATA_HEALTH_SCHEMA_VERSION,
  evaluateArtifactHealth,
  type DataHealthAuditReport,
  type DataHealthRecord,
  type DataHealthStatus,
  type ProductSurfaceHealthSummary,
} from "@/core/data-health"
import {
  DEPLOYABLE_COVERAGE_SURFACES,
  DEPLOYABLE_COVERAGE_TYPES,
  DEPLOYABLE_SNAPSHOT_COVERAGE,
  DEPLOYABLE_SNAPSHOT_FRESHNESS,
  isDeployableSnapshot,
  type DeployableCoverageEntry,
  type DeployableCoverageIndex,
  type DeployableCoverageSurface,
} from "@/core/deployable-snapshots"

const ARTIFACT_ROOT = path.join(process.cwd(), ".data", "artifacts")
const ARTIFACT_INDEX = path.join(ARTIFACT_ROOT, "artifact-index.json")

interface HealthArtifactIndexEntry {
  artifactType: string
  partitionKey: string
  path: string
  generatedAt: string
  freshness: "current" | "stale" | "missing"
  payloadSizeBytes: number
  recordCount: number
  sourceHash: string
}

interface HealthArtifactIndex {
  schemaVersion: typeof STANDARD_ARTIFACT_SCHEMA_VERSION
  generatedAt: string
  entries: HealthArtifactIndexEntry[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isArtifactIndexEntry(value: unknown): value is HealthArtifactIndexEntry {
  if (!isRecord(value)) return false
  return (
    typeof value.artifactType === "string"
    && Boolean(value.artifactType)
    && typeof value.partitionKey === "string"
    && typeof value.path === "string"
    && typeof value.generatedAt === "string"
    && typeof value.freshness === "string"
    && Number.isInteger(value.payloadSizeBytes)
    && Number.isInteger(value.recordCount)
    && typeof value.sourceHash === "string"
  )
}

function isArtifactIndex(value: unknown): value is HealthArtifactIndex {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === STANDARD_ARTIFACT_SCHEMA_VERSION
    && typeof value.generatedAt === "string"
    && Number.isFinite(Date.parse(value.generatedAt))
    && Array.isArray(value.entries)
    && value.entries.every(isArtifactIndexEntry)
  )
}

function isCoverageIndex(value: unknown): value is DeployableCoverageIndex {
  if (!isRecord(value)) return false
  return (
    typeof value.schemaVersion === "number"
    && typeof value.generatedAt === "string"
    && Array.isArray(value.entries)
    && value.entries.every((entry: unknown) => {
      if (!isRecord(entry)) return false
      return (
        DEPLOYABLE_COVERAGE_SURFACES.includes(
          entry.surface as DeployableCoverageSurface,
        )
        && DEPLOYABLE_COVERAGE_TYPES.includes(
          entry.type as DeployableCoverageEntry["type"],
        )
        && DEPLOYABLE_SNAPSHOT_FRESHNESS.includes(
          entry.freshness as DeployableCoverageEntry["freshness"],
        )
        && DEPLOYABLE_SNAPSHOT_COVERAGE.includes(
          entry.coverage as DeployableCoverageEntry["coverage"],
        )
        && (entry.artifact === null || typeof entry.artifact === "string")
      )
    })
  )
}

function resolvedArtifactPath(relativePath: string) {
  const root = path.resolve(ARTIFACT_ROOT)
  const resolved = path.resolve(root, relativePath)
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Artifact index path escapes the deployable artifact root.")
  }
  return resolved
}

async function readArtifactIndex() {
  const parsed: unknown = JSON.parse(await readFile(ARTIFACT_INDEX, "utf8"))
  if (!isArtifactIndex(parsed)) {
    throw new Error("Deployable artifact index is invalid.")
  }
  return parsed
}

async function healthRecord(
  entry: HealthArtifactIndexEntry,
  now: number,
): Promise<DataHealthRecord> {
  let file: string
  try {
    file = resolvedArtifactPath(entry.path)
  } catch (error) {
    return {
      artifactType: entry.artifactType,
      partitionKey: entry.partitionKey,
      path: entry.path,
      status: "invalid",
      reason: error instanceof Error ? error.message : "Artifact path is invalid.",
      generatedAt: entry.generatedAt,
      maxAgeMs: null,
      ageMs: null,
      freshness: entry.freshness,
      coverage: null,
      recordCount: entry.recordCount,
      payloadSizeBytes: entry.payloadSizeBytes,
      sourceHash: entry.sourceHash,
    }
  }

  try {
    const [details, text] = await Promise.all([
      stat(file),
      readFile(file, "utf8"),
    ])
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
    return evaluateArtifactHealth({
      entry,
      path: entry.path,
      exists: true,
      actualBytes: details.size,
      parsed,
      now,
    })
  } catch (error) {
    const missing = Boolean(
      error
      && typeof error === "object"
      && "code" in error
      && error.code === "ENOENT",
    )
    return evaluateArtifactHealth({
      entry,
      path: entry.path,
      exists: !missing,
      actualBytes: null,
      parsed: null,
      now,
    })
  }
}

async function readCoverageEntries(records: DataHealthRecord[]) {
  const coverageHealth = records.find((record) => (
    record.artifactType === "coverage_index"
  ))
  if (!coverageHealth || coverageHealth.status === "invalid" || coverageHealth.status === "missing") {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(
      await readFile(resolvedArtifactPath(coverageHealth.path), "utf8"),
    )
    if (!isDeployableSnapshot(parsed) || !isCoverageIndex(parsed.data)) return null
    return parsed.data.entries
  } catch {
    return null
  }
}

function coverageStatus(entry: DeployableCoverageEntry): DataHealthStatus {
  if (entry.coverage === "unavailable" || entry.freshness === "missing") {
    return "missing"
  }
  return entry.freshness === "current" ? "current" : "stale"
}

function productSurfaceSummaries(
  entries: DeployableCoverageEntry[] | null,
  records: DataHealthRecord[],
): ProductSurfaceHealthSummary[] {
  if (!entries) {
    return DEPLOYABLE_COVERAGE_SURFACES.map((surface) => ({
      surface,
      currentEvidenceCount: 0,
      staleEvidenceCount: 0,
      missingEvidenceCount: 0,
      blockingIssues: ["Coverage index is unavailable or invalid."],
    }))
  }
  return DEPLOYABLE_COVERAGE_SURFACES.map((surface) => {
    const surfaceEntries = entries.filter((entry) => entry.surface === surface)
    const statuses = surfaceEntries.map((entry) => {
      if (!entry.artifact) {
        return {
          entry,
          status: coverageStatus(entry),
          reason: entry.reason ?? `${entry.type} has no deployable artifact.`,
        }
      }
      const record = records.find((candidate) => candidate.path === entry.artifact)
      return {
        entry,
        status: record?.status ?? "missing",
        reason: record?.reason ?? `${entry.artifact} is not indexed.`,
      }
    })
    return {
      surface,
      currentEvidenceCount: statuses.filter((item) => item.status === "current").length,
      staleEvidenceCount: statuses.filter((item) => item.status === "stale").length,
      missingEvidenceCount: statuses.filter((item) => item.status === "missing").length,
      blockingIssues: statuses
        .filter((item) => (
          item.status === "missing"
          || item.status === "invalid"
          || item.status === "unsupported"
        ))
        .map((item) => `${item.entry.type}: ${item.reason}`),
    }
  })
}

function count(records: DataHealthRecord[], status: DataHealthStatus) {
  return records.filter((record) => record.status === status).length
}

export async function auditDataHealth(): Promise<DataHealthAuditReport> {
  const auditedAt = new Date()
  let index: HealthArtifactIndex
  try {
    index = await readArtifactIndex()
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Artifact index is unavailable."
    return {
      schemaVersion: DATA_HEALTH_SCHEMA_VERSION,
      auditedAt: auditedAt.toISOString(),
      readOnly: true,
      status: "FAIL",
      summary: {
        totalArtifacts: 0,
        currentCount: 0,
        staleCount: 0,
        missingCount: 0,
        invalidCount: 0,
        unsupportedCount: 0,
      },
      artifacts: [],
      productSurfaces: productSurfaceSummaries(null, []),
      structuralFailures: [reason],
    }
  }

  const records: DataHealthRecord[] = []
  for (const entry of index.entries) {
    records.push(await healthRecord(entry, auditedAt.getTime()))
  }
  const coverageEntries = await readCoverageEntries(records)
  const structuralFailures = records
    .filter((record) => (
      record.status === "invalid"
      || record.status === "unsupported"
      || (
        record.status === "missing"
        && record.reason === "Indexed artifact file is missing."
      )
    ))
    .map((record) => `${record.path}: ${record.reason}`)

  return {
    schemaVersion: DATA_HEALTH_SCHEMA_VERSION,
    auditedAt: auditedAt.toISOString(),
    readOnly: true,
    status: structuralFailures.length ? "FAIL" : "PASS",
    summary: {
      totalArtifacts: records.length,
      currentCount: count(records, "current"),
      staleCount: count(records, "stale"),
      missingCount: count(records, "missing"),
      invalidCount: count(records, "invalid"),
      unsupportedCount: count(records, "unsupported"),
    },
    artifacts: records,
    productSurfaces: productSurfaceSummaries(coverageEntries, records),
    structuralFailures,
  }
}

async function main() {
  const report = await auditDataHealth()
  process.stdout.write("DATA HEALTH AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== "PASS") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `DATA HEALTH AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
