import { readFile, statfs, writeFile } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  createBoundedFundingEventPartition,
  createIntegratedBackfillClientsFromEnvironment,
  type FundingExecutionPartition,
  type FundingExecutionSnapshot,
} from "@/lib/data-platform/population/backfill"

const CORE_START = "2026-04-13T00:00:00.000Z"
const CORE_END = "2026-07-12T00:00:00.000Z"
const AGG_START = "2026-06-28T00:00:00.000Z"
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const
const OUTPUT_PATH = path.join(process.cwd(), "docs", "project", "mvp-recent-market-corpus-manifest.json")
const PROGRESS_PATH = path.join(process.cwd(), "docs", "project", "mvp-recent-market-corpus-progress.json")
const SNAPSHOT_PATHS = Object.freeze({
  ohlcv: path.join(process.cwd(), "docs", "project", "d3-phase-3-ohlcv-execution-snapshot.json"),
  funding: path.join(process.cwd(), "docs", "project", "d3-phase-3-funding-execution-snapshot.json"),
  openInterest: path.join(process.cwd(), "docs", "project", "d3-phase-3-oi-execution-snapshot.json"),
  aggTrade: path.join(process.cwd(), "docs", "project", "d3-phase-3-aggtrades-segment-snapshot.json"),
})

type DatasetId = "ohlcv" | "funding" | "open-interest" | "agg-trade"
type Classification = "COMPLETE_AND_VALID" | "COMPLETE_PUBLICATION_PENDING" | "MISSING_POPULATION" | "INVALID" | "GAP" | "SOURCE_UNAVAILABLE" | "CONFLICT"
interface SnapshotPartition { readonly partitionId: string; readonly providerSymbol: string; readonly utcDay?: string; readonly sourceDay?: string; readonly windowStart: string; readonly windowEnd: string; readonly providerId: string; readonly sourceObject?: string }
interface FactSummary { readonly dataset_id: DatasetId; readonly symbol: string; readonly window_start: Date; readonly window_end: Date; readonly fact_count: number; readonly lineage_count: number; readonly raw_object_count: number; readonly conflict_count: number; readonly pending_publication_count: number; readonly other_publication_count: number; readonly canonical_reference_digest: string | null }
interface FundingFact { readonly symbol: string; readonly event_time: Date; readonly canonical_record_id: string; readonly record_version: number; readonly lineage_count: number; readonly raw_object_id: string | null; readonly raw_checksum: string | null; readonly publication_state: string; readonly conflict_count: number }
interface UnitSummary { readonly partition_key: string; readonly dataset_id: DatasetId; readonly symbol: string; readonly window_start: Date; readonly window_end: Date; readonly current_state: string; readonly unit_id: string; readonly outcome_count: number; readonly coverage_count: number; readonly checkpoint_count: number; readonly conflict_count: number; readonly gap_count: number; readonly unavailable_count: number }
interface SegmentSummary { readonly symbol: string; readonly window_start: Date; readonly window_end: Date; readonly canonical_record_id: string; readonly record_version: number; readonly record_count: number; readonly segment_content_checksum: string; readonly segment_byte_length: number; readonly validation_status: string; readonly lineage_count: number; readonly raw_object_id: string | null; readonly raw_checksum: string | null; readonly publication_state: string; readonly conflict_count: number }

function days(start: string, end: string): readonly string[] {
  const result: string[] = []
  for (let cursor = Date.parse(start); cursor < Date.parse(end); cursor += 86_400_000) result.push(new Date(cursor).toISOString().slice(0, 10))
  return Object.freeze(result)
}

function dayWindow(day: string) {
  const windowStart = `${day}T00:00:00.000Z`
  return Object.freeze({ windowStart, windowEnd: new Date(Date.parse(windowStart) + 86_400_000).toISOString() })
}

async function json<T>(file: string): Promise<T> { return JSON.parse(await readFile(file, "utf8")) as T }

function operationClassification(unit: UnitSummary | undefined): Classification | null {
  if (!unit) return null
  if (unit.conflict_count > 0) return "CONFLICT"
  if (unit.gap_count > 0) return "GAP"
  if (unit.unavailable_count > 0) return "SOURCE_UNAVAILABLE"
  if (unit.current_state !== "COMPLETED") return "INVALID"
  return null
}

function completeClassification(pending: number, other: number): Classification {
  return pending > 0 && other === 0 ? "COMPLETE_PUBLICATION_PENDING" : "COMPLETE_AND_VALID"
}

async function readPersisted(clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>) {
  const [daily, funding, units, segments, database] = await Promise.all([
    clients.d2.sql<FactSummary[]>`
      WITH facts AS (
        SELECT 'ohlcv'::text dataset_id,o.symbol,date_trunc('day',o.open_time) window_start,date_trunc('day',o.open_time)+interval '1 day' window_end,o.canonical_record_id,o.record_version
        FROM canonical.ohlcv o WHERE o.open_time>=${CORE_START} AND o.open_time<${CORE_END} AND o.symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
        UNION ALL
        SELECT 'open-interest',o.symbol,date_trunc('day',o.observed_at),date_trunc('day',o.observed_at)+interval '1 day',o.canonical_record_id,o.record_version
        FROM canonical.open_interest o WHERE o.observed_at>=${CORE_START} AND o.observed_at<${CORE_END} AND o.symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
      ), raw_lineage AS (
        SELECT destination_node_id,destination_node_version,min(source_node_id) source_node_id
        FROM repository.lineage_edges
        WHERE source_node_type='RAW_OBJECT' AND destination_node_type='CANONICAL_FACT'
        GROUP BY destination_node_id,destination_node_version
      ), conflicts AS (
        SELECT canonical_record_id,record_version,count(*)::int conflict_count
        FROM quarantine.conflicts GROUP BY canonical_record_id,record_version
      )
      SELECT f.dataset_id,f.symbol,f.window_start,f.window_end,count(*)::int fact_count,
        count(e.destination_node_id)::int lineage_count,count(DISTINCT e.source_node_id)::int raw_object_count,
        COALESCE(sum(q.conflict_count),0)::int conflict_count,
        count(*) FILTER (WHERE rv.current_publication_state='PENDING')::int pending_publication_count,
        count(*) FILTER (WHERE rv.current_publication_state<>'PENDING')::int other_publication_count,
        md5(string_agg(f.canonical_record_id||':'||f.record_version::text,',' ORDER BY f.canonical_record_id,f.record_version)) canonical_reference_digest
      FROM facts f JOIN repository.record_versions rv USING(canonical_record_id,record_version)
      LEFT JOIN raw_lineage e ON e.destination_node_id=f.canonical_record_id AND e.destination_node_version=f.record_version::text
      LEFT JOIN conflicts q USING(canonical_record_id,record_version)
      GROUP BY f.dataset_id,f.symbol,f.window_start,f.window_end ORDER BY f.dataset_id,f.symbol,f.window_start`,
    clients.d2.sql<FundingFact[]>`
      SELECT f.symbol,f.funding_time event_time,f.canonical_record_id,f.record_version,
        count(DISTINCT e.source_node_id)::int lineage_count,min(e.source_node_id) raw_object_id,min(r.content_hash) raw_checksum,
        rv.current_publication_state publication_state,count(DISTINCT q.conflict_id)::int conflict_count
      FROM canonical.funding f JOIN repository.record_versions rv USING(canonical_record_id,record_version)
      LEFT JOIN repository.lineage_edges e ON e.destination_node_id=f.canonical_record_id AND e.destination_node_version=f.record_version::text AND e.source_node_type='RAW_OBJECT'
      LEFT JOIN raw.objects r ON r.object_id=e.source_node_id LEFT JOIN quarantine.conflicts q USING(canonical_record_id,record_version)
      WHERE f.funding_time>=${CORE_START} AND f.funding_time<${CORE_END} AND f.symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
      GROUP BY f.symbol,f.funding_time,f.canonical_record_id,f.record_version,rv.current_publication_state ORDER BY f.symbol,f.funding_time`,
    clients.d3.sql<UnitSummary[]>`
      SELECT u.partition_key,u.dataset_id,u.subject_or_symbol symbol,u.window_start,u.window_end,u.current_state,u.unit_id,
        (SELECT count(*)::int FROM control.population_outcomes o WHERE o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE')) outcome_count,
        (SELECT count(*)::int FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') coverage_count,
        (SELECT count(*)::int FROM control.population_checkpoints p WHERE p.unit_id=u.unit_id AND p.completed_stage='COMPLETED') checkpoint_count,
        (SELECT count(*)::int FROM population.candidates c JOIN population.candidate_conflicts q USING(candidate_id) WHERE c.unit_id=u.unit_id) conflict_count,
        (SELECT count(*)::int FROM control.population_unit_events e WHERE e.unit_id=u.unit_id AND e.event_id LIKE 'gap-%') gap_count,
        (SELECT count(*)::int FROM control.population_unit_events e WHERE e.unit_id=u.unit_id AND e.event_id LIKE 'source-not-available:%') unavailable_count
      FROM control.population_units u WHERE u.dataset_id IN ('ohlcv','funding','open-interest','agg-trade')
        AND u.subject_or_symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
        AND u.window_end>${CORE_START} AND u.window_start<${CORE_END}
      ORDER BY u.dataset_id,u.subject_or_symbol,u.window_start,u.partition_key`,
    clients.d2.sql<SegmentSummary[]>`
      SELECT m.symbol,m.window_start,m.window_end,m.canonical_record_id,m.record_version,m.record_count::int,m.segment_content_checksum,m.segment_byte_length::int,m.validation_status,
        count(DISTINCT e.source_node_id)::int lineage_count,min(e.source_node_id) raw_object_id,min(r.content_hash) raw_checksum,
        rv.current_publication_state publication_state,count(DISTINCT q.conflict_id)::int conflict_count
      FROM canonical.stream_manifests m JOIN repository.record_versions rv USING(canonical_record_id,record_version)
      LEFT JOIN repository.lineage_edges e ON e.destination_node_id=m.canonical_record_id AND e.destination_node_version=m.record_version::text AND e.source_node_type='RAW_OBJECT'
      LEFT JOIN raw.objects r ON r.object_id=e.source_node_id LEFT JOIN quarantine.conflicts q USING(canonical_record_id,record_version)
      WHERE m.source_dataset_id='agg-trade' AND m.segment_contract_version='2' AND m.window_start>=${AGG_START} AND m.window_end<=${CORE_END}
        AND m.symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
      GROUP BY m.symbol,m.window_start,m.window_end,m.canonical_record_id,m.record_version,m.record_count,m.segment_content_checksum,m.segment_byte_length,m.validation_status,rv.current_publication_state
      ORDER BY m.symbol,m.window_start`,
    clients.d2.sql<Array<{ database_bytes: string }>>`SELECT pg_database_size(current_database())::text database_bytes`,
  ])
  return { daily, funding, units, segments, databaseBytes: Number(database[0].database_bytes) }
}

async function inventory() {
  const [ohlcvSnapshot, oiSnapshot, aggSnapshot, fundingSnapshot] = await Promise.all([
    json<{ parentManifestId: string; parentManifestChecksum: string; partitions: SnapshotPartition[] }>(SNAPSHOT_PATHS.ohlcv),
    json<{ parentManifestId: string; parentManifestChecksum: string; partitions: SnapshotPartition[] }>(SNAPSHOT_PATHS.openInterest),
    json<{ parentManifestId: string; parentManifestChecksum: string; partitions: SnapshotPartition[] }>(SNAPSHOT_PATHS.aggTrade),
    json<FundingExecutionSnapshot>(SNAPSHOT_PATHS.funding),
  ])
  const daily = days(CORE_START, CORE_END)
  const aggDays = days(AGG_START, CORE_END)
  const selectDaily = (partitions: readonly SnapshotPartition[], datasetId: DatasetId, selectedDays: readonly string[]) => selectedDays.flatMap((day) => SYMBOLS.map((symbol) => {
    const partition = partitions.find((item) => item.providerSymbol === symbol && (item.utcDay ?? item.sourceDay) === day)
    if (!partition) throw new Error(`MVP_CORPUS_SNAPSHOT_PARTITION_MISSING:${datasetId}:${symbol}:${day}`)
    return { datasetId, symbol, partition }
  }))
  const funding = fundingSnapshot.partitions.filter((item) => SYMBOLS.includes(item.providerSymbol as typeof SYMBOLS[number]) && (item.sourcePeriod === "2026-04" || item.sourcePeriod === "2026-05" || item.sourcePeriod === "2026-06" || item.sourceKind === "BINANCE_OFFICIAL_REST_TAIL")).map((partition) => {
    if (partition.sourcePeriod !== "2026-04") return partition
    return createBoundedFundingEventPartition(partition, CORE_START, "2026-05-01T00:00:00.000Z")
  })
  return {
    parentManifestId: ohlcvSnapshot.parentManifestId,
    parentManifestChecksum: ohlcvSnapshot.parentManifestChecksum,
    cells: [
      ...selectDaily(ohlcvSnapshot.partitions, "ohlcv", daily),
      ...funding.map((partition) => ({ datasetId: "funding" as const, symbol: partition.providerSymbol, partition })),
      ...selectDaily(oiSnapshot.partitions, "open-interest", daily),
      ...selectDaily(aggSnapshot.partitions, "agg-trade", aggDays),
    ],
  }
}

async function verify() {
  const expected = await inventory()
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "READ_ONLY", maxConnections: 2, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-corpus-d2" }, d3: { roleIntent: "READ_ONLY", maxConnections: 1, applicationName: "mvp-corpus-d3" } })
  try {
    const persisted = await readPersisted(clients)
    const unitMap = new Map(persisted.units.map((unit) => [unit.partition_key, unit]))
    const unitWindowMap = new Map(persisted.units.map((unit) => [`${unit.dataset_id}:${unit.symbol}:${unit.window_start.toISOString()}:${unit.window_end.toISOString()}`, unit]))
    const dailyMap = new Map(persisted.daily.map((row) => [`${row.dataset_id}:${row.symbol}:${row.window_start.toISOString()}`, row]))
    const segmentMap = new Map(persisted.segments.map((row) => [`${row.symbol}:${row.window_start.toISOString()}`, row]))
    const cells = expected.cells.map(({ datasetId, symbol, partition }) => {
      const unit = unitMap.get(partition.partitionId) ?? unitWindowMap.get(`${datasetId}:${symbol}:${partition.windowStart}:${partition.windowEnd}`)
      const operationFailure = operationClassification(unit)
      if (datasetId === "funding") {
        const fundingPartition = partition as FundingExecutionPartition
        const rows = persisted.funding.filter((row) => row.symbol === symbol && row.event_time >= new Date(partition.windowStart) && row.event_time < new Date(partition.windowEnd))
        const valid = Boolean(unit?.current_state === "COMPLETED" && unit.coverage_count > 0 && unit.checkpoint_count > 0 && rows.length > 0 && rows.every((row) => row.lineage_count === 1) && unit.outcome_count === rows.length)
        const conflictCount = rows.reduce((sum, row) => sum + row.conflict_count, unit?.conflict_count ?? 0)
        const classification: Classification = conflictCount ? "CONFLICT" : operationFailure ?? (valid ? completeClassification(rows.filter((row) => row.publication_state === "PENDING").length, rows.filter((row) => row.publication_state !== "PENDING").length) : rows.length || unit ? "INVALID" : "MISSING_POPULATION")
        return { datasetId, symbol, partitionId: partition.partitionId, windowStart: partition.windowStart, windowEnd: partition.windowEnd, providerId: partition.providerId, sourceKind: fundingPartition.sourceKind, classification, observedCount: rows.length, expectedCount: null, unitId: unit?.unit_id ?? null, rawObjectCount: new Set(rows.flatMap((row) => row.raw_object_id ? [row.raw_object_id] : [])).size, canonicalReferenceDigest: rows.length ? canonicalChecksum(rows.map((row) => `${row.canonical_record_id}:${row.record_version}`).sort()) : null, lineageValid: rows.length > 0 && rows.every((row) => row.lineage_count === 1), coverageValid: (unit?.coverage_count ?? 0) > 0, publicationStatus: rows.length && rows.every((row) => row.publication_state === "PENDING") ? "PENDING_ELIGIBLE" : "MIXED_OR_MISSING", conflicts: conflictCount }
      }
      if (datasetId === "agg-trade") {
        const row = segmentMap.get(`${symbol}:${partition.windowStart}`)
        const valid = Boolean(unit?.current_state === "COMPLETED" && unit.coverage_count > 0 && unit.checkpoint_count > 0 && row?.validation_status === "VALIDATED" && row.lineage_count === 1 && row.record_count > 0)
        const conflicts = (row?.conflict_count ?? 0) + (unit?.conflict_count ?? 0)
        const classification: Classification = conflicts ? "CONFLICT" : operationFailure ?? (valid && row ? completeClassification(row.publication_state === "PENDING" ? 1 : 0, row.publication_state === "PENDING" ? 0 : 1) : row || unit ? "INVALID" : "MISSING_POPULATION")
        return { datasetId, symbol, partitionId: partition.partitionId, windowStart: partition.windowStart, windowEnd: partition.windowEnd, providerId: partition.providerId, classification, observedCount: row?.record_count ?? 0, expectedCount: null, unitId: unit?.unit_id ?? null, rawObjectCount: row?.raw_object_id ? 1 : 0, canonicalReferenceDigest: row ? canonicalChecksum([`${row.canonical_record_id}:${row.record_version}`]) : null, segmentChecksum: row?.segment_content_checksum ?? null, segmentBytes: row?.segment_byte_length ?? null, lineageValid: row?.lineage_count === 1, coverageValid: (unit?.coverage_count ?? 0) > 0, publicationStatus: row?.publication_state === "PENDING" ? "PENDING_ELIGIBLE" : row?.publication_state ?? "MISSING", conflicts }
      }
      const row = dailyMap.get(`${datasetId}:${symbol}:${partition.windowStart}`)
      const expectedCount = datasetId === "ohlcv" ? 288 : null
      const factsMatch = Boolean(row && row.fact_count > 0 && (expectedCount === null || row.fact_count === expectedCount))
      const countValid = datasetId === "open-interest" ? (unit?.outcome_count ?? 0) > 0 : unit?.outcome_count === row?.fact_count
      const valid = Boolean(unit?.current_state === "COMPLETED" && unit.coverage_count > 0 && unit.checkpoint_count > 0 && countValid && factsMatch && row?.lineage_count === row?.fact_count)
      const conflicts = (row?.conflict_count ?? 0) + (unit?.conflict_count ?? 0)
      const classification: Classification = conflicts ? "CONFLICT" : operationFailure ?? (valid && row ? completeClassification(row.pending_publication_count, row.other_publication_count) : row || unit ? "INVALID" : "MISSING_POPULATION")
      return { datasetId, symbol, partitionId: partition.partitionId, windowStart: partition.windowStart, windowEnd: partition.windowEnd, providerId: partition.providerId, classification, observedCount: datasetId === "open-interest" ? unit?.outcome_count ?? 0 : row?.fact_count ?? 0, eventTimeWindowCount: row?.fact_count ?? 0, expectedCount, unitId: unit?.unit_id ?? null, rawObjectCount: row?.raw_object_count ?? 0, canonicalReferenceDigest: row?.canonical_reference_digest ?? null, lineageValid: row?.lineage_count === row?.fact_count && (row?.fact_count ?? 0) > 0, coverageValid: (unit?.coverage_count ?? 0) > 0, publicationStatus: row && row.pending_publication_count === row.fact_count ? "PENDING_ELIGIBLE" : "MIXED_OR_MISSING", conflicts }
    })
    const perDataset = (["ohlcv", "funding", "open-interest", "agg-trade"] as const).map((datasetId) => {
      const selected = cells.filter((cell) => cell.datasetId === datasetId)
      const classifications = Object.fromEntries([...new Set(selected.map((cell) => cell.classification))].sort().map((classification) => [classification, selected.filter((cell) => cell.classification === classification).length]))
      return { datasetId, requiredPartitions: selected.length, classifications, observedRecords: selected.reduce((sum, cell) => sum + cell.observedCount, 0), completePartitions: selected.filter((cell) => cell.classification === "COMPLETE_AND_VALID" || cell.classification === "COMPLETE_PUBLICATION_PENDING").length, missingPartitions: selected.filter((cell) => cell.classification === "MISSING_POPULATION").length, invalidPartitions: selected.filter((cell) => cell.classification === "INVALID").length, gaps: selected.filter((cell) => cell.classification === "GAP").length, conflicts: selected.reduce((sum, cell) => sum + cell.conflicts, 0) }
    })
    const objectFs = await statfs(process.env.D3_BACKFILL_OBJECT_ROOT!)
    const basis = { schemaVersion: "mvp-recent-market-corpus-basis/v1", profileId: "quantterminal-working-mvp-recent-market-corpus", profileVersion: "1.0.0", repositoryHead: process.env.MVP_CORPUS_REPOSITORY_HEAD ?? null, parentManifestId: expected.parentManifestId, parentManifestChecksum: expected.parentManifestChecksum, windows: { ohlcv: { start: CORE_START, end: CORE_END }, funding: { start: CORE_START, end: CORE_END }, openInterest: { start: CORE_START, end: CORE_END }, aggTrade: { start: AGG_START, end: CORE_END } }, instruments: SYMBOLS, datasetBindings: { ohlcv: { providerId: "binance-public-archive", granularity: "5m", targetKind: "CANONICAL_FACT" }, funding: { providerIds: ["binance-vision", "binance-official-rest-funding-rate"], granularity: "EVENT_8H", targetKind: "CANONICAL_FACT" }, openInterest: { providerId: "binance-vision", granularity: "5m", targetKind: "CANONICAL_FACT" }, aggTrade: { providerId: "binance-public-archive", granularity: "tick", targetKind: "STREAM_MANIFEST" } }, cells, perDataset }
    const corpusChecksum = canonicalChecksum(basis)
    const complete = perDataset.every((row) => row.completePartitions === row.requiredPartitions && row.gaps === 0 && row.invalidPartitions === 0 && row.conflicts === 0)
    return { schemaVersion: "mvp-recent-market-corpus-manifest/v1", corpusId: `mvp-recent-market-corpus:${corpusChecksum}`, corpusChecksum, basis, storage: { measuredDatabaseBytes: persisted.databaseBytes, measuredArtifactFreeBytes: objectFs.bavail * objectFs.bsize }, publicationBoundary: { repositoryState: "PENDING", corpusEligibility: complete ? "ELIGIBLE" : "INCOMPLETE", consumerProjectionStatus: "NOT_CREATED" }, complete }
  } finally { await clients.shutdown() }
}

async function main() {
  const command = process.argv[2]
  if (command !== "inspect" && command !== "write") throw new Error("Usage: verifyMvpRecentMarketCorpus.ts <inspect|write>")
  const result = await verify()
  if (command === "write") {
    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8")
    await writeFile(PROGRESS_PATH, `${JSON.stringify({ schemaVersion: "mvp-recent-market-corpus-progress/v1", generatedAt: new Date().toISOString(), corpusId: result.corpusId, complete: result.complete, perDataset: result.basis.perDataset }, null, 2)}\n`, "utf8")
  }
  console.log(JSON.stringify(result, null, 2))
  if (!result.complete) process.exitCode = 2
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_CORPUS_VERIFICATION_FAILED"); process.exitCode = 1 })
