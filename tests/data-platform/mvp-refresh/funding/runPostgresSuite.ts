import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { BOUNDED_FUNDING_PROVIDER, DEFAULT_MVP_REFRESH_POLICY, MvpRefreshMigrationRunner, MvpRefreshStore, createBoundedFundingRequest, createMvpRefreshClientFromEnvironment, createRefreshPlan, resolveNextEligibleWindow, runBoundedFundingRefresh } from "@/lib/data-platform/mvp-refresh"
import type { CanonicalCommitPort } from "@/lib/data-platform/population/contracts"
import { InMemoryObjectStorage } from "@/lib/data-platform/population/testing"

const START = "2026-07-14T00:00:00.000Z"
const END = "2026-07-15T00:00:00.000Z"
const NOW = "2026-07-15T03:00:00.000Z"

async function main() {
  const client = createMvpRefreshClientFromEnvironment()
  try {
    const migrations = await new MvpRefreshMigrationRunner(client).apply("mvp-8a1-bounded-funding")
    assert(migrations.every((entry) => entry.status === "SKIPPED" || entry.status === "APPLIED"))
    const store = new MvpRefreshStore(client)
    const nonce = canonicalChecksum({ suite: "mvp-8a1-funding-postgres", at: new Date().toISOString() })
    const window = resolveNextEligibleWindow({ activeGovernedThrough: START, now: NOW, finalizationDelayMinutes: 120, overlapHours: 0 })
    assert(window)
    const plan = createRefreshPlan({ policy: DEFAULT_MVP_REFRESH_POLICY, activeCorpusId: `fixture-active:${nonce}`, activeServingChecksum: canonicalChecksum({ nonce, active: true }), activeGovernedThrough: START, window })
    await store.putPolicy(DEFAULT_MVP_REFRESH_POLICY)
    await store.putPlan(plan)
    const runChecksum = canonicalChecksum({ planId: plan.planId, nonce })
    const runId = `mrr_${runChecksum}`
    await store.putRun(runId, plan.planId, runChecksum)
    const unitChecksum = canonicalChecksum({ runId, instrument: "BTCUSDT", datasetId: "funding", intervalStart: START, intervalEnd: END })
    const unitId = `mru_${unitChecksum}`
    await store.putUnits([{ unitId, runId, instrument: "BTCUSDT", datasetId: "funding", intervalStart: START, intervalEnd: END, checksum: unitChecksum }])
    await store.transitionRun(runId, "ACQUIRING")
    const leaseKey = `funding:${unitId}`
    const owner = `worker:${nonce}`
    const lease = await store.acquireLease(leaseKey, owner, 300)
    assert(lease.acquired)
    await store.transitionUnit(unitId, "LEASED")

    let commitCalls = 0
    const canonicalPort: CanonicalCommitPort = { async execute(command) { commitCalls += 1; return { status: "DUPLICATE", canonicalRecordId: command.fact.identity.canonicalRecordId, recordVersion: 1, checksum: command.fact.checksum } } }
    const request = createBoundedFundingRequest({ provider: BOUNDED_FUNDING_PROVIDER, instrument: "BTCUSDT", eventTimeStart: START, eventTimeEnd: END, maximumEventCount: 10, requestedAt: NOW }, NOW)
    const body = JSON.stringify([{ symbol: "BTCUSDT", fundingTime: Date.parse(START), fundingRate: "0.00010000" }, { symbol: "BTCUSDT", fundingTime: Date.parse("2026-07-14T08:00:00.000Z"), fundingRate: "-0.00002000" }, { symbol: "BTCUSDT", fundingTime: Date.parse("2026-07-14T16:00:00.000Z"), fundingRate: "0.00000000" }])
    const result = await runBoundedFundingRefresh({ request, storage: new InMemoryObjectStorage(), canonicalPort, retrievedAt: NOW, fetchImpl: async () => new Response(body), controlPlane: { store, unitId, leaseKey, ownerId: owner, fencingToken: lease.fencingToken } })
    assert.equal(result.status, "DUPLICATE")
    assert.equal(commitCalls, 3)

    const units = await client.sql.unsafe<Array<{ state: string; checkpoint: Record<string, unknown> | string }>>("SELECT state,checkpoint FROM refresh_control.refresh_unit WHERE unit_id=$1", [unitId])
    assert.equal(units[0]?.state, "COMPLETE")
    const checkpoint = typeof units[0]?.checkpoint === "string" ? JSON.parse(units[0].checkpoint) : units[0]?.checkpoint
    assert.equal(checkpoint?.stage, "COMPLETE")
    const artifacts = await client.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM refresh_control.refresh_artifact WHERE unit_id=$1", [unitId])
    const observations = await client.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM refresh_control.source_availability_observation WHERE run_id=$1 AND source_id=$2", [runId, `${BOUNDED_FUNDING_PROVIDER}:BTCUSDT`])
    const watermarks = await client.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM refresh_control.source_watermark WHERE run_id=$1 AND source_id=$2 AND state='AVAILABLE'", [runId, `${BOUNDED_FUNDING_PROVIDER}:BTCUSDT`])
    assert.equal(artifacts[0]?.count, 1)
    assert.equal(observations[0]?.count, 1)
    assert.equal(watermarks[0]?.count, 1)

    const staleKey = `funding-stale:${nonce}`
    const stale = await store.acquireLease(staleKey, "stale-worker", 1)
    assert(stale.acquired)
    await client.sql.unsafe("UPDATE refresh_control.refresh_lease SET acquired_at=now()-interval '2 seconds',expires_at=now()-interval '1 second' WHERE lease_key=$1", [staleKey])
    const recovered = await store.acquireLease(staleKey, "recovered-worker", 300)
    assert(recovered.acquired)
    let staleFetchCalled = false
    await assert.rejects(() => runBoundedFundingRefresh({ request, storage: new InMemoryObjectStorage(), canonicalPort, retrievedAt: NOW, fetchImpl: async () => { staleFetchCalled = true; return new Response(body) }, controlPlane: { store, unitId, leaseKey: staleKey, ownerId: "stale-worker", fencingToken: stale.fencingToken } }), /REFRESH_LEASE_FENCE_LOST/)
    assert.equal(staleFetchCalled, false)

    const sizes = await client.sql.unsafe<Array<{ database_bytes: string; table_bytes: string; index_bytes: string }>>("SELECT pg_database_size(current_database())::bigint::text database_bytes,(SELECT coalesce(sum(pg_relation_size(c.oid)),0)::bigint::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='refresh_control' AND c.relkind='r') table_bytes,(SELECT coalesce(sum(pg_indexes_size(c.oid)),0)::bigint::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='refresh_control' AND c.relkind='r') index_bytes")
    console.log(JSON.stringify({ status: "PASS", migration: migrations, unitState: "COMPLETE", artifactCount: 1, availabilityObservationCount: 1, watermarkCount: 1, staleWorkerRejectedBeforeFetch: true, sizes: sizes[0], productionMutation: false }, null, 2))
  } finally { await client.shutdown() }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "BOUNDED_FUNDING_POSTGRES_TEST_FAILED"); process.exitCode = 1 })
