import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  ControlledOhlcvRecoveryStore,
  MvpRefreshMigrationRunner,
  MvpRefreshStore,
  createAuthoritativeSlotReconciliation,
  createMvpRefreshClientFromEnvironment,
} from "@/lib/data-platform/mvp-refresh"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"

async function main() {
  const client = createMvpRefreshClientFromEnvironment()
  try {
    await client.verify()
    const migrations = await new MvpRefreshMigrationRunner(client).apply("mvp-8a2f-postgres-suite")
    assert(migrations.every((item) => item.status === "SKIPPED"))
    const relations = await client.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM information_schema.tables WHERE table_schema='refresh_control' AND table_name=ANY($1::text[])", [["source_contract", "controlled_retrieval", "controlled_candidate_set", "controlled_canonical_commit_set", "logical_slot_reconciliation"]])
    assert.equal(relations[0]?.count, 5)
    const triggers = await client.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM information_schema.triggers WHERE trigger_schema='refresh_control' AND trigger_name=ANY($1::text[])", [["source_contract_no_update_delete", "controlled_retrieval_no_update_delete", "controlled_candidate_set_no_update_delete", "controlled_commit_set_no_update_delete", "logical_slot_reconciliation_no_update_delete"]])
    assert.equal(triggers[0]?.count, 10)

    const checksum = canonicalChecksum({ fixture: "append-only" }), id = `test-source-contract-${checksum}`
    let updateRejected = false
    try {
      await client.transaction(async (sql) => {
        await sql.unsafe("INSERT INTO refresh_control.source_contract(source_contract_id,provider,dataset_id,instrument,interval_start,interval_end,contract_version,contract,checksum,created_at) VALUES($1,'binance-vision','ohlcv','BTCUSDT','2026-07-15T00:00:00.000Z','2026-07-16T00:00:00.000Z','test',$2::jsonb,$3,now())", [id, JSON.stringify({ fixture: true }), checksum])
        await sql.unsafe("UPDATE refresh_control.source_contract SET provider='changed' WHERE source_contract_id=$1", [id])
      })
    } catch (error) { updateRejected = error instanceof Error && error.message.includes("REFRESH_PROVENANCE_APPEND_ONLY") }
    assert.equal(updateRejected, true)
    const retained = await client.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM refresh_control.source_contract WHERE source_contract_id=$1", [id])
    assert.equal(retained[0]?.count, 0)

    const recovery = new ControlledOhlcvRecoveryStore(client)
    const authorities = await recovery.readAuthoritiesForWindow(START, END)
    assert.equal(authorities.length, 1)
    const authority = authorities[0]!
    const chain = await client.sql.unsafe<Array<{ unit_state: string; run_state: string; commit_status: string; fact_count: number; watermark_count: number }>>("SELECT u.state::text unit_state,r.state::text run_state,c.status commit_status,c.fact_count,(SELECT count(*)::int FROM refresh_control.source_watermark WHERE run_id=r.run_id) watermark_count FROM refresh_control.logical_slot_reconciliation a JOIN refresh_control.refresh_unit u ON u.unit_id=a.authoritative_unit_id JOIN refresh_control.refresh_run r ON r.run_id=u.run_id JOIN refresh_control.controlled_canonical_commit_set c ON c.commit_set_id=a.commit_set_id WHERE a.reconciliation_id=$1", [authority.reconciliationId])
    assert.deepEqual(chain[0], { unit_state: "VALIDATED", run_state: "BLOCKED", commit_status: "CREATED", fact_count: 288, watermark_count: 0 })
    const legacyStates = await client.sql.unsafe<Array<{ state: string; count: number }>>("SELECT state::text state,count(*)::int count FROM refresh_control.refresh_unit WHERE unit_id=ANY($1::text[]) GROUP BY state ORDER BY state", [[...authority.legacyCommittedUnitIds, authority.orphanedAcquiredUnitId]])
    assert.deepEqual([...legacyStates], [{ state: "ACQUIRED", count: 1 }, { state: "COMMITTED", count: 4 }])

    const store = new MvpRefreshStore(client)
    const leaseKey = `controlled-recovery-test:${authority.authoritativeUnitId}`
    const firstLease = await store.acquireLease(leaseKey, "controlled-recovery-postgres-suite", 120)
    const failureAuthority = (suffix: string) => createAuthoritativeSlotReconciliation({ logicalSlotId: `${authority.logicalSlotId}:${suffix}`, authoritativeUnitId: authority.authoritativeUnitId, sourceContractId: authority.sourceContractId, retrievalId: authority.retrievalId, artifactId: authority.artifactId, candidateSetId: authority.candidateSetId, commitSetId: authority.commitSetId, canonicalFactSetDigest: authority.canonicalFactSetDigest, intervalStart: START, intervalEnd: END, legacyCommittedUnitIds: authority.legacyCommittedUnitIds, orphanedAcquiredUnitId: authority.orphanedAcquiredUnitId })
    for (const [suffix, failurePoint] of [["before", "BEFORE_AUTHORITY_INSERT"], ["after", "AFTER_AUTHORITY_INSERT_BEFORE_VERIFICATION"]] as const) {
      await assert.rejects(() => recovery.putAuthority(failureAuthority(suffix), { leaseKey, ownerId: "controlled-recovery-postgres-suite", fencingToken: firstLease.fencingToken, failurePoint }), new RegExp(`INJECTED_${suffix.toUpperCase()}`))
      const rolledBack = await client.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM refresh_control.logical_slot_reconciliation WHERE logical_slot_id=$1", [`${authority.logicalSlotId}:${suffix}`])
      assert.equal(rolledBack[0]?.count, 0)
    }
    const renewedLease = await store.acquireLease(leaseKey, "controlled-recovery-postgres-suite", 120)
    await assert.rejects(() => recovery.putAuthority(failureAuthority("stale"), { leaseKey, ownerId: "controlled-recovery-postgres-suite", fencingToken: firstLease.fencingToken }), /REFRESH_LEASE_FENCE_LOST/)
    await store.releaseLease(leaseKey, "controlled-recovery-postgres-suite", renewedLease.fencingToken)
    console.log(JSON.stringify({ status: "PASS", migrationReapplication: "SKIPPED", relations: 5, appendOnlyTriggerEvents: 10, mutationRejected: true, fixtureRowsRetained: 0, authorityCount: 1, factCount: 288, legacyStates, watermarkWrites: 0, authorityRollbackPoints: 2, staleFenceRejected: true }))
  } finally { await client.shutdown() }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "CONTROLLED_REACQUISITION_POSTGRES_TEST_FAILED"); process.exitCode = 1 })
