import { createHash } from "node:crypto"

import {
  ARTIFACT_STORAGE_CLASSES,
  STANDARD_ARTIFACT_HARD_LIMIT_BYTES,
  STANDARD_ARTIFACT_TYPES,
  STANDARD_ARTIFACT_WARNING_BYTES,
  type StandardArtifactMetadata,
} from "./artifactStandardizationTypes"

export function artifactSourceHash(source: string, data: unknown) {
  return createHash("sha256")
    .update(JSON.stringify({ source, data }))
    .digest("hex")
}

export function serializedArtifactBytes(value: unknown) {
  return Buffer.byteLength(`${JSON.stringify(value, null, 2)}\n`, "utf8")
}

export function withPayloadSize<T extends {
  metadata: StandardArtifactMetadata
}>(artifact: T): T {
  let payloadSizeBytes = artifact.metadata.payloadSizeBytes
  let next = artifact
  for (let attempt = 0; attempt < 4; attempt += 1) {
    next = {
      ...artifact,
      metadata: {
        ...artifact.metadata,
        payloadSizeBytes,
      },
    }
    const measured = serializedArtifactBytes(next)
    if (measured === payloadSizeBytes) return next
    payloadSizeBytes = measured
  }
  return {
    ...next,
    metadata: {
      ...next.metadata,
      payloadSizeBytes: serializedArtifactBytes(next),
    },
  }
}

export function validateStandardArtifactMetadata(
  metadata: StandardArtifactMetadata,
) {
  const errors: string[] = []
  const warnings: string[] = []
  if (!STANDARD_ARTIFACT_TYPES.includes(metadata.artifactType)) {
    errors.push("Artifact type is unsupported.")
  }
  if (!metadata.partitionKey.trim() || metadata.partitionKey.includes("\\")) {
    errors.push("Partition key must be a non-empty portable path.")
  }
  if (!Number.isFinite(Date.parse(metadata.generatedAt))) {
    errors.push("generatedAt is invalid.")
  }
  if (!/^[a-f0-9]{64}$/.test(metadata.sourceHash)) {
    errors.push("sourceHash must be a SHA-256 hex digest.")
  }
  if (!Number.isInteger(metadata.recordCount) || metadata.recordCount < 0) {
    errors.push("recordCount must be a non-negative integer.")
  }
  if (!Number.isInteger(metadata.payloadSizeBytes) || metadata.payloadSizeBytes <= 0) {
    errors.push("payloadSizeBytes must be a positive integer.")
  }
  if (!ARTIFACT_STORAGE_CLASSES.includes(metadata.storageClass)) {
    errors.push("storageClass is unsupported.")
  }
  if (metadata.storageClass === "raw_source") {
    errors.push("Raw source data cannot be a deployable artifact.")
  }
  if (metadata.storageClass === "temporary_cache") {
    errors.push("Temporary cache data cannot be a deployable artifact.")
  }
  if (metadata.payloadSizeBytes > STANDARD_ARTIFACT_HARD_LIMIT_BYTES) {
    errors.push("Artifact exceeds the hard size limit.")
  } else if (metadata.payloadSizeBytes > STANDARD_ARTIFACT_WARNING_BYTES) {
    warnings.push("Artifact exceeds the warning size threshold.")
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
