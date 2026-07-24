import assert from "node:assert/strict"

import {
  ConsistencyMigrationRunner,
  ConsistencyPostgresRuntime,
  D2DependencyBootstrapRunner,
  type D4Environment,
  type D4RoleIntent,
} from "@/lib/data-platform/consistency-evidence/postgres"

function runtime(environment: D4Environment, roleIntent: D4RoleIntent, maxConnections: number, applicationName: string) {
  return new ConsistencyPostgresRuntime({
    connectionString: environment.D4_ISOLATED_POSTGRES_URL!,
    environment,
    roleIntent,
    maxConnections,
    connectTimeoutSeconds: 10,
    idleTimeoutSeconds: 30,
    applicationName,
  })
}

async function concurrentRoles(instance: ConsistencyPostgresRuntime, count: number) {
  const rows = await Promise.all(Array.from({ length: count }, () =>
    instance.sql.unsafe<{ readonly role: string; readonly backend: number }[]>(
      "SELECT current_user role,pg_backend_pid() backend,pg_sleep(0.2)",
    )))
  return rows.map((result) => result[0]!)
}

async function denied(instance: ConsistencyPostgresRuntime, statement: string): Promise<boolean> {
  try {
    await instance.sql.unsafe(statement)
    return false
  } catch (error) {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "42501")
  }
}

async function main() {
  const environment: D4Environment = {
    D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL,
    D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL,
    D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL,
  }
  assert.throws(
    () => runtime(environment, "invalid role" as D4RoleIntent, 1, "d4-invalid-role"),
    /D4_ROLE_INTENT_INVALID/,
  )

  const owner = runtime(environment, "MIGRATION_OWNER", 2, "d4-pooled-role-owner")
  const worker = runtime(environment, "CONSISTENCY_WORKER", 4, "d4-pooled-role-worker")
  const assembler = runtime(environment, "EVIDENCE_ASSEMBLER", 4, "d4-pooled-role-assembler")
  try {
    await owner.connect()
    await new D2DependencyBootstrapRunner(owner).apply("d4-pooled-role")
    const migrations = await new ConsistencyMigrationRunner(owner).apply("d4-pooled-role")
    assert.equal(migrations.every((migration) => migration.status === "APPLIED"), true)
    const ownerRole = await owner.sql.unsafe<{ readonly role: string }[]>("SELECT current_user role")
    assert.equal(ownerRole[0]?.role, "qt_diag_owner")
    await owner.sql.unsafe("INSERT INTO evidence.core_assembly_profiles VALUES('POOL-PROFILE','1','1','pool-assembly','1','[]','pool-conclusion','1','[]',ARRAY[]::text[],ARRAY[]::text[],repeat('d',64),now())")

    await worker.connect()
    await assembler.connect()

    const sequentialWorkerRoles: string[] = []
    for (let index = 0; index < 4; index += 1) {
      const rows = await worker.sql.unsafe<{ readonly role: string }[]>("SELECT current_user role")
      sequentialWorkerRoles.push(rows[0]!.role)
    }
    assert.deepEqual(sequentialWorkerRoles, Array(4).fill("qt_d4_consistency_worker"))

    const concurrentWorker = await concurrentRoles(worker, 4)
    assert.deepEqual(concurrentWorker.map((row) => row.role), Array(4).fill("qt_d4_consistency_worker"))
    assert.equal(new Set(concurrentWorker.map((row) => row.backend)).size, 4)

    const [workerAgain, assemblerConcurrent] = await Promise.all([
      concurrentRoles(worker, 4),
      concurrentRoles(assembler, 4),
    ])
    assert.deepEqual(workerAgain.map((row) => row.role), Array(4).fill("qt_d4_consistency_worker"))
    assert.deepEqual(assemblerConcurrent.map((row) => row.role), Array(4).fill("qt_d4_evidence_assembler"))
    assert.equal(new Set(assemblerConcurrent.map((row) => row.backend)).size, 4)

    let rolledBack = false
    try {
      await worker.transaction(async (sql) => {
        const role = await sql.unsafe<{ readonly role: string }[]>("SELECT current_user role")
        assert.equal(role[0]?.role, "qt_d4_consistency_worker")
        await sql.unsafe("INSERT INTO consistency.run_creation_conflicts VALUES('pool-rollback','pool-run',repeat('a',64),repeat('b',64),now())")
        throw new Error("INTENTIONAL_ROLE_ROLLBACK")
      })
    } catch (error) {
      rolledBack = error instanceof Error && error.message === "INTENTIONAL_ROLE_ROLLBACK"
    }
    assert.equal(rolledBack, true)
    const rollbackRows = await worker.sql.unsafe<{ readonly count: number }[]>("SELECT count(*)::int count FROM consistency.run_creation_conflicts WHERE conflict_id='pool-rollback'")
    assert.equal(rollbackRows[0]?.count, 0)
    const reusedWorker = await concurrentRoles(worker, 4)
    assert.deepEqual(reusedWorker.map((row) => row.role), Array(4).fill("qt_d4_consistency_worker"))

    assert.equal(await denied(worker, "ALTER TABLE consistency.run_events ADD COLUMN pooled_worker_forbidden integer"), true)
    assert.equal(await denied(assembler, "ALTER TABLE evidence.core_packet_versions ADD COLUMN pooled_assembler_forbidden integer"), true)

    await worker.sql.unsafe("INSERT INTO consistency.run_creation_conflicts VALUES('pool-allowed','pool-run',repeat('a',64),repeat('b',64),now())")
    await assembler.sql.unsafe("INSERT INTO evidence.core_packet_identities VALUES('pool-packet',repeat('e',64),'BTCUSDT','MARKET','POOL','2026-01-01T00:00:00Z','2026-01-01T01:00:00Z','AS_KNOWN_THEN','2026-01-01T01:00:00Z','POOL-PROFILE','1','1',now())")
    const permitted = await owner.sql.unsafe<{ readonly worker: number; readonly assembler: number }[]>("SELECT (SELECT count(*)::int FROM consistency.run_creation_conflicts WHERE conflict_id='pool-allowed') worker,(SELECT count(*)::int FROM evidence.core_packet_identities WHERE packet_id='pool-packet') assembler")
    assert.deepEqual(permitted[0], { worker: 1, assembler: 1 })

    console.log(JSON.stringify({
      status: "PASS",
      sequentialWorkerRoles,
      concurrentWorkerRoles: concurrentWorker.map((row) => row.role),
      concurrentWorkerBackends: new Set(concurrentWorker.map((row) => row.backend)).size,
      concurrentAssemblerRoles: assemblerConcurrent.map((row) => row.role),
      concurrentAssemblerBackends: new Set(assemblerConcurrent.map((row) => row.backend)).size,
      ownerRoleLeakage: 0,
      rollbackRolePreserved: true,
      workerSchemaAlteration: "DENIED",
      assemblerSchemaAlteration: "DENIED",
      permittedRuntimeOperations: "PASS",
    }))
  } finally {
    await Promise.allSettled([assembler.shutdown(), worker.shutdown(), owner.shutdown()])
  }
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
