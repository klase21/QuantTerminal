import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"
import { MVP_CERTIFICATION_PROFILE, MVP_IDENTITY_BINDING_VERSION, evaluateMvpPublicationEligibility, requireMvpDatasetIdentity, type MvpDatasetId } from "@/lib/data-platform/registry"

const START = "2026-07-11T00:00:00.000Z"
const END = "2026-07-12T00:00:00.000Z"
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const
const DATASETS = ["ohlcv", "funding", "open-interest", "agg-trade"] as const
const INSTRUMENTS = Object.freeze<Record<string, string>>({
  BTCUSDT: "binance-usdm-perpetual:BTC-USDT", ETHUSDT: "binance-usdm-perpetual:ETH-USDT", SOLUSDT: "binance-usdm-perpetual:SOL-USDT",
  BNBUSDT: "binance-usdm-perpetual:BNB-USDT", XRPUSDT: "binance-usdm-perpetual:XRP-USDT", DOGEUSDT: "binance-usdm-perpetual:DOGE-USDT",
})

type PublicationState = "PENDING" | "CERTIFIED" | "PUBLISHED" | "SUPERSEDED" | "REJECTED" | "REVOKED"
interface FactRow {
  readonly dataset_id: MvpDatasetId
  readonly symbol: string
  readonly provider_id: string
  readonly granularity: string
  readonly canonical_instrument_id: string | null
  readonly canonical_record_id: string
  readonly record_version: number
  readonly event_time: Date
  readonly terminal_time: Date
  readonly event_count: number
  readonly normalization_version: string
  readonly content_checksum: string
  readonly segment_checksum: string | null
  readonly segment_byte_length: number | null
  readonly validation_status: string | null
  readonly publication_state: PublicationState
  readonly lineage_count: number
  readonly raw_object_count: number
  readonly raw_object_id: string | null
  readonly raw_object_checksum: string | null
  readonly raw_verified: boolean
  readonly conflict_count: number
}
interface OperationRow {
  readonly dataset_id: MvpDatasetId
  readonly symbol: string
  readonly unit_count: number
  readonly all_units_completed: boolean
  readonly candidate_count: number
  readonly candidates_acceptable: boolean
  readonly coverage_count: number
  readonly coverage_eligible: boolean
  readonly completed_checkpoint_count: number
  readonly conflict_count: number
}
interface OhlcvTruthRow { readonly fact_count: number; readonly completed_units: number; readonly candidate_count: number; readonly outcome_count: number; readonly coverage_count: number; readonly active_leases: number }

function expectedCount(datasetId: MvpDatasetId): number {
  if (datasetId === "ohlcv") return 288
  if (datasetId === "open-interest") return 287
  if (datasetId === "funding") return 3
  return 1
}

function timestampAligned(datasetId: MvpDatasetId, row: FactRow): boolean {
  const event = row.event_time.getTime()
  if (!Number.isFinite(event) || event < Date.parse(START) || event >= Date.parse(END)) return false
  if (datasetId === "agg-trade") return row.terminal_time.getTime() < Date.parse(END) && row.terminal_time.getTime() >= event
  if (datasetId === "funding") return event % (8 * 60 * 60 * 1000) === 0
  return event % (5 * 60 * 1000) === 0
}

function summarizeRecords(rows: readonly FactRow[], operations: readonly OperationRow[]) {
  const operationMap = new Map(operations.map((row) => [`${row.dataset_id}:${row.symbol}`, row]))
  const summaries = []
  for (const symbol of SYMBOLS) for (const datasetId of DATASETS) {
    const selected = rows.filter((row) => row.dataset_id === datasetId && row.symbol === symbol)
    const operation = operationMap.get(`${datasetId}:${symbol}`)
    const providerIds = [...new Set(selected.map((row) => row.provider_id))]
    const granularities = [...new Set(selected.map((row) => row.granularity))]
    const identityValid = selected.length > 0 && providerIds.length === 1 && granularities.length === 1 && (() => {
      try {
        requireMvpDatasetIdentity({ datasetId, providerId: providerIds[0], venue: "BINANCE", marketType: "USD_M_FUTURES", canonicalInstrumentId: INSTRUMENTS[symbol], granularity: granularities[0] })
        return selected.every((row) => row.normalization_version === requireMvpDatasetIdentity({ datasetId, providerId: row.provider_id, venue: "BINANCE", marketType: "USD_M_FUTURES", canonicalInstrumentId: INSTRUMENTS[symbol], granularity: row.granularity }).normalizerId)
      } catch { return false }
    })()
    const required = expectedCount(datasetId)
    const persistenceValid = selected.length === required && (datasetId !== "agg-trade" || selected[0].event_count > 0)
    const lineageValid = persistenceValid && selected.every((row) => row.lineage_count === 1 && row.raw_object_count === 1 && row.raw_verified)
    const timestampsValid = persistenceValid && selected.every((row) => timestampAligned(datasetId, row))
    const validationAcceptable = Boolean(operation?.all_units_completed && operation.candidates_acceptable && operation.completed_checkpoint_count > 0) && (datasetId !== "agg-trade" || selected.every((row) => row.validation_status === "VALIDATED" && Boolean(row.segment_checksum) && (row.segment_byte_length ?? 0) > 0))
    const conflictPresent = selected.some((row) => row.conflict_count > 0) || (operation?.conflict_count ?? 0) > 0
    const eligibility = evaluateMvpPublicationEligibility({ authoritativePersistence: persistenceValid, sourceAndIdentityValid: identityValid, lineagePresent: lineageValid, coverageEligible: Boolean(operation?.coverage_eligible && operation.coverage_count > 0), conflictPresent, timestampsValid, datasetRegistryGoverned: identityValid, granularityGoverned: identityValid, validationAcceptable })
    const canonicalReferences = selected.map((row) => `${row.canonical_record_id}:${row.record_version}`).sort()
    summaries.push(Object.freeze({
      symbol, canonicalInstrumentId: INSTRUMENTS[symbol], datasetId, expectedCount: required, observedCount: selected.length,
      providerIds, granularities, eventCount: selected.reduce((sum, row) => sum + row.event_count, 0),
      eventTimeMinimum: selected[0]?.event_time.toISOString() ?? null, eventTimeMaximum: selected.at(-1)?.terminal_time.toISOString() ?? null,
      rawObjectCount: new Set(selected.flatMap((row) => row.raw_object_id ? [row.raw_object_id] : [])).size,
      rawObjectReferenceDigest: selected.some((row) => row.raw_object_id && row.raw_object_checksum)
        ? canonicalChecksum([...new Set(selected.flatMap((row) => row.raw_object_id && row.raw_object_checksum ? [`${row.raw_object_id}:${row.raw_object_checksum}`] : []))].sort())
        : null,
      lineageCount: selected.reduce((sum, row) => sum + row.lineage_count, 0), coverageStatus: operation?.coverage_eligible ? "ELIGIBLE" : "MISSING_OR_BLOCKED",
      publicationStates: [...new Set(selected.map((row) => row.publication_state))].sort(), eligibility: eligibility.status, reasonCodes: eligibility.reasonCodes,
      conflictCount: selected.reduce((sum, row) => sum + row.conflict_count, 0) + (operation?.conflict_count ?? 0),
      canonicalReferenceCount: canonicalReferences.length, canonicalReferenceDigest: canonicalReferences.length ? canonicalChecksum(canonicalReferences) : null,
      segmentChecksum: selected[0]?.segment_checksum ?? null, segmentByteLength: selected[0]?.segment_byte_length ?? null,
    }))
  }
  return Object.freeze(summaries)
}

async function readFacts(clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>): Promise<readonly FactRow[]> {
  return clients.d2.sql<FactRow[]>`
    WITH fact_rows AS (
      SELECT 'ohlcv'::text dataset_id,o.symbol,o.provider_id,o.resolution granularity,NULL::text canonical_instrument_id,o.canonical_record_id,o.record_version,o.open_time event_time,o.close_time terminal_time,1::int event_count,o.normalization_version,o.checksum content_checksum,NULL::text segment_checksum,NULL::bigint segment_byte_length,NULL::text validation_status
      FROM canonical.ohlcv o WHERE o.open_time>=${START} AND o.open_time<${END} AND o.symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
      UNION ALL
      SELECT 'funding',f.symbol,f.provider_id,'EVENT_8H',f.canonical_instrument_id,f.canonical_record_id,f.record_version,f.funding_time,f.funding_time,1,f.normalization_version,f.checksum,NULL,NULL,NULL
      FROM canonical.funding f WHERE f.funding_time>=${START} AND f.funding_time<${END} AND f.symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
      UNION ALL
      SELECT 'open-interest',o.symbol,o.provider_id,o.observation_window,o.canonical_instrument_id,o.canonical_record_id,o.record_version,o.observed_at,o.observed_at,1,o.normalization_version,o.checksum,NULL,NULL,NULL
      FROM canonical.open_interest o WHERE o.observed_at>=${START} AND o.observed_at<${END} AND o.symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
      UNION ALL
      SELECT 'agg-trade',m.symbol,m.provider_id,'tick',m.canonical_instrument_id,m.canonical_record_id,m.record_version,m.event_time_min,m.event_time_max,m.record_count::int,m.normalization_version,m.source_raw_object_checksum,m.segment_content_checksum,m.segment_byte_length,m.validation_status
      FROM canonical.stream_manifests m WHERE m.source_dataset_id='agg-trade' AND m.segment_contract_version='2' AND m.window_start=${START} AND m.window_end=${END} AND m.symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
    ), lineage AS (
      SELECT e.destination_node_id,e.destination_node_version,count(*)::int lineage_count,count(DISTINCT e.source_node_id)::int raw_object_count,min(e.source_node_id) raw_object_id,min(r.content_hash) raw_object_checksum,bool_and(r.verification_state='VERIFIED') raw_verified
      FROM repository.lineage_edges e JOIN fact_rows f ON f.canonical_record_id=e.destination_node_id AND f.record_version::text=e.destination_node_version
      JOIN raw.objects r ON r.object_id=e.source_node_id WHERE e.source_node_type='RAW_OBJECT' AND e.destination_node_type='CANONICAL_FACT'
      GROUP BY e.destination_node_id,e.destination_node_version
    ), conflicts AS (
      SELECT q.canonical_record_id,q.record_version,count(*)::int conflict_count FROM quarantine.conflicts q JOIN fact_rows f USING(canonical_record_id,record_version) GROUP BY q.canonical_record_id,q.record_version
    )
    SELECT f.*,rv.current_publication_state publication_state,COALESCE(l.lineage_count,0)::int lineage_count,COALESCE(l.raw_object_count,0)::int raw_object_count,l.raw_object_id,l.raw_object_checksum,COALESCE(l.raw_verified,false) raw_verified,COALESCE(c.conflict_count,0)::int conflict_count
    FROM fact_rows f JOIN repository.record_versions rv USING(canonical_record_id,record_version)
    LEFT JOIN lineage l ON l.destination_node_id=f.canonical_record_id AND l.destination_node_version=f.record_version::text
    LEFT JOIN conflicts c USING(canonical_record_id,record_version)
    ORDER BY f.dataset_id,f.symbol,f.event_time,f.canonical_record_id`
}

async function readOperations(clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>): Promise<readonly OperationRow[]> {
  return clients.d3.sql<OperationRow[]>`
    WITH scoped_units AS (
      SELECT u.* FROM control.population_units u WHERE u.dataset_id IN ('ohlcv','funding','open-interest','agg-trade') AND u.subject_or_symbol IN ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT')
      AND ((u.dataset_id='funding' AND u.window_start<=${START} AND u.window_end>=${END}) OR (u.dataset_id<>'funding' AND u.window_start=${START} AND u.window_end=${END}))
    ), candidates AS (
      SELECT c.unit_id,count(*)::int candidate_count,bool_and(c.validation_status='ELIGIBLE' AND c.quality_eligibility='ELIGIBLE' AND c.normalization_eligibility='ELIGIBLE') candidates_acceptable
      FROM population.candidates c JOIN scoped_units u USING(unit_id) GROUP BY c.unit_id
    ), coverage AS (
      SELECT w.unit_id,count(*)::int coverage_count,bool_and(w.eligibility_result='ELIGIBLE') coverage_eligible FROM coverage.watermark_eligibility_decisions w JOIN scoped_units u USING(unit_id) GROUP BY w.unit_id
    ), checkpoints AS (
      SELECT p.unit_id,count(*) FILTER (WHERE p.completed_stage='COMPLETED')::int completed_checkpoint_count FROM control.population_checkpoints p JOIN scoped_units u USING(unit_id) GROUP BY p.unit_id
    ), conflicts AS (
      SELECT c.unit_id,count(q.conflict_id)::int conflict_count FROM population.candidates c JOIN scoped_units u USING(unit_id) LEFT JOIN population.candidate_conflicts q USING(candidate_id) GROUP BY c.unit_id
    )
    SELECT u.dataset_id,u.subject_or_symbol symbol,count(*)::int unit_count,bool_and(u.current_state='COMPLETED') all_units_completed,COALESCE(sum(c.candidate_count),0)::int candidate_count,COALESCE(bool_and(c.candidates_acceptable),false) candidates_acceptable,COALESCE(sum(w.coverage_count),0)::int coverage_count,COALESCE(bool_and(w.coverage_eligible),false) coverage_eligible,COALESCE(sum(p.completed_checkpoint_count),0)::int completed_checkpoint_count,COALESCE(sum(q.conflict_count),0)::int conflict_count
    FROM scoped_units u LEFT JOIN candidates c USING(unit_id) LEFT JOIN coverage w USING(unit_id) LEFT JOIN checkpoints p USING(unit_id) LEFT JOIN conflicts q USING(unit_id)
    GROUP BY u.dataset_id,u.subject_or_symbol ORDER BY u.dataset_id,u.subject_or_symbol`
}

async function readOhlcvTruth(clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>): Promise<OhlcvTruthRow> {
  const [facts, operations] = await Promise.all([
    clients.d2.sql<Array<{ readonly fact_count: number }>>`SELECT count(*)::int fact_count FROM canonical.ohlcv`,
    clients.d3.sql<Array<Omit<OhlcvTruthRow, "fact_count">>>`
    SELECT
      (SELECT count(*)::int FROM control.population_units WHERE dataset_id='ohlcv' AND current_state='COMPLETED') completed_units,
      (SELECT count(*)::int FROM population.candidates WHERE dataset_id='ohlcv') candidate_count,
      (SELECT count(*)::int FROM control.population_outcomes o JOIN population.candidates c USING(candidate_id) WHERE c.dataset_id='ohlcv') outcome_count,
      (SELECT count(*)::int FROM coverage.watermark_eligibility_decisions WHERE dataset_id='ohlcv') coverage_count,
      (SELECT count(*)::int FROM control.population_leases l JOIN control.population_units u USING(unit_id) WHERE u.dataset_id='ohlcv' AND l.released_at IS NULL AND l.expires_at>now()) active_leases`,
  ])
  return Object.freeze({ fact_count: facts[0].fact_count, ...operations[0] })
}

async function main() {
  const command = process.argv[2]
  if (command !== "verify") throw new Error("Usage: verifyMvpCertificationSlice.ts verify")
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "READ_ONLY", maxConnections: 2, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-slice-d2" }, d3: { roleIntent: "READ_ONLY", maxConnections: 1, applicationName: "mvp-slice-d3" } })
  try {
    const [rows, operations, ohlcvTruth] = await Promise.all([readFacts(clients), readOperations(clients), readOhlcvTruth(clients)])
    const summaries = summarizeRecords(rows, operations)
    const verificationBasis = { schemaVersion: "mvp-certification-slice-basis/v1", profileId: MVP_CERTIFICATION_PROFILE.profileId, profileVersion: MVP_CERTIFICATION_PROFILE.version, identityBindingVersion: MVP_IDENTITY_BINDING_VERSION, sliceStart: START, sliceEnd: END, instruments: SYMBOLS, datasets: DATASETS, summaries }
    const certificationChecksum = canonicalChecksum(verificationBasis)
    const output = { schemaVersion: "mvp-certification-slice-verification/v1", certificationId: `mvp-certification:${certificationChecksum}`, certificationChecksum, verificationBasis, profile: MVP_CERTIFICATION_PROFILE, target: { profile: clients.target.profile, host: clients.target.host, port: clients.target.port, database: clients.target.database }, ohlcvPersistedTruth: ohlcvTruth, publicationBoundary: { eligibilityStatus: "D3_ELIGIBLE", repositoryState: "PENDING", transitionStatus: "NOT_SUPPORTED_IN_THIS_SPRINT", reason: "D2_HAS_NO_ELIGIBLE_PUBLICATION_STATE_AND_NO_APPROVED_CERTIFIER_WORKER" }, complete: summaries.every((summary) => summary.eligibility === "ELIGIBLE") }
    console.log(JSON.stringify(output, null, 2))
    if (!output.complete) process.exitCode = 2
  } finally { await clients.shutdown() }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_SLICE_VERIFICATION_FAILED"); process.exitCode = 1 })
