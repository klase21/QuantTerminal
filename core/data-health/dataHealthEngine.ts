import {
  artifactSourceHash,
} from "@/core/artifact-standardization"
import {
  isDeployableSnapshot,
  type DeployableSnapshot,
} from "@/core/deployable-snapshots"
import { dataFreshnessPolicy } from "./dataHealthPolicies"
import type {
  DataHealthRecord,
} from "./dataHealthTypes"

export interface ArtifactHealthInput {
  entry: {
    artifactType: string
    partitionKey: string
    path: string
    generatedAt: string
    freshness: "current" | "stale" | "missing"
    payloadSizeBytes: number
    recordCount: number
    sourceHash: string
  }
  path: string
  exists: boolean
  actualBytes: number | null
  parsed: unknown
  now?: number
}

function ageTimestamp(snapshot: DeployableSnapshot<unknown>) {
  const observedAt = Date.parse(snapshot.metadata.observedAt ?? "")
  if (Number.isFinite(observedAt)) return observedAt
  const generatedAt = Date.parse(snapshot.metadata.generatedAt)
  return Number.isFinite(generatedAt) ? generatedAt : null
}

function baseRecord(input: ArtifactHealthInput): DataHealthRecord {
  return {
    artifactType: input.entry.artifactType,
    partitionKey: input.entry.partitionKey,
    path: input.path,
    status: "invalid",
    reason: "Artifact validation has not completed.",
    generatedAt: input.entry.generatedAt,
    maxAgeMs: dataFreshnessPolicy(input.entry.artifactType),
    ageMs: null,
    freshness: input.entry.freshness,
    coverage: null,
    recordCount: input.entry.recordCount,
    payloadSizeBytes: input.entry.payloadSizeBytes,
    sourceHash: input.entry.sourceHash,
  }
}

export function evaluateArtifactHealth(
  input: ArtifactHealthInput,
): DataHealthRecord {
  const record = baseRecord(input)
  if (!input.exists) {
    return {
      ...record,
      status: "missing",
      reason: "Indexed artifact file is missing.",
      generatedAt: null,
      freshness: null,
      recordCount: null,
      payloadSizeBytes: null,
      sourceHash: null,
    }
  }
  const maxAgeMs = dataFreshnessPolicy(input.entry.artifactType)
  if (maxAgeMs === null) {
    return {
      ...record,
      status: "unsupported",
      reason: "No freshness policy exists for this artifact type.",
    }
  }
  if (!isDeployableSnapshot(input.parsed)) {
    return {
      ...record,
      status: "invalid",
      reason: "Artifact payload or standardized metadata is invalid.",
    }
  }

  const snapshot = input.parsed
  const metadata = snapshot.metadata
  const metadataMatches = (
    metadata.artifactType === input.entry.artifactType
    && metadata.partitionKey === input.entry.partitionKey
    && metadata.generatedAt === input.entry.generatedAt
    && metadata.sourceHash === input.entry.sourceHash
    && metadata.recordCount === input.entry.recordCount
    && metadata.payloadSizeBytes === input.entry.payloadSizeBytes
    && metadata.freshness === input.entry.freshness
  )
  if (!metadataMatches) {
    return {
      ...record,
      status: "invalid",
      reason: "Artifact metadata does not match the artifact index.",
      coverage: metadata.coverage,
    }
  }
  if (input.actualBytes !== metadata.payloadSizeBytes) {
    return {
      ...record,
      status: "invalid",
      reason: "Reported payload size does not match the file size.",
      coverage: metadata.coverage,
    }
  }
  if (metadata.sourceHash !== artifactSourceHash(metadata.source, snapshot.data)) {
    return {
      ...record,
      status: "invalid",
      reason: "Source hash does not match the normalized payload.",
      coverage: metadata.coverage,
    }
  }
  if (
    !Number.isInteger(metadata.recordCount)
    || metadata.recordCount < 0
    || !Number.isFinite(Date.parse(metadata.generatedAt))
  ) {
    return {
      ...record,
      status: "invalid",
      reason: "recordCount or generatedAt is invalid.",
      coverage: metadata.coverage,
    }
  }

  const observedTimestamp = ageTimestamp(snapshot)
  const ageMs = observedTimestamp === null
    ? null
    : Math.max(0, (input.now ?? Date.now()) - observedTimestamp)
  const populated = metadata.recordCount > 0 && metadata.coverage !== "unavailable"
  if (
    metadata.freshness === "missing"
    || metadata.coverage === "unavailable"
    || !populated
  ) {
    return {
      ...record,
      status: "missing",
      reason: metadata.reason ?? "Artifact contains no available evidence.",
      generatedAt: metadata.generatedAt,
      maxAgeMs,
      ageMs,
      freshness: metadata.freshness,
      coverage: metadata.coverage,
      recordCount: metadata.recordCount,
      payloadSizeBytes: metadata.payloadSizeBytes,
      sourceHash: metadata.sourceHash,
    }
  }
  if (
    metadata.freshness === "stale"
    || ageMs === null
    || ageMs > maxAgeMs
  ) {
    return {
      ...record,
      status: "stale",
      reason: ageMs === null
        ? "Artifact has no valid observation timestamp."
        : `Artifact age ${ageMs}ms exceeds the ${maxAgeMs}ms freshness policy.`,
      generatedAt: metadata.generatedAt,
      maxAgeMs,
      ageMs,
      freshness: metadata.freshness,
      coverage: metadata.coverage,
      recordCount: metadata.recordCount,
      payloadSizeBytes: metadata.payloadSizeBytes,
      sourceHash: metadata.sourceHash,
    }
  }
  return {
    ...record,
    status: "current",
    reason: "Artifact is valid and within its freshness policy.",
    generatedAt: metadata.generatedAt,
    maxAgeMs,
    ageMs,
    freshness: metadata.freshness,
    coverage: metadata.coverage,
    recordCount: metadata.recordCount,
    payloadSizeBytes: metadata.payloadSizeBytes,
    sourceHash: metadata.sourceHash,
  }
}
