import type {
  CanonicalCommit,
  GovernanceBindings,
  PublicationState,
  RawObjectManifest,
  StreamManifestFact,
} from "./contracts"

export const CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION = "2" as const
export const CANONICAL_STREAM_SEGMENT_PARQUET_MEDIA_TYPE = "application/vnd.apache.parquet" as const
export const CANONICAL_STREAM_SEGMENT_READ_LIMIT = 1000 as const

export type CanonicalStreamSourceDatasetId = "agg-trade" | "orderbook"
export type CanonicalStreamKind = "AGG_TRADE" | "ORDERBOOK"
export type CanonicalStreamSegmentOperation = "INITIAL_VERSION" | "PROVIDER_CORRECTION"

export interface CanonicalStreamSegmentReference {
  readonly segmentId: string
  readonly segmentVersion: number
  readonly checksum: string
}

export interface CanonicalStreamSegmentInput {
  readonly operationType: CanonicalStreamSegmentOperation
  readonly initiatedAt: string
  readonly sourceDatasetId: CanonicalStreamSourceDatasetId
  readonly streamKind: CanonicalStreamKind
  readonly providerId: string
  readonly venue: string
  readonly symbol: string
  readonly canonicalInstrumentId: string
  readonly sourcePartitionKey: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly firstSequence: string | null
  readonly lastSequence: string | null
  readonly recordCount: number
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
  readonly predecessor: CanonicalStreamSegmentReference | null
}

export interface CanonicalStreamSegmentFact extends StreamManifestFact {
  readonly sourceDatasetId: CanonicalStreamSourceDatasetId
  readonly canonicalStreamId: string
  readonly canonicalInstrumentId: string
  readonly sourcePartitionKey: string
  readonly segmentContractVersion: typeof CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION
  readonly segmentObjectKey: string
  readonly segmentContentChecksum: string
  readonly columnarFormat: "PARQUET"
  readonly compressionFormat: string
  readonly segmentByteLength: number
  readonly eventTimeMin: string | null
  readonly eventTimeMax: string | null
  readonly validationStatus: "VALIDATED"
  readonly eventOrderPolicy: string
  readonly sourceRawObjectChecksum: string
}

export interface CanonicalStreamSegmentRead {
  readonly segmentId: string
  readonly segmentVersion: number
  readonly checksum: string
  readonly canonicalStreamId: string
  readonly sourceRawObjectId: string
  readonly segmentObjectKey: string
  readonly publicationState: PublicationState
}

export interface CanonicalStreamSegmentListCursor {
  readonly windowStart: string
  readonly segmentId: string
  readonly segmentVersion: number
}

export interface CanonicalStreamSegmentListRequest {
  readonly sourceDatasetId: CanonicalStreamSourceDatasetId
  readonly providerId: string
  readonly canonicalInstrumentId: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly limit?: number
  readonly after?: CanonicalStreamSegmentListCursor | null
}

export interface CanonicalStreamSegmentManifestRead extends CanonicalStreamSegmentRead {
  readonly providerId: string
  readonly streamKind: CanonicalStreamKind
  readonly venue: string
  readonly symbol: string
  readonly sourceDatasetId: CanonicalStreamSourceDatasetId
  readonly canonicalInstrumentId: string
  readonly sourcePartitionKey: string
  readonly segmentContractVersion: typeof CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION
  readonly segmentContentChecksum: string
  readonly columnarFormat: "PARQUET"
  readonly compressionFormat: string
  readonly segmentByteLength: number
  readonly eventTimeMin: string | null
  readonly eventTimeMax: string | null
  readonly eventOrderPolicy: string
  readonly validationStatus: "VALIDATED"
  readonly sourceRawObjectChecksum: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly firstSequence: string | null
  readonly lastSequence: string | null
  readonly recordCount: number
  readonly commitId: string
}

export type CanonicalStreamSegmentListResult =
  | { readonly status: "READY"; readonly segments: readonly CanonicalStreamSegmentManifestRead[]; readonly next: CanonicalStreamSegmentListCursor | null }
  | { readonly status: "INVALID_REQUEST"; readonly reasons: readonly string[] }
  | { readonly status: "TARGET_UNAVAILABLE"; readonly reason: string }

export type CanonicalStreamSegmentCommitResult =
  | { readonly status: "SUCCESS"; readonly segment: CanonicalStreamSegmentRead; readonly commit: CanonicalCommit; readonly rawManifestStatus: "SUCCESS" | "DUPLICATE" }
  | { readonly status: "DUPLICATE"; readonly segmentId: string; readonly segmentVersion: number; readonly checksum: string; readonly rawManifestStatus: "SUCCESS" | "DUPLICATE" }
  | { readonly status: "CONFLICT"; readonly scope: "RAW_OBJECT"; readonly reason: string }
  | { readonly status: "CONFLICT"; readonly scope: "SEGMENT_VERSION"; readonly segmentId: string; readonly segmentVersion: number; readonly existingChecksum: string; readonly candidateChecksum: string; readonly conflictId: string; readonly quarantineId: string }
  | { readonly status: "REJECTED"; readonly reasons: readonly string[] }
  | { readonly status: "RETRYABLE_FAILURE"; readonly code: "DEADLOCK" | "SERIALIZATION_FAILURE" | "CONNECTION_INTERRUPTED"; readonly retryWithSameIdempotencyKey: true }

export interface CanonicalStreamSegmentV2Metadata {
  readonly sourceDatasetId: CanonicalStreamSourceDatasetId
  readonly canonicalStreamId: string
  readonly canonicalInstrumentId: string
  readonly sourcePartitionKey: string
  readonly segmentContractVersion: typeof CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION
  readonly segmentObjectKey: string
  readonly segmentContentChecksum: string
  readonly columnarFormat: "PARQUET"
  readonly compressionFormat: string
  readonly segmentByteLength: number
  readonly eventTimeMin: string | null
  readonly eventTimeMax: string | null
  readonly validationStatus: "VALIDATED"
  readonly eventOrderPolicy: string
  readonly sourceRawObjectChecksum: string
}

const V2_FIELDS = Object.freeze([
  "sourceDatasetId", "canonicalStreamId", "canonicalInstrumentId", "sourcePartitionKey", "segmentContractVersion",
  "segmentObjectKey", "segmentContentChecksum", "columnarFormat", "compressionFormat", "segmentByteLength",
  "eventTimeMin", "eventTimeMax", "validationStatus", "eventOrderPolicy", "sourceRawObjectChecksum",
] as const)

export function hasCanonicalStreamSegmentV2Metadata(fact: StreamManifestFact): boolean {
  const candidate = fact as StreamManifestFact & Partial<CanonicalStreamSegmentV2Metadata>
  return V2_FIELDS.some((field) => candidate[field] !== undefined && candidate[field] !== null)
}

export function canonicalStreamSegmentV2Metadata(fact: StreamManifestFact): CanonicalStreamSegmentV2Metadata | null {
  const candidate = fact as StreamManifestFact & Partial<CanonicalStreamSegmentV2Metadata>
  const requiredStrings = [candidate.sourceDatasetId, candidate.canonicalStreamId, candidate.canonicalInstrumentId, candidate.sourcePartitionKey, candidate.segmentContractVersion, candidate.segmentObjectKey, candidate.segmentContentChecksum, candidate.columnarFormat, candidate.compressionFormat, candidate.validationStatus, candidate.eventOrderPolicy, candidate.sourceRawObjectChecksum]
  if (!requiredStrings.every((value) => typeof value === "string" && value.trim().length > 0)) return null
  if (!Number.isSafeInteger(candidate.segmentByteLength) || candidate.segmentByteLength! < 0) return null
  if ((candidate.eventTimeMin === null) !== (candidate.eventTimeMax === null)) return null
  if (candidate.segmentContractVersion !== CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION) return null
  if (candidate.sourceDatasetId !== "agg-trade" && candidate.sourceDatasetId !== "orderbook") return null
  if (candidate.columnarFormat !== "PARQUET" || candidate.validationStatus !== "VALIDATED") return null
  return Object.freeze({
    sourceDatasetId: candidate.sourceDatasetId,
    canonicalStreamId: candidate.canonicalStreamId!,
    canonicalInstrumentId: candidate.canonicalInstrumentId!,
    sourcePartitionKey: candidate.sourcePartitionKey!,
    segmentContractVersion: candidate.segmentContractVersion,
    segmentObjectKey: candidate.segmentObjectKey!,
    segmentContentChecksum: candidate.segmentContentChecksum!,
    columnarFormat: candidate.columnarFormat,
    compressionFormat: candidate.compressionFormat!,
    segmentByteLength: candidate.segmentByteLength!,
    eventTimeMin: candidate.eventTimeMin ?? null,
    eventTimeMax: candidate.eventTimeMax ?? null,
    validationStatus: candidate.validationStatus,
    eventOrderPolicy: candidate.eventOrderPolicy!,
    sourceRawObjectChecksum: candidate.sourceRawObjectChecksum!,
  })
}
