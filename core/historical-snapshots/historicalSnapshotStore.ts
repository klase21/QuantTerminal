import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import type {
  DeployableSnapshot,
} from "@/core/deployable-snapshots"
import {
  HISTORICAL_SNAPSHOT_DATASETS,
  HISTORICAL_SNAPSHOT_SCHEMA_VERSION,
  type HistoricalRetentionHealth,
  type HistoricalSnapshotDataset,
  type HistoricalSnapshotEnvelope,
  type HistoricalSnapshotResolution,
  type HistoricalSnapshotSummary,
} from "./historicalSnapshotTypes"

export const DEFAULT_DEPLOYABLE_ARTIFACT_ROOT = path.join(
  process.cwd(),
  ".data",
  "artifacts",
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function validDataset(value: string): value is HistoricalSnapshotDataset {
  return HISTORICAL_SNAPSHOT_DATASETS.includes(value as HistoricalSnapshotDataset)
}

function safeTimestamp(value: string) {
  const timestamp = new Date(value)
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("Historical snapshot observedAt is invalid.")
  }
  return timestamp.toISOString()
}

function safeFileTimestamp(value: string) {
  return safeTimestamp(value).replace(/[:.]/g, "-")
}

function datePartition(value: string) {
  return safeTimestamp(value).slice(0, 10)
}

function historyRoot(root: string, dataset: HistoricalSnapshotDataset) {
  return path.join(root, "history", dataset)
}

function resolveInside(root: string, relativePath: string) {
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(root, relativePath)
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Historical snapshot path escapes artifact root.")
  }
  return resolved
}

async function writeJsonNoOverwrite(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true })
  try {
    await stat(file)
    return false
  } catch (error) {
    const missing = Boolean(
      error
      && typeof error === "object"
      && "code" in error
      && error.code === "ENOENT",
    )
    if (!missing) throw error
  }
  const temporary = `${file}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  await rename(temporary, file)
  return true
}

function isHistoricalEnvelope<TData = unknown>(
  value: unknown,
  dataset: HistoricalSnapshotDataset,
): value is HistoricalSnapshotEnvelope<TData> {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === HISTORICAL_SNAPSHOT_SCHEMA_VERSION
    && value.dataset === dataset
    && typeof value.snapshotId === "string"
    && Boolean(value.snapshotId)
    && typeof value.observedAt === "string"
    && Number.isFinite(Date.parse(value.observedAt))
    && typeof value.generatedAt === "string"
    && Number.isFinite(Date.parse(value.generatedAt))
    && typeof value.retainedAt === "string"
    && Number.isFinite(Date.parse(value.retainedAt))
    && typeof value.sourcePath === "string"
    && "data" in value
  )
}

function recordCount(data: unknown) {
  if (isRecord(data) && isRecord(data.metadata)) {
    const count = data.metadata.recordCount
    return Number.isInteger(count) ? count as number : null
  }
  if (Array.isArray(data)) return data.length
  return null
}

export async function retainHistoricalSnapshot<TData>(input: {
  artifactRoot?: string
  dataset: HistoricalSnapshotDataset
  snapshot: DeployableSnapshot<TData>
  sourcePath: string
}) {
  const artifactRoot = path.resolve(input.artifactRoot ?? DEFAULT_DEPLOYABLE_ARTIFACT_ROOT)
  const observedAt = safeTimestamp(input.snapshot.metadata.observedAt ?? "")
  const relativePath = path.join(
    "history",
    input.dataset,
    datePartition(observedAt),
    `${safeFileTimestamp(observedAt)}.json`,
  )
  const envelope: HistoricalSnapshotEnvelope<DeployableSnapshot<TData>> = {
    schemaVersion: HISTORICAL_SNAPSHOT_SCHEMA_VERSION,
    dataset: input.dataset,
    snapshotId: input.snapshot.snapshotId,
    observedAt,
    generatedAt: input.snapshot.metadata.generatedAt,
    retainedAt: new Date().toISOString(),
    sourcePath: input.sourcePath,
    data: input.snapshot,
  }
  const written = await writeJsonNoOverwrite(
    resolveInside(artifactRoot, relativePath),
    envelope,
  )
  return {
    written,
    path: relativePath,
    envelope,
  }
}

export async function retainLatestDeployableSnapshot(input: {
  artifactRoot?: string
  dataset: HistoricalSnapshotDataset
  artifactFile: string
}) {
  const artifactRoot = path.resolve(input.artifactRoot ?? DEFAULT_DEPLOYABLE_ARTIFACT_ROOT)
  const artifactPath = resolveInside(artifactRoot, input.artifactFile)
  const parsed: unknown = JSON.parse(await readFile(artifactPath, "utf8"))
  if (!isRecord(parsed) || !isRecord(parsed.metadata)) {
    throw new Error("Deployable snapshot is invalid and cannot be retained.")
  }
  return retainHistoricalSnapshot({
    artifactRoot,
    dataset: input.dataset,
    snapshot: parsed as unknown as DeployableSnapshot<unknown>,
    sourcePath: input.artifactFile,
  })
}

async function walkJsonFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = await Promise.all(entries.map((entry) => {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) return walkJsonFiles(full)
      return entry.isFile() && entry.name.endsWith(".json") ? [full] : []
    }))
    return files.flat()
  } catch (error) {
    const missing = Boolean(
      error
      && typeof error === "object"
      && "code" in error
      && error.code === "ENOENT",
    )
    if (missing) return []
    throw error
  }
}

export async function readHistoricalSnapshots<TData = unknown>(input: {
  artifactRoot?: string
  dataset: HistoricalSnapshotDataset
}) {
  const artifactRoot = path.resolve(input.artifactRoot ?? DEFAULT_DEPLOYABLE_ARTIFACT_ROOT)
  if (!validDataset(input.dataset)) {
    throw new Error(`Unsupported historical snapshot dataset: ${input.dataset}`)
  }
  const files = await walkJsonFiles(historyRoot(artifactRoot, input.dataset))
  const snapshots: Array<HistoricalSnapshotEnvelope<TData>> = []
  const invalidFiles: string[] = []
  for (const file of files) {
    try {
      const parsed: unknown = JSON.parse(await readFile(file, "utf8"))
      if (isHistoricalEnvelope<TData>(parsed, input.dataset)) {
        snapshots.push(parsed)
      } else {
        invalidFiles.push(path.relative(artifactRoot, file))
      }
    } catch {
      invalidFiles.push(path.relative(artifactRoot, file))
    }
  }
  snapshots.sort((left, right) => (
    Date.parse(left.observedAt) - Date.parse(right.observedAt)
    || left.snapshotId.localeCompare(right.snapshotId)
  ))
  return {
    snapshots,
    invalidFiles,
  }
}

export async function resolveHistoricalSnapshots<TData = unknown>(input: {
  artifactRoot?: string
  dataset: HistoricalSnapshotDataset
  beforeOrAt?: string
}): Promise<HistoricalSnapshotResolution<TData>> {
  const { snapshots } = await readHistoricalSnapshots<TData>(input)
  const upperBound = input.beforeOrAt ? Date.parse(input.beforeOrAt) : Number.POSITIVE_INFINITY
  const bounded = snapshots.filter((snapshot) => Date.parse(snapshot.observedAt) <= upperBound)
  const latest = bounded.at(-1) ?? null
  const previous = latest
    ? [...bounded].reverse().find((snapshot) => snapshot.observedAt !== latest.observedAt) ?? null
    : null
  return {
    dataset: input.dataset,
    latest,
    previous,
    oldest: bounded[0] ?? null,
    snapshots: bounded,
  }
}

export async function summarizeHistoricalRetention(input: {
  artifactRoot?: string
  dataset: HistoricalSnapshotDataset
}) {
  const artifactRoot = path.resolve(input.artifactRoot ?? DEFAULT_DEPLOYABLE_ARTIFACT_ROOT)
  const { snapshots, invalidFiles } = await readHistoricalSnapshots<unknown>(input)
  const summaries: HistoricalSnapshotSummary[] = snapshots.map((snapshot) => ({
    dataset: snapshot.dataset,
    snapshotId: snapshot.snapshotId,
    observedAt: snapshot.observedAt,
    generatedAt: snapshot.generatedAt,
    retainedAt: snapshot.retainedAt,
    path: path.join(
      "history",
      snapshot.dataset,
      datePartition(snapshot.observedAt),
      `${safeFileTimestamp(snapshot.observedAt)}.json`,
    ),
    recordCount: recordCount(snapshot.data),
  }))
  const distinctObservationTimes = new Set(summaries.map((snapshot) => snapshot.observedAt))
  let health: HistoricalRetentionHealth = "healthy"
  if (invalidFiles.length) health = "invalid"
  else if (!summaries.length) health = "missing"
  else if (distinctObservationTimes.size < 2) health = "insufficient_history"

  return {
    artifactRoot,
    dataset: input.dataset,
    snapshotCount: summaries.length,
    distinctObservationTimes: distinctObservationTimes.size,
    oldestTimestamp: summaries[0]?.observedAt ?? null,
    newestTimestamp: summaries.at(-1)?.observedAt ?? null,
    previousSnapshotAvailable: distinctObservationTimes.size >= 2,
    retentionHealth: health,
    invalidFiles,
    snapshots: summaries,
  }
}
