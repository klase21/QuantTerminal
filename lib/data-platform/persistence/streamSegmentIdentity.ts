import { canonicalChecksum, normalizeIdentifier, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import type { CanonicalRecordIdentity, GovernanceBindings, RawObjectManifest } from "./contracts"
import {
  CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION,
  type CanonicalStreamKind,
  type CanonicalStreamSourceDatasetId,
} from "./streamSegmentContracts"

export interface CanonicalStreamIdentityInput {
  readonly sourceDatasetId: CanonicalStreamSourceDatasetId
  readonly streamKind: CanonicalStreamKind
  readonly providerId: string
  readonly venue: string
  readonly canonicalInstrumentId: string
}

export interface CanonicalStreamSegmentIdentityInput extends CanonicalStreamIdentityInput {
  readonly symbol: string
  readonly windowStart: string
  readonly windowEnd: string
}

export interface CanonicalStreamSegmentChecksumInput extends CanonicalStreamSegmentIdentityInput {
  readonly segmentId: string
  readonly segmentVersion: number
  readonly canonicalStreamId: string
  readonly sourcePartitionKey: string
  readonly firstSequence: string | null
  readonly lastSequence: string | null
  readonly recordCount: number | null
  readonly segmentObjectKey: string
  readonly segmentContentChecksum: string
  readonly columnarFormat: "PARQUET"
  readonly compressionFormat: string
  readonly segmentByteLength: number
  readonly eventTimeMin: string | null
  readonly eventTimeMax: string | null
  readonly validationStatus: "VALIDATED"
  readonly eventOrderPolicy: string
  readonly governance: GovernanceBindings
  readonly sourceRawObject: RawObjectManifest
}

export function deriveCanonicalStreamId(input: CanonicalStreamIdentityInput): string {
  return `cstream_${canonicalChecksum([
    CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION,
    input.sourceDatasetId,
    input.streamKind,
    input.providerId,
    normalizeIdentifier(input.venue),
    normalizeIdentifier(input.canonicalInstrumentId),
  ])}`
}

export function deriveCanonicalStreamSegmentIdentity(input: CanonicalStreamSegmentIdentityInput): CanonicalRecordIdentity {
  const datasetId = input.sourceDatasetId
  const businessIdentity = canonicalChecksum([
    datasetId,
    "INCLUDED",
    input.providerId,
    input.streamKind,
    normalizeIdentifier(input.venue),
    normalizeIdentifier(input.symbol),
    normalizeIsoTimestamp(input.windowStart),
    normalizeIsoTimestamp(input.windowEnd),
  ])
  return Object.freeze({ datasetId, businessIdentity, canonicalRecordId: `rec_${canonicalChecksum([datasetId, businessIdentity])}` })
}

export function deriveCanonicalStreamSegmentVersion(predecessorVersion: number | null): number {
  return predecessorVersion === null ? 1 : predecessorVersion + 1
}

export function deriveCanonicalStreamSegmentChecksum(input: CanonicalStreamSegmentChecksumInput): string {
  return canonicalChecksum({
    segmentContractVersion: CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION,
    sourceDatasetId: input.sourceDatasetId,
    streamKind: input.streamKind,
    providerId: input.providerId,
    venue: normalizeIdentifier(input.venue),
    symbol: normalizeIdentifier(input.symbol),
    canonicalInstrumentId: normalizeIdentifier(input.canonicalInstrumentId),
    canonicalStreamId: input.canonicalStreamId,
    sourcePartitionKey: input.sourcePartitionKey,
    segmentId: input.segmentId,
    segmentVersion: input.segmentVersion,
    windowStart: normalizeIsoTimestamp(input.windowStart),
    windowEnd: normalizeIsoTimestamp(input.windowEnd),
    firstSequence: input.firstSequence,
    lastSequence: input.lastSequence,
    recordCount: input.recordCount,
    segmentObjectKey: input.segmentObjectKey,
    segmentContentChecksum: input.segmentContentChecksum,
    columnarFormat: input.columnarFormat,
    compressionFormat: input.compressionFormat,
    segmentByteLength: input.segmentByteLength,
    eventTimeMin: input.eventTimeMin === null ? null : normalizeIsoTimestamp(input.eventTimeMin),
    eventTimeMax: input.eventTimeMax === null ? null : normalizeIsoTimestamp(input.eventTimeMax),
    validationStatus: input.validationStatus,
    eventOrderPolicy: input.eventOrderPolicy,
    sourceRawObjectId: input.sourceRawObject.objectId,
    sourceRawObjectChecksum: input.sourceRawObject.contentHash,
    schemaVersion: input.governance.schemaVersion,
    normalizationVersion: input.governance.normalizationVersion,
    datasetRegistrySnapshotId: input.governance.datasetRegistrySnapshotId,
    providerRegistrySnapshotId: input.governance.providerRegistrySnapshotId,
    providerCertificationSnapshotId: input.governance.providerCertificationSnapshotId,
    policyVersionId: input.governance.policyVersionId,
  })
}

export function deriveCanonicalStreamSegmentIdempotencyKey(input: { readonly segmentId: string; readonly segmentVersion: number; readonly checksum: string }): string {
  return `stream-segment:${canonicalChecksum([input.segmentId, input.segmentVersion, input.checksum])}`
}
