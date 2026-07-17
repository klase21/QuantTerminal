import { canonicalChecksum, normalizeIdentifier, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import { plannedCommitIdentity, validateGovernanceBindings } from "../canonicalCommit"
import type { CanonicalCommitCommand, CanonicalCommitResult, RawObjectManifest } from "../contracts"
import {
  CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION,
  CANONICAL_STREAM_SEGMENT_PARQUET_MEDIA_TYPE,
  type CanonicalStreamSegmentCommitResult,
  type CanonicalStreamSegmentFact,
  type CanonicalStreamSegmentInput,
} from "../streamSegmentContracts"
import {
  deriveCanonicalStreamId,
  deriveCanonicalStreamSegmentChecksum,
  deriveCanonicalStreamSegmentIdempotencyKey,
  deriveCanonicalStreamSegmentIdentity,
  deriveCanonicalStreamSegmentVersion,
} from "../streamSegmentIdentity"
import type { ManifestResult } from "./adapterTypes"
import type { IsolatedPostgresClient } from "./client"
import type { CanonicalStreamSegmentListRequest, CanonicalStreamSegmentListResult, CanonicalStreamSegmentManifestRead } from "../streamSegmentContracts"
import { validateRawObjectScope } from "../rawObjectScope"

export interface CanonicalStreamSegmentCommitPort {
  registerRawObjectManifest(input: RawObjectManifest): Promise<ManifestResult>
  executeCanonicalCommit(command: CanonicalCommitCommand): Promise<CanonicalCommitResult>
}

export interface CanonicalStreamSegmentPersistenceAdapter {
  commitSegment(input: CanonicalStreamSegmentInput): Promise<CanonicalStreamSegmentCommitResult>
}

export interface CanonicalStreamSegmentReadPort { readSegments(query: CanonicalStreamSegmentListRequest): Promise<CanonicalStreamSegmentListResult> }

export function createCanonicalStreamSegmentReadPort(client: IsolatedPostgresClient): CanonicalStreamSegmentReadPort {
  return Object.freeze({
    async readSegments(query) {
      const limit = query.limit ?? 100
      const reasons = [!query.providerId.trim() ? "PROVIDER_ID_MISSING" : null, !query.canonicalInstrumentId.trim() ? "INSTRUMENT_ID_MISSING" : null, !validTimestamp(query.windowStart) || !validTimestamp(query.windowEnd) || Date.parse(query.windowEnd) <= Date.parse(query.windowStart) ? "WINDOW_INVALID" : null, !Number.isInteger(limit) || limit < 1 || limit > 1_000 ? "LIMIT_INVALID" : null].filter((value): value is string => value !== null)
      if (reasons.length) return { status: "INVALID_REQUEST" as const, reasons: Object.freeze(reasons) }
      const afterWindow = query.after?.windowStart ?? null; const afterId = query.after?.segmentId ?? null; const afterVersion = query.after?.segmentVersion ?? null
      const rows = await client.sql<Array<{ segment_id: string; segment_version: number; checksum: string; canonical_stream_id: string; raw_object_id: string; segment_object_key: string; publication_state: CanonicalStreamSegmentManifestRead["publicationState"]; source_dataset_id: CanonicalStreamSegmentManifestRead["sourceDatasetId"]; provider_id: string; stream_kind: CanonicalStreamSegmentManifestRead["streamKind"]; venue: string; symbol: string; canonical_instrument_id: string; source_partition_key: string; segment_contract_version: "2"; source_raw_object_checksum: string; segment_content_checksum: string; columnar_format: "PARQUET"; compression_format: string; segment_byte_length: string; event_time_min: Date | null; event_time_max: Date | null; event_order_policy: string; validation_status: "VALIDATED"; first_sequence: string | null; last_sequence: string | null; record_count: string; window_start: Date; window_end: Date; commit_id: string }>>`
        SELECT m.canonical_record_id segment_id,m.record_version::int segment_version,m.checksum,m.canonical_stream_id,m.raw_object_id,m.segment_object_key,r.current_publication_state publication_state,m.source_dataset_id,m.provider_id,m.stream_kind,m.venue,m.symbol,m.canonical_instrument_id,m.source_partition_key,m.segment_contract_version,m.source_raw_object_checksum,m.segment_content_checksum,m.columnar_format,m.compression_format,m.segment_byte_length::text,m.event_time_min,m.event_time_max,m.event_order_policy,m.validation_status,m.first_sequence,m.last_sequence,m.record_count::text,m.window_start,m.window_end,m.commit_id
        FROM canonical.stream_manifests m JOIN repository.record_versions r ON r.canonical_record_id=m.canonical_record_id AND r.record_version=m.record_version
        WHERE m.segment_contract_version='2' AND m.source_dataset_id=${query.sourceDatasetId} AND m.provider_id=${query.providerId} AND m.canonical_instrument_id=${query.canonicalInstrumentId} AND m.window_end>${query.windowStart} AND m.window_start<${query.windowEnd}
          AND r.current_publication_state='PUBLISHED'
          AND (${afterWindow}::timestamptz IS NULL OR (m.window_start,m.canonical_record_id,m.record_version)>(${afterWindow}::timestamptz,${afterId},${afterVersion}))
        ORDER BY m.window_start,m.canonical_record_id,m.record_version LIMIT ${limit}`
      const segments = rows.map((row): CanonicalStreamSegmentManifestRead => Object.freeze({ segmentId: row.segment_id, segmentVersion: row.segment_version, checksum: row.checksum, canonicalStreamId: row.canonical_stream_id, sourceRawObjectId: row.raw_object_id, segmentObjectKey: row.segment_object_key, publicationState: row.publication_state, sourceDatasetId: row.source_dataset_id, providerId: row.provider_id, streamKind: row.stream_kind, venue: row.venue, symbol: row.symbol, canonicalInstrumentId: row.canonical_instrument_id, sourcePartitionKey: row.source_partition_key, segmentContractVersion: row.segment_contract_version, sourceRawObjectChecksum: row.source_raw_object_checksum, segmentContentChecksum: row.segment_content_checksum, columnarFormat: row.columnar_format, compressionFormat: row.compression_format, segmentByteLength: Number(row.segment_byte_length), eventTimeMin: row.event_time_min?.toISOString() ?? null, eventTimeMax: row.event_time_max?.toISOString() ?? null, eventOrderPolicy: row.event_order_policy, validationStatus: row.validation_status, firstSequence: row.first_sequence, lastSequence: row.last_sequence, recordCount: Number(row.record_count), windowStart: row.window_start.toISOString(), windowEnd: row.window_end.toISOString(), commitId: row.commit_id }))
      const last = segments.at(-1)!
      return { status: "READY" as const, segments: Object.freeze(segments), next: segments.length === limit ? Object.freeze({ windowStart: last.windowStart, segmentId: last.segmentId, segmentVersion: last.segmentVersion }) : null }
    },
  })
}

const expectedDataset = (streamKind: CanonicalStreamSegmentInput["streamKind"]) => streamKind === "AGG_TRADE" ? "agg-trade" : "orderbook"
const validTimestamp = (value: string) => Number.isFinite(Date.parse(value))

export function validateCanonicalStreamSegmentInput(input: CanonicalStreamSegmentInput): readonly string[] {
  const errors = [...validateGovernanceBindings(input.governance)]
  if (!input.providerId.trim()) errors.push("PROVIDER_ID_MISSING")
  if (!input.venue.trim()) errors.push("VENUE_MISSING")
  if (!input.symbol.trim()) errors.push("SYMBOL_MISSING")
  if (!input.canonicalInstrumentId.trim()) errors.push("CANONICAL_INSTRUMENT_ID_MISSING")
  if (!input.sourcePartitionKey.trim()) errors.push("SOURCE_PARTITION_KEY_MISSING")
  if (input.sourceDatasetId !== expectedDataset(input.streamKind)) errors.push("SOURCE_DATASET_STREAM_KIND_MISMATCH")
  if (!validTimestamp(input.initiatedAt) || !validTimestamp(input.windowStart) || !validTimestamp(input.windowEnd) || Date.parse(input.windowEnd) <= Date.parse(input.windowStart)) errors.push("INVALID_SEGMENT_WINDOW")
  if ((input.firstSequence === null) !== (input.lastSequence === null) || input.firstSequence === "" || input.lastSequence === "") errors.push("INVALID_SEQUENCE_BOUNDS")
  if (!Number.isSafeInteger(input.recordCount) || input.recordCount < 0) errors.push("INVALID_RECORD_COUNT")
  if (!input.segmentObjectKey.trim()) errors.push("SEGMENT_OBJECT_KEY_MISSING")
  if (!/^[a-f0-9]{64}$/.test(input.segmentContentChecksum)) errors.push("SEGMENT_CONTENT_CHECKSUM_INVALID")
  if (input.columnarFormat !== "PARQUET") errors.push("SEGMENT_COLUMNAR_FORMAT_INVALID")
  if (!input.compressionFormat.trim()) errors.push("SEGMENT_COMPRESSION_FORMAT_MISSING")
  if (!Number.isSafeInteger(input.segmentByteLength) || input.segmentByteLength < 0) errors.push("SEGMENT_BYTE_LENGTH_INVALID")
  if (!input.eventOrderPolicy.trim()) errors.push("EVENT_ORDER_POLICY_MISSING")
  if (input.validationStatus !== "VALIDATED") errors.push("SEGMENT_NOT_VALIDATED")
  if ((input.eventTimeMin === null) !== (input.eventTimeMax === null) || (input.recordCount > 0 && (input.eventTimeMin === null || input.eventTimeMax === null))) errors.push("EVENT_TIME_BOUNDS_MISSING")
  if (input.eventTimeMin !== null && input.eventTimeMax !== null && (!validTimestamp(input.eventTimeMin) || !validTimestamp(input.eventTimeMax) || Date.parse(input.eventTimeMax) < Date.parse(input.eventTimeMin) || Date.parse(input.eventTimeMin) < Date.parse(input.windowStart) || Date.parse(input.eventTimeMax) > Date.parse(input.windowEnd))) errors.push("EVENT_TIME_BOUNDS_INVALID")
  if (input.operationType === "INITIAL_VERSION" && input.predecessor !== null) errors.push("INITIAL_SEGMENT_HAS_PREDECESSOR")
  if (input.operationType === "PROVIDER_CORRECTION" && (!input.predecessor || !Number.isInteger(input.predecessor.segmentVersion) || input.predecessor.segmentVersion <= 0 || !/^[a-f0-9]{64}$/.test(input.predecessor.checksum))) errors.push("CORRECTION_PREDECESSOR_INVALID")

  const raw = input.sourceRawObject
  if (input.columnarFormat !== "PARQUET" || !input.segmentObjectKey || !input.segmentContentChecksum) errors.push("NORMALIZED_PARQUET_REQUIRED")
  if (raw.verificationState !== "VERIFIED") errors.push("RAW_OBJECT_NOT_VERIFIED")
  if (raw.objectId !== `raw_${raw.contentHash}` || !/^[a-f0-9]{64}$/.test(raw.contentHash)) errors.push("RAW_OBJECT_IDENTITY_INVALID")
  errors.push(...validateRawObjectScope({ datasetId: input.sourceDatasetId, providerId: input.providerId, providerSnapshotId: input.governance.providerRegistrySnapshotId, instrument: input.symbol, sourceContractVersion: CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION, expectedSourceContractVersion: CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION, intervalStart: input.windowStart, intervalEnd: input.windowEnd, intervalPolicy: "CONTAINED", rawObject: raw }))
  return Object.freeze([...new Set(errors)])
}

export function buildCanonicalStreamSegmentCommand(input: CanonicalStreamSegmentInput): CanonicalCommitCommand {
  const errors = validateCanonicalStreamSegmentInput(input)
  if (errors.length) throw new Error(`INVALID_CANONICAL_STREAM_SEGMENT:${errors.join(",")}`)

  const identity = deriveCanonicalStreamSegmentIdentity(input)
  if (input.predecessor && input.predecessor.segmentId !== identity.canonicalRecordId) throw new Error("INVALID_CANONICAL_STREAM_SEGMENT:PREDECESSOR_SEGMENT_ID_MISMATCH")
  const segmentVersion = deriveCanonicalStreamSegmentVersion(input.predecessor?.segmentVersion ?? null)
  const canonicalStreamId = deriveCanonicalStreamId(input)
  const checksum = deriveCanonicalStreamSegmentChecksum({ ...input, segmentId: identity.canonicalRecordId, segmentVersion, canonicalStreamId })
  const fact: CanonicalStreamSegmentFact = Object.freeze({
    kind: "STREAM_MANIFEST",
    identity,
    providerId: input.providerId,
    venue: normalizeIdentifier(input.venue),
    symbolOrSubject: normalizeIdentifier(input.symbol),
    observedAt: normalizeIsoTimestamp(input.windowEnd),
    effectiveAt: null,
    checksum,
    governance: input.governance,
    streamKind: input.streamKind,
    rawObjectId: input.sourceRawObject.objectId,
    windowStart: normalizeIsoTimestamp(input.windowStart),
    windowEnd: normalizeIsoTimestamp(input.windowEnd),
    firstSequence: input.firstSequence,
    lastSequence: input.lastSequence,
    recordCount: input.recordCount,
    sourceDatasetId: input.sourceDatasetId,
    canonicalStreamId,
    canonicalInstrumentId: input.canonicalInstrumentId,
    sourcePartitionKey: input.sourcePartitionKey,
    segmentContractVersion: CANONICAL_STREAM_SEGMENT_CONTRACT_VERSION,
    segmentObjectKey: input.segmentObjectKey,
    segmentContentChecksum: input.segmentContentChecksum,
    columnarFormat: input.columnarFormat,
    compressionFormat: input.compressionFormat,
    segmentByteLength: input.segmentByteLength,
    eventTimeMin: input.eventTimeMin === null ? null : normalizeIsoTimestamp(input.eventTimeMin),
    eventTimeMax: input.eventTimeMax === null ? null : normalizeIsoTimestamp(input.eventTimeMax),
    validationStatus: input.validationStatus,
    eventOrderPolicy: input.eventOrderPolicy,
    sourceRawObjectChecksum: input.sourceRawObject.contentHash,
  })
  const predecessor = input.predecessor ? Object.freeze({ ...identity, recordVersion: input.predecessor.segmentVersion, factTable: "STREAM_MANIFEST" as const }) : null
  const provisional: CanonicalCommitCommand = {
    operationType: input.operationType,
    idempotencyKey: deriveCanonicalStreamSegmentIdempotencyKey({ segmentId: identity.canonicalRecordId, segmentVersion, checksum }),
    initiatedAt: normalizeIsoTimestamp(input.initiatedAt),
    rawObject: input.sourceRawObject,
    fact,
    targetRecordVersion: segmentVersion,
    predecessor,
    requiredLineage: [],
  }
  const commitId = plannedCommitIdentity(provisional)
  return Object.freeze({
    ...provisional,
    requiredLineage: Object.freeze([{
      edgeId: `edge_${canonicalChecksum([input.sourceRawObject.objectId, identity.canonicalRecordId, segmentVersion, checksum])}`,
      source: { nodeType: "RAW_OBJECT" as const, nodeId: input.sourceRawObject.objectId, nodeVersion: input.sourceRawObject.contentHash },
      destination: { nodeType: "CANONICAL_FACT" as const, nodeId: identity.canonicalRecordId, nodeVersion: String(segmentVersion) },
      relationship: "NORMALIZED_FROM" as const,
      commitId,
      createdAt: normalizeIsoTimestamp(input.initiatedAt),
      digest: checksum,
    }]),
  })
}

function mapCommitResult(result: CanonicalCommitResult, command: CanonicalCommitCommand, rawManifestStatus: "SUCCESS" | "DUPLICATE"): CanonicalStreamSegmentCommitResult {
  const fact = command.fact as CanonicalStreamSegmentFact
  if (result.status === "SUCCESS") return {
    status: "SUCCESS",
    segment: { segmentId: fact.identity.canonicalRecordId, segmentVersion: command.targetRecordVersion, checksum: fact.checksum, canonicalStreamId: fact.canonicalStreamId, sourceRawObjectId: fact.rawObjectId, segmentObjectKey: fact.segmentObjectKey, publicationState: "PENDING" },
    commit: result.commit,
    rawManifestStatus,
  }
  if (result.status === "DUPLICATE") return { status: "DUPLICATE", segmentId: result.canonicalRecordId, segmentVersion: result.recordVersion, checksum: result.checksum, rawManifestStatus }
  if (result.status === "CONFLICT") return { status: "CONFLICT", scope: "SEGMENT_VERSION", segmentId: result.conflict.identity.canonicalRecordId, segmentVersion: result.conflict.recordVersion, existingChecksum: result.conflict.existingChecksum, candidateChecksum: result.conflict.candidateChecksum, conflictId: result.conflict.conflictId, quarantineId: result.quarantine.quarantineId }
  return result
}

export function createCanonicalStreamSegmentPersistenceAdapter(port: CanonicalStreamSegmentCommitPort): CanonicalStreamSegmentPersistenceAdapter {
  return Object.freeze({
    async commitSegment(input): Promise<CanonicalStreamSegmentCommitResult> {
      const errors = validateCanonicalStreamSegmentInput(input)
      if (errors.length) return { status: "REJECTED" as const, reasons: errors }
      let command: CanonicalCommitCommand
      try { command = buildCanonicalStreamSegmentCommand(input) }
      catch (cause) { return { status: "REJECTED" as const, reasons: Object.freeze([cause instanceof Error ? cause.message : "INVALID_CANONICAL_STREAM_SEGMENT"]) } }

      const rawResult = await port.registerRawObjectManifest(input.sourceRawObject)
      if (rawResult.status === "CONFLICT") return { status: "CONFLICT" as const, scope: "RAW_OBJECT" as const, reason: rawResult.reason }
      if (rawResult.status === "REJECTED") return { status: "REJECTED" as const, reasons: Object.freeze([rawResult.reason]) }
      return mapCommitResult(await port.executeCanonicalCommit(command), command, rawResult.status)
    },
  })
}
