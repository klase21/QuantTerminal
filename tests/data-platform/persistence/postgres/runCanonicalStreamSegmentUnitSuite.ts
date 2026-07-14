import { readFileSync } from "node:fs"
import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  classifyExistingRecord,
  deriveCanonicalRecordIdentity,
  deriveCanonicalStreamSegmentIdentity,
  type CanonicalStreamSegmentFact,
  type CanonicalStreamSegmentInput,
} from "@/lib/data-platform/persistence"
import { buildCanonicalStreamSegmentCommand, validateTypedCanonicalFact } from "@/lib/data-platform/persistence/postgres"

const START = "2026-07-01T00:00:00.000Z"
const END = "2026-07-02T00:00:00.000Z"
const sourceChecksum = canonicalChecksum(["binance-vision-source-zip", "BTCUSDT", "2026-07-01"])
const segmentChecksum = canonicalChecksum(["normalized-parquet-segment", "BTCUSDT", "2026-07-01"])

const base: CanonicalStreamSegmentInput = {
  operationType: "INITIAL_VERSION",
  initiatedAt: END,
  sourceDatasetId: "agg-trade",
  streamKind: "AGG_TRADE",
  providerId: "binance-vision",
  venue: "BINANCE",
  symbol: "BTCUSDT",
  canonicalInstrumentId: "binance-usdm-perpetual:BTC-USDT",
  sourcePartitionKey: "daily/aggTrades/BTCUSDT/2026-07-01",
  windowStart: START,
  windowEnd: END,
  firstSequence: "100",
  lastSequence: "200",
  recordCount: 101,
  segmentObjectKey: "segments/agg-trade/BTCUSDT/2026-07-01.parquet",
  segmentContentChecksum: segmentChecksum,
  columnarFormat: "PARQUET",
  compressionFormat: "ZSTD",
  segmentByteLength: 4096,
  eventTimeMin: START,
  eventTimeMax: "2026-07-01T23:59:59.999Z",
  validationStatus: "VALIDATED",
  eventOrderPolicy: "EVENT_TIME_THEN_SOURCE_SEQUENCE",
  governance: {
    datasetRegistrySnapshotId: "dataset-registry-v1",
    providerRegistrySnapshotId: "provider-registry-v1",
    providerCertificationSnapshotId: "provider-certification-v1",
    policyVersionId: "agg-trade-policy-v1",
    schemaVersion: "2",
    normalizationVersion: "segment-normalizer-v1",
  },
  sourceRawObject: {
    objectId: `raw_${sourceChecksum}`,
    datasetId: "agg-trade",
    providerId: "binance-vision",
    venue: "BINANCE",
    symbolOrSubject: "BTCUSDT",
    windowStart: START,
    windowEnd: END,
    contentHash: sourceChecksum,
    sizeBytes: 8192,
    mediaType: "application/zip",
    compression: "ZIP",
    retrievedAt: END,
    providerSnapshotId: "provider-registry-v1",
    retentionClass: "ARCHIVE",
    verificationState: "VERIFIED",
    objectStorageKey: "raw/agg-trade/BTCUSDT/2026-07-01.zip",
    createdAt: END,
  },
  predecessor: null,
}

const command = buildCanonicalStreamSegmentCommand(base)
const fact = command.fact as CanonicalStreamSegmentFact
const changed = buildCanonicalStreamSegmentCommand({
  ...base,
  segmentObjectKey: "segments/agg-trade/BTCUSDT/2026-07-01-rebuilt.parquet",
  segmentContentChecksum: canonicalChecksum(["rebuilt-segment"]),
  governance: { ...base.governance, normalizationVersion: "segment-normalizer-v2" },
})
const reference = { ...fact.identity, recordVersion: 1, factTable: "STREAM_MANIFEST" as const }
const checks: Array<[string, boolean]> = [
  ["v2 identity uses governed source dataset", fact.identity.datasetId === "agg-trade"],
  ["dedicated and generic identity agree", deriveCanonicalStreamSegmentIdentity(base).canonicalRecordId === deriveCanonicalRecordIdentity(fact).canonicalRecordId],
  ["identity excludes raw content and normalizer", fact.identity.canonicalRecordId === changed.fact.identity.canonicalRecordId],
  ["checksum captures segment content and normalizer", fact.checksum !== changed.fact.checksum],
  ["source artifact and Segment object remain distinct", fact.rawObjectId === base.sourceRawObject.objectId && fact.segmentObjectKey !== base.sourceRawObject.objectStorageKey && fact.sourceRawObjectChecksum === sourceChecksum && fact.segmentContentChecksum === segmentChecksum],
  ["exactly one bounded source lineage edge", command.requiredLineage.length === 1 && command.requiredLineage[0]?.source.nodeId === base.sourceRawObject.objectId && command.requiredLineage[0]?.destination.nodeId === fact.identity.canonicalRecordId],
  ["initial segment version deterministic", command.targetRecordVersion === 1],
  ["segment v2 typed validation passes", validateTypedCanonicalFact(fact).length === 0],
  ["duplicate classification remains checksum exact", classifyExistingRecord({ candidate: reference, candidateChecksum: fact.checksum, existing: reference, existingChecksum: fact.checksum }) === "DUPLICATE"],
  ["same segment version with changed content conflicts", classifyExistingRecord({ candidate: reference, candidateChecksum: changed.fact.checksum, existing: reference, existingChecksum: fact.checksum }) === "CONFLICT"],
]

const migration = readFileSync("lib/data-platform/persistence/postgres/migrations/008_canonical_stream_segments.sql", "utf8")
const requiredColumns = ["source_dataset_id", "canonical_stream_id", "canonical_instrument_id", "source_partition_key", "segment_contract_version", "segment_object_key", "segment_content_checksum", "columnar_format", "compression_format", "segment_byte_length", "event_time_min", "event_time_max", "validation_status", "event_order_policy", "source_raw_object_checksum"]
checks.push(["migration adds complete nullable v2 linkage", requiredColumns.every((column) => migration.includes(`ADD COLUMN ${column}`))])
checks.push(["migration reuses manifest and lifecycle tables", migration.includes("ALTER TABLE canonical.stream_manifests") && !migration.includes("CREATE TABLE")])
checks.push(["migration preserves source raw checksum linkage", migration.includes("FOREIGN KEY (raw_object_id, source_raw_object_checksum)")])
checks.push(["migration introduces no per-event payload rows", !/event_payload|payload_bytes|CREATE TABLE canonical\.(agg_trade_events|orderbook_events)/i.test(migration)])
const readAdapter = readFileSync("lib/data-platform/persistence/postgres/canonicalStreamSegmentAdapter.ts", "utf8")
checks.push(["manifest read port is bounded and published by default", readAdapter.includes("limit > 1_000") && readAdapter.includes("current_publication_state='PUBLISHED'")])
checks.push(["manifest read port uses governed dimensions and keyset ordering", readAdapter.includes("canonical_instrument_id=${query.canonicalInstrumentId}") && readAdapter.includes("ORDER BY m.window_start,m.canonical_record_id,m.record_version")])

const failures = checks.filter(([, pass]) => !pass)
console.log(`D2 CANONICAL STREAM SEGMENT UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
