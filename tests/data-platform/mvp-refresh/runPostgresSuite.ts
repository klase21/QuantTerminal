import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  DEFAULT_MVP_REFRESH_POLICY,
  MvpRefreshMigrationRunner,
  MvpRefreshStore,
  createRefreshPlan,
  createRefreshUnits,
  discoverMvpRefreshMigrations,
  resolveNextEligibleWindow,
  verifyAppliedMvpRefreshMigrationChecksum,
} from "@/lib/data-platform/mvp-refresh"
import { createMvpRefreshCertificationClientFromEnvironment } from "./disposableCertificationDatabase"

const EXPECTED_RELATIONS = [
  "activation_readiness",
  "candidate_validation",
  "controlled_candidate_set",
  "controlled_canonical_commit_set",
  "controlled_retrieval",
  "logical_slot_reconciliation",
  "refresh_artifact",
  "refresh_candidate",
  "refresh_event",
  "refresh_lease",
  "refresh_plan",
  "refresh_policy",
  "refresh_run",
  "refresh_unit",
  "release_comparison",
  "release_manifest",
  "release_manifest_entry",
  "source_availability_observation",
  "source_contract",
  "source_watermark",
] as const

const EXPECTED_INDEXES = ["controlled_candidate_set_unit_idx", "controlled_commit_set_unit_idx", "controlled_retrieval_unit_idx", "logical_slot_reconciliation_unit_idx", "refresh_event_run_time_idx", "refresh_unit_run_state_idx", "source_watermark_run_idx"] as const

async function main() {
  const first = createMvpRefreshCertificationClientFromEnvironment()
  const preflight = await first.preflight()
  assert.deepEqual(preflight, { connectionSucceeded: true, expectedDatabase: true, expectedRole: true, postgresMajor16: true, sanitizedErrorCode: null, sanitizedErrorClass: "NONE" })

  const migrationRunner = new MvpRefreshMigrationRunner(first)
  const reapplied = await migrationRunner.apply("mvp-8a-postgres-certification")
  assert(reapplied.every((entry) => entry.status === "SKIPPED"))
  const artifacts = await discoverMvpRefreshMigrations()
  const ledger = await first.sql.unsafe<Array<{ migration_id: string; migration_checksum: string }>>("SELECT migration_id,migration_checksum FROM refresh_control.migration_ledger ORDER BY migration_id")
  assert.equal(ledger.length, artifacts.length)
  for (const artifact of artifacts) verifyAppliedMvpRefreshMigrationChecksum(ledger.find((entry) => entry.migration_id === artifact.migrationId)?.migration_checksum ?? "", artifact.checksum)
  assert.throws(() => verifyAppliedMvpRefreshMigrationChecksum(canonicalChecksum("drift"), artifacts[0].checksum), /APPLIED_MVP_REFRESH_MIGRATION_CHECKSUM_MISMATCH/)

  const relations = await first.sql.unsafe<Array<{ relation_name: string }>>("SELECT tablename relation_name FROM pg_catalog.pg_tables WHERE schemaname='refresh_control' AND tablename<>'migration_ledger' ORDER BY tablename")
  assert.deepEqual(relations.map((entry) => entry.relation_name), [...EXPECTED_RELATIONS])
  const indexes = await first.sql.unsafe<Array<{ index_name: string }>>("SELECT indexname index_name FROM pg_catalog.pg_indexes WHERE schemaname='refresh_control' ORDER BY indexname")
  const indexNames = new Set(indexes.map((entry) => entry.index_name))
  for (const name of EXPECTED_INDEXES) assert(indexNames.has(name))
  const constraints = await first.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='refresh_control'")
  assert((constraints[0]?.count ?? 0) >= 40)
  const appendOnlyTrigger = await first.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='refresh_control' AND c.relname='refresh_event' AND t.tgname='refresh_event_no_update_delete' AND NOT t.tgisinternal")
  assert.equal(appendOnlyTrigger[0]?.count, 1)

  const store = new MvpRefreshStore(first)
  const nonce = canonicalChecksum({ test: "mvp-refresh-postgres", at: new Date().toISOString() })
  const leaseKey = `integration:${nonce}`
  const ownerA = `worker-a:${nonce}`
  const ownerB = `worker-b:${nonce}`
  const leaseA = await store.acquireLease(leaseKey, ownerA, 1)
  assert(leaseA.acquired)
  const concurrent = await store.acquireLease(leaseKey, ownerB, 1)
  assert.equal(concurrent.acquired, false)
  const renewed = await store.acquireLease(leaseKey, ownerA, 1)
  assert(renewed.acquired)
  assert.equal(renewed.fencingToken, leaseA.fencingToken + 1)
  await assertRejects(() => store.assertFence(leaseKey, ownerA, leaseA.fencingToken), "REFRESH_LEASE_FENCE_LOST")
  await delay(1_100)
  const recovered = await store.acquireLease(leaseKey, ownerB, 30)
  assert(recovered.acquired)
  assert.equal(recovered.fencingToken, renewed.fencingToken + 1)
  await assertRejects(() => store.assertFence(leaseKey, ownerA, renewed.fencingToken), "REFRESH_LEASE_FENCE_LOST")
  await store.assertFence(leaseKey, ownerB, recovered.fencingToken)
  await first.sql.unsafe("UPDATE refresh_control.refresh_lease SET released_at=now() WHERE lease_key=$1 AND owner_id=$2 AND fencing_token=$3", [leaseKey, ownerB, recovered.fencingToken])
  await assertRejects(() => store.assertFence(leaseKey, ownerB, recovered.fencingToken), "REFRESH_LEASE_FENCE_LOST")

  const window = resolveNextEligibleWindow({ activeGovernedThrough: "2026-07-15T00:00:00.000Z", now: "2026-07-16T12:00:00.000Z", finalizationDelayMinutes: DEFAULT_MVP_REFRESH_POLICY.finalizationDelayMinutes, overlapHours: DEFAULT_MVP_REFRESH_POLICY.overlapHours })
  assert(window)
  const plan = createRefreshPlan({ policy: DEFAULT_MVP_REFRESH_POLICY, activeCorpusId: `integration-active:${nonce}`, activeServingChecksum: canonicalChecksum("integration-active-serving"), activeGovernedThrough: "2026-07-15T00:00:00.000Z", window })
  await store.putPolicy(DEFAULT_MVP_REFRESH_POLICY)
  await store.putPlan(plan)
  const runChecksum = canonicalChecksum({ test: "integration-run", nonce, planId: plan.planId })
  const runId = `mrr_${runChecksum}`
  assert.equal(await store.putRun(runId, plan.planId, runChecksum), "INSERTED")
  const unit = createRefreshUnits(plan, runId)[0]
  assert.equal(await store.putUnits([unit]), 1)
  await store.transitionRun(runId, "ACQUIRING")
  await store.transitionUnit(unit.unitId, "LEASED")
  await store.transitionUnit(unit.unitId, "ACQUIRED")
  const acquiredCheckpoint = { stage: "ACQUIRED", artifactChecksum: canonicalChecksum({ unit: unit.unitId, stage: "ACQUIRED" }) }
  await first.sql.unsafe("UPDATE refresh_control.refresh_unit SET checkpoint=$2::jsonb,attempt=1,updated_at=now() WHERE unit_id=$1", [unit.unitId, JSON.stringify(acquiredCheckpoint)])
  await first.shutdown()

  const second = createMvpRefreshCertificationClientFromEnvironment()
  await second.verify()
  const acquired = await readUnit(second, unit.unitId)
  assert.equal(acquired.state, "ACQUIRED")
  assert.equal(acquired.attempt, 1)
  assert.deepEqual(acquired.checkpoint, acquiredCheckpoint)
  const secondStore = new MvpRefreshStore(second)
  await secondStore.transitionUnit(unit.unitId, "NORMALIZED")
  const normalizedCheckpoint = { stage: "NORMALIZED", candidateChecksum: canonicalChecksum({ unit: unit.unitId, stage: "NORMALIZED" }) }
  await second.sql.unsafe("UPDATE refresh_control.refresh_unit SET checkpoint=$2::jsonb,updated_at=now() WHERE unit_id=$1", [unit.unitId, JSON.stringify(normalizedCheckpoint)])
  await second.shutdown()

  const third = createMvpRefreshCertificationClientFromEnvironment()
  await third.verify()
  const normalized = await readUnit(third, unit.unitId)
  assert.equal(normalized.state, "NORMALIZED")
  assert.deepEqual(normalized.checkpoint, normalizedCheckpoint)
  const thirdStore = new MvpRefreshStore(third)
  await thirdStore.transitionUnit(unit.unitId, "COMMITTED")
  const committedCheckpoint = { stage: "COMMITTED", factDigest: canonicalChecksum({ unit: unit.unitId, stage: "COMMITTED" }) }
  await third.sql.unsafe("UPDATE refresh_control.refresh_unit SET checkpoint=$2::jsonb,updated_at=now() WHERE unit_id=$1", [unit.unitId, JSON.stringify(committedCheckpoint)])
  const candidateChecksum = canonicalChecksum({ runId, lifecycle: "BUILDING", stage: "MATERIALIZATION_PENDING" })
  const candidateId = `mrc_${candidateChecksum}`
  await third.sql.unsafe("INSERT INTO refresh_control.refresh_candidate(candidate_id,run_id,corpus_id,serving_checksum,governed_through,lifecycle,descriptor,checksum,created_at) VALUES($1,$2,$3,$4,$5,'BUILDING',$6::jsonb,$7,now())", [candidateId, runId, `integration-corpus:${nonce}`, canonicalChecksum("integration-serving"), window.requestedEnd, JSON.stringify({ stage: "MATERIALIZATION_PENDING", productionActivation: false }), candidateChecksum])
  await third.shutdown()

  const fourth = createMvpRefreshCertificationClientFromEnvironment()
  await fourth.verify()
  const committed = await readUnit(fourth, unit.unitId)
  assert.equal(committed.state, "COMMITTED")
  assert.deepEqual(committed.checkpoint, committedCheckpoint)
  const candidates = await fourth.sql.unsafe<Array<{ lifecycle: string; descriptor: { productionActivation: boolean } | string }>>("SELECT lifecycle,descriptor FROM refresh_control.refresh_candidate WHERE candidate_id=$1", [candidateId])
  assert.equal(candidates[0]?.lifecycle, "BUILDING")
  const descriptor = typeof candidates[0]?.descriptor === "string" ? JSON.parse(candidates[0].descriptor) as { productionActivation: boolean } : candidates[0]?.descriptor
  assert.equal(descriptor?.productionActivation, false)
  const activationRows = await fourth.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM refresh_control.activation_readiness WHERE candidate_id=$1", [candidateId])
  assert.equal(activationRows[0]?.count, 0)

  let secretRows = 0
  for (const relation of ["refresh_policy", "refresh_plan", "refresh_run", "refresh_unit", "source_watermark", "source_availability_observation", "refresh_artifact", "refresh_candidate", "candidate_validation", "release_manifest", "release_manifest_entry", "release_comparison", "activation_readiness", "refresh_event", "refresh_lease", "migration_ledger"]) {
    const rows = await fourth.sql.unsafe<Array<{ count: number }>>(`SELECT count(*)::int count FROM refresh_control.${relation} t WHERE row_to_json(t)::text ~* 'postgres(ql)?://'`)
    secretRows += rows[0]?.count ?? 0
  }
  assert.equal(secretRows, 0)

  const databaseSize = await fourth.sql.unsafe<Array<{ bytes: string }>>("SELECT pg_database_size(current_database())::bigint::text bytes")
  const schemaSize = await fourth.sql.unsafe<Array<{ table_bytes: string; index_bytes: string; total_bytes: string }>>("SELECT coalesce(sum(pg_relation_size(c.oid)),0)::bigint::text table_bytes,coalesce(sum(pg_indexes_size(c.oid)),0)::bigint::text index_bytes,coalesce(sum(pg_total_relation_size(c.oid)),0)::bigint::text total_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='refresh_control' AND c.relkind IN ('r','p')")
  const categorySizes = await fourth.sql.unsafe<Array<{ category: string; bytes: string }>>("SELECT CASE WHEN c.relname='migration_ledger' THEN 'migration' WHEN c.relname IN ('refresh_lease','refresh_event') THEN 'lease_event' WHEN c.relname IN ('refresh_plan','refresh_run','refresh_unit','refresh_policy') THEN 'plan_run_unit' WHEN c.relname IN ('refresh_candidate','candidate_validation','release_manifest','release_manifest_entry','release_comparison','activation_readiness') THEN 'candidate_manifest' ELSE 'source_artifact' END category,sum(pg_total_relation_size(c.oid))::bigint::text bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='refresh_control' AND c.relkind IN ('r','p') GROUP BY 1 ORDER BY 1")
  await fourth.shutdown()

  console.log(JSON.stringify({ status: "PASS", migration: reapplied, relationCount: relations.length, explicitIndexCount: EXPECTED_INDEXES.length, totalIndexCount: indexes.length, constraintCount: constraints[0]?.count ?? 0, appendOnlyEventTrigger: true, leaseAndFencing: "PASS", expiredLeaseRecovery: "PASS", staleWorkerRejection: "PASS", checkpointRecovery: ["ACQUIRED", "NORMALIZED", "COMMITTED"], candidateBuildRecovery: "PASS_INACTIVE", secretPersistenceRows: secretRows, sizes: { databaseBytes: Number(databaseSize[0]?.bytes ?? 0), tableBytes: Number(schemaSize[0]?.table_bytes ?? 0), indexBytes: Number(schemaSize[0]?.index_bytes ?? 0), schemaTotalBytes: Number(schemaSize[0]?.total_bytes ?? 0), categories: categorySizes.map((entry) => ({ category: entry.category, bytes: Number(entry.bytes) })) } }, null, 2))
}

async function readUnit(client: ReturnType<typeof createMvpRefreshCertificationClientFromEnvironment>, unitId: string) {
  const rows = await client.sql.unsafe<Array<{ state: string; attempt: number; checkpoint: Record<string, unknown> | string }>>("SELECT state,attempt,checkpoint FROM refresh_control.refresh_unit WHERE unit_id=$1", [unitId])
  assert(rows[0])
  return { ...rows[0], checkpoint: typeof rows[0].checkpoint === "string" ? JSON.parse(rows[0].checkpoint) as Record<string, unknown> : rows[0].checkpoint }
}

async function assertRejects(work: () => Promise<void>, expected: string) {
  await assert.rejects(work, (error: unknown) => error instanceof Error && error.message.includes(expected))
}

function delay(milliseconds: number) { return new Promise((resolve) => setTimeout(resolve, milliseconds)) }

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_REFRESH_POSTGRES_TEST_FAILED"); process.exitCode = 1 })
