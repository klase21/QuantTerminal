import {
  DEPLOYABLE_SNAPSHOT_COVERAGE,
  DEPLOYABLE_SNAPSHOT_FRESHNESS,
  DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION,
  type DeployableSnapshot,
} from "./deployableSnapshotTypes"
import {
  artifactSourceHash,
  validateStandardArtifactMetadata,
} from "@/core/artifact-standardization"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function isDeployableSnapshot(value: unknown): value is DeployableSnapshot<unknown> {
  if (!isRecord(value) || !isRecord(value.metadata)) return false
  const candidate = value as unknown as DeployableSnapshot<unknown>
  return (
    value.schemaVersion === DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION
    && typeof value.snapshotId === "string"
    && typeof value.metadata.source === "string"
    && typeof value.metadata.generatedAt === "string"
    && Number.isFinite(Date.parse(value.metadata.generatedAt))
    && (
      value.metadata.observedAt === null
      || (
        typeof value.metadata.observedAt === "string"
        && Number.isFinite(Date.parse(value.metadata.observedAt))
      )
    )
    && DEPLOYABLE_SNAPSHOT_FRESHNESS.includes(
      value.metadata.freshness as typeof DEPLOYABLE_SNAPSHOT_FRESHNESS[number],
    )
    && DEPLOYABLE_SNAPSHOT_COVERAGE.includes(
      value.metadata.coverage as typeof DEPLOYABLE_SNAPSHOT_COVERAGE[number],
    )
    && "data" in value
    && validateStandardArtifactMetadata(candidate.metadata).valid
    && candidate.metadata.storageClass === "deployable_snapshot"
    && candidate.metadata.sourceHash === artifactSourceHash(
      candidate.metadata.source,
      candidate.data,
    )
  )
}
