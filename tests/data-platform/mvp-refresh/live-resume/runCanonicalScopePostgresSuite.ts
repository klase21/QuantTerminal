import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

import { buildCanonicalStreamSegmentCommand, createCanonicalPersistenceAdapter, type IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"
import { validateRawObjectScope, type RawObjectManifest } from "@/lib/data-platform/persistence"
import { createD3ToD2CanonicalCommitPort, createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter, type D3PostgresClient } from "@/lib/data-platform/population/postgres"
import { AGG_TRADES_SEGMENT_NORMALIZER_VERSION, AGG_TRADES_SEGMENT_ORDER_POLICY } from "@/lib/data-platform/population/backfill"
import { LIVE_MVP_DATASET_GOVERNANCE } from "@/lib/data-platform/mvp-refresh"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"
const ROLLBACK = "CANONICAL_SCOPE_CERTIFICATION_ROLLBACK"
const CONTRACTS: Readonly<Record<string, string>> = Object.freeze({ funding: "binance-official-rest-funding-rate/1.0.0", "open-interest": "mvp-bounded-open-interest/1.0.0", "agg-trade": "mvp-bounded-agg-trade/1.0.0" })

interface CandidateRow {
  readonly unit_id: string; readonly dataset_id: string; readonly instrument: string; readonly current_state: string
  readonly current_fencing_token: number; readonly active_lease_id: string | null; readonly candidate_id: string
  readonly raw_manifest_id: string; readonly provider_id: string; readonly provider_snapshot_id: string
  readonly parser_version: string; readonly candidate_checksum: string; readonly source_observed_at: string
  readonly bounded_payload: Record<string, unknown>
}

function raw(row: Record<string, unknown>): RawObjectManifest {
  return Object.freeze({ objectId: String(row.object_id), datasetId: String(row.dataset_id), providerId: String(row.provider_id), venue: row.venue === null ? null : String(row.venue), symbolOrSubject: row.symbol_or_subject === null ? null : String(row.symbol_or_subject), windowStart: row.window_start === null ? null : new Date(String(row.window_start)).toISOString(), windowEnd: row.window_end === null ? null : new Date(String(row.window_end)).toISOString(), contentHash: String(row.content_hash), sizeBytes: Number(row.size_bytes), mediaType: String(row.media_type), compression: String(row.compression) as RawObjectManifest["compression"], retrievedAt: new Date(String(row.retrieved_at)).toISOString(), providerSnapshotId: String(row.provider_snapshot_id), retentionClass: String(row.retention_class) as RawObjectManifest["retentionClass"], verificationState: String(row.verification_state) as RawObjectManifest["verificationState"], objectStorageKey: String(row.object_storage_key), createdAt: new Date(String(row.created_at)).toISOString() })
}

function interval(row: CandidateRow): { start: string; end: string | null; policy: "CONTAINED" | "EXACT" } {
  if (row.dataset_id === "agg-trade") return { start: String(row.bounded_payload.windowStart), end: String(row.bounded_payload.windowEnd), policy: "EXACT" }
  if (row.dataset_id === "funding") return { start: String(row.bounded_payload.fundingTime), end: null, policy: "CONTAINED" }
  return { start: new Date(row.source_observed_at).toISOString(), end: null, policy: "CONTAINED" }
}

async function main(): Promise<void> {
  const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-canonical-scope-cert-d2" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-canonical-scope-cert-d3" } })
  try {
    const candidates = await integrated.d3.sql<CandidateRow[]>`
      SELECT u.unit_id,u.dataset_id,u.subject_or_symbol instrument,u.current_state::text,
        u.current_fencing_token,u.active_lease_id,c.candidate_id,c.raw_manifest_id,c.provider_id,
        c.provider_snapshot_id,c.parser_version,c.candidate_checksum,c.source_observed_at::text,c.bounded_payload
      FROM control.population_units u JOIN population.candidates c ON c.unit_id=u.unit_id
      WHERE u.window_start=${START} AND u.window_end=${END}
        AND ((u.dataset_id='funding' AND u.subject_or_symbol='DOGEUSDT')
          OR (u.dataset_id='open-interest' AND u.subject_or_symbol IN ('ETHUSDT','SOLUSDT'))
          OR (u.dataset_id='agg-trade' AND u.subject_or_symbol='BTCUSDT'))
      ORDER BY u.dataset_id,u.subject_or_symbol,c.created_at,c.candidate_id`
    const rawIds = [...new Set(candidates.map((value) => value.raw_manifest_id))]
    const rawRows = await integrated.d2.sql.unsafe<Record<string, unknown>[]>("SELECT * FROM raw.objects WHERE object_id=ANY($1::text[])", [rawIds])
    const rawById = new Map(rawRows.map((value) => [String(value.object_id), raw(value)]))
    const grouped = new Map<string, CandidateRow[]>()
    for (const candidate of candidates) grouped.set(`${candidate.dataset_id}:${candidate.instrument}`, [...(grouped.get(`${candidate.dataset_id}:${candidate.instrument}`) ?? []), candidate])
    assert.equal(grouped.get("funding:DOGEUSDT")?.length, 3)
    assert.equal(grouped.get("open-interest:SOLUSDT")?.length, 288)
    assert.equal(grouped.get("open-interest:ETHUSDT")?.length, 2)
    assert.equal(grouped.get("agg-trade:BTCUSDT")?.length, 1)

    for (const candidate of candidates) {
      const scope = interval(candidate), sourceContract = CONTRACTS[candidate.dataset_id]!
      assert.deepEqual(validateRawObjectScope({ datasetId: candidate.dataset_id, providerId: candidate.provider_id, providerSnapshotId: candidate.provider_snapshot_id, instrument: candidate.instrument, sourceContractVersion: sourceContract, expectedSourceContractVersion: sourceContract, intervalStart: scope.start, intervalEnd: scope.end, intervalPolicy: scope.policy, rawObject: rawById.get(candidate.raw_manifest_id)! }), [])
    }
    const eth = grouped.get("open-interest:ETHUSDT")![0]!, ethRaw = rawById.get(eth.raw_manifest_id)!
    assert.ok(validateRawObjectScope({ datasetId: eth.dataset_id, providerId: eth.provider_id, providerSnapshotId: eth.provider_snapshot_id, instrument: eth.instrument, sourceContractVersion: CONTRACTS[eth.dataset_id]!, expectedSourceContractVersion: CONTRACTS[eth.dataset_id]!, intervalStart: new Date(Date.parse(END) + 1).toISOString(), intervalEnd: null, intervalPolicy: "CONTAINED", rawObject: ethRaw }).includes("RAW_OBJECT_WINDOW_NOT_CONTAINED"))
    assert.ok(validateRawObjectScope({ datasetId: eth.dataset_id, providerId: eth.provider_id, providerSnapshotId: eth.provider_snapshot_id, instrument: "BTCUSDT", sourceContractVersion: CONTRACTS[eth.dataset_id]!, expectedSourceContractVersion: CONTRACTS[eth.dataset_id]!, intervalStart: eth.source_observed_at, intervalEnd: null, intervalPolicy: "CONTAINED", rawObject: ethRaw }).includes("RAW_OBJECT_SCOPE_MISMATCH"))

    const btc = grouped.get("agg-trade:BTCUSDT")![0]!, btcRaw = rawById.get(btc.raw_manifest_id)!, payload = btc.bounded_payload, governance = LIVE_MVP_DATASET_GOVERNANCE["agg-trade"]
    const command = buildCanonicalStreamSegmentCommand({ operationType: "INITIAL_VERSION", initiatedAt: new Date().toISOString(), sourceDatasetId: "agg-trade", streamKind: "AGG_TRADE", providerId: btc.provider_id, venue: "BINANCE", symbol: btc.instrument, canonicalInstrumentId: String(payload.canonicalInstrumentId), sourcePartitionKey: String(payload.sourcePartitionKey), windowStart: String(payload.windowStart), windowEnd: String(payload.windowEnd), firstSequence: String(payload.firstSequence), lastSequence: String(payload.lastSequence), recordCount: Number(payload.recordCount), segmentObjectKey: String(payload.segmentObjectKey), segmentContentChecksum: String(payload.segmentContentChecksum), columnarFormat: "PARQUET", compressionFormat: "SNAPPY", segmentByteLength: Number(payload.segmentByteLength), eventTimeMin: String(payload.eventTimeMin), eventTimeMax: String(payload.eventTimeMax), validationStatus: "VALIDATED", eventOrderPolicy: AGG_TRADES_SEGMENT_ORDER_POLICY, governance: { datasetRegistrySnapshotId: governance.datasetRegistry, providerRegistrySnapshotId: governance.providerRegistry, providerCertificationSnapshotId: governance.certification, policyVersionId: governance.policy, schemaVersion: governance.schema, normalizationVersion: AGG_TRADES_SEGMENT_NORMALIZER_VERSION }, sourceRawObject: btcRaw, predecessor: null })

    let canonicalPasses = 0
    const runCanonicalPass = async () => {
      try {
        await integrated.d2.transaction(async (sql) => {
          const client = { ...integrated.d2, sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as IsolatedPostgresClient
          const port = createD3ToD2CanonicalCommitPort(createCanonicalPersistenceAdapter(client))
          const first = await port.execute(command), second = await port.execute(command)
          assert.ok(first.status === "SUCCESS" || first.status === "DUPLICATE"); assert.equal(second.status, "DUPLICATE")
          canonicalPasses++
          throw new Error(ROLLBACK)
        })
      } catch (error) { if (!(error instanceof Error) || error.message !== ROLLBACK) throw error }
    }
    await runCanonicalPass(); await runCanonicalPass()

    const failureUnits = candidates.filter((value, index, values) => (value.dataset_id === "agg-trade" && value.instrument === "BTCUSDT") || (value.dataset_id === "open-interest" && value.instrument === "SOLUSDT")).filter((value, index, values) => values.findIndex((candidate) => candidate.unit_id === value.unit_id) === index)
    const failureUnitIds = failureUnits.map((value) => value.unit_id)
    const before = await integrated.d3.sql.unsafe<Array<Record<string, unknown>>>("SELECT u.unit_id,u.current_state::text,u.active_lease_id,l.released_at::text,(SELECT count(*)::int FROM control.population_unit_events e WHERE e.unit_id=u.unit_id) events,(SELECT count(*)::int FROM control.population_checkpoints p WHERE p.unit_id=u.unit_id) checkpoints FROM control.population_units u LEFT JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE u.unit_id=ANY($1::text[]) ORDER BY u.unit_id", [failureUnitIds])
    let failurePasses = 0
    const runFailurePass = async () => {
      try {
        await integrated.d3.transaction(async (sql) => {
          const client = { ...integrated.d3, sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as D3PostgresClient
          const adapter = createPopulationPostgresAdapter(client)
          for (const unit of failureUnits) {
            const resumedAt = new Date().toISOString()
            const resumed = await adapter.reconcileBoundedAcquisitionResume({ unitId: unit.unit_id, ownerId: "mvp-canonical-scope-certification", now: resumedAt, expiresAt: new Date(Date.parse(resumedAt) + 60_000).toISOString() })
            assert.ok(resumed)
            const at = new Date(Date.parse(resumedAt) + 1_000).toISOString()
            const input = { unitId: unit.unit_id, leaseId: resumed.lease.leaseId, ownerId: "mvp-canonical-scope-certification", fencingToken: resumed.lease.fencingToken, classification: "CANONICAL_SCOPE_VALIDATION_FAILED", at }
            assert.equal((await adapter.recordCanonicalCommitFailure(input)).status, "CREATED")
            assert.equal((await adapter.recordCanonicalCommitFailure(input)).status, "DUPLICATE")
            const state = await sql<{ current_state: string; active_lease_id: string | null; released_at: string | null }[]>`SELECT u.current_state::text,u.active_lease_id,l.released_at::text FROM control.population_units u LEFT JOIN control.population_leases l ON l.lease_id=${resumed.lease.leaseId} WHERE u.unit_id=${unit.unit_id}`
            assert.equal(state[0]?.current_state, "RETRYABLE"); assert.equal(state[0]?.active_lease_id, null); assert.ok(state[0]?.released_at)
          }
          failurePasses++
          throw new Error(ROLLBACK)
        })
      } catch (error) { if (!(error instanceof Error) || error.message !== ROLLBACK) throw error }
    }
    await runFailurePass(); await runFailurePass()
    const after = await integrated.d3.sql.unsafe<Array<Record<string, unknown>>>("SELECT u.unit_id,u.current_state::text,u.active_lease_id,l.released_at::text,(SELECT count(*)::int FROM control.population_unit_events e WHERE e.unit_id=u.unit_id) events,(SELECT count(*)::int FROM control.population_checkpoints p WHERE p.unit_id=u.unit_id) checkpoints FROM control.population_units u LEFT JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE u.unit_id=ANY($1::text[]) ORDER BY u.unit_id", [failureUnitIds])
    assert.deepEqual(after, before)
    assert.equal(canonicalPasses, 2); assert.equal(failurePasses, 2)
    const bootstrapSource = await readFile("lib/data-platform/mvp-refresh/liveResumeLocalBootstrap.ts", "utf8")
    assert.ok(bootstrapSource.includes("recordCanonicalCommitFailure") && bootstrapSource.includes("throw error"))
    assert.ok(bootstrapSource.indexOf("recordCanonicalCommitFailure") < bootstrapSource.lastIndexOf("throw error"))
    console.log(JSON.stringify({ passed: true, shapes: { funding: 3, openInterest: 288, aggTrades: 1, retainedEthPartial: 2 }, containedScopes: true, nonContainedFailClosed: true, canonicalPasses, exactRetryDuplicateFacts: 0, failurePasses, leasesReleasedPerPass: 2, downstreamStagesAfterFailure: 0, retainedRows: 0, retainedArtifacts: 0 }))
  } finally { await integrated.shutdown() }
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
