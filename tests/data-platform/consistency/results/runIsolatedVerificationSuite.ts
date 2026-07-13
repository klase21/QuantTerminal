import {
  ConsistencyMigrationRunner,
  ConsistencyPostgresRuntime,
  ConsistencyResultStore,
  ConsistencyRunStore,
  D4_MIGRATION_ORDER,
  resetD4Runtime,
  verifyEnvironment,
  type ResultStoreFailurePoint,
} from "@/lib/data-platform/consistency-evidence/postgres"
import { createImmutableConsistencyResult, reconcileConsistencyResult, type ConsistencyResultWriteRequest } from "@/lib/data-platform/consistency"
import { createResultFixture, temporalFact } from "./fixtures"

async function main() {
  const environment = { D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL, D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL, D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL }
  const target = verifyEnvironment(environment)
  console.log(JSON.stringify({ host: target.host, port: target.port, database: target.database, sslMode: target.sslMode, safe: target.safe }))
  const migrationRuntime = new ConsistencyPostgresRuntime({ connectionString: environment.D4_ISOLATED_POSTGRES_URL!, environment, roleIntent: "MIGRATION_OWNER", maxConnections: 2, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "quantterminal-d4-phase2b-migrations" })
  const workerRuntime = new ConsistencyPostgresRuntime({ connectionString: environment.D4_ISOLATED_POSTGRES_URL!, environment, roleIntent: "CONSISTENCY_WORKER", maxConnections: 4, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "quantterminal-d4-phase2b-results" })
  const checks: Array<[string, boolean]> = []
  const check = (name: string, passed: boolean) => checks.push([name, passed])
  try {
    const database = await migrationRuntime.connect()
    check("isolated database verified", database.database === "quantterminal_d4_isolated")
    await resetD4Runtime(migrationRuntime, { explicitOptIn: "RESET_D4_ISOLATED_DATABASE", auditIdentity: "d4-phase2b-certification" })
    const migrations = await new ConsistencyMigrationRunner(migrationRuntime).apply("d4-phase2b-certification")
    check("all D4 migrations apply", migrations.length === D4_MIGRATION_ORDER.length && migrations.every((migration) => migration.status === "APPLIED"))
    const rerun = await new ConsistencyMigrationRunner(migrationRuntime).apply("d4-phase2b-certification")
    check("migration rerun skips", rerun.length === D4_MIGRATION_ORDER.length && rerun.every((migration) => migration.status === "SKIPPED"))
    await seedRules(migrationRuntime)
    await workerRuntime.connect()
    const runStore = new ConsistencyRunStore(workerRuntime)
    const store = new ConsistencyResultStore(workerRuntime)

    const baseRequest = createResultFixture()
    check("base Run created", (await runStore.create(baseRequest.runSpecification)).status === "CREATED")
    const created = await store.write(baseRequest)
    check("Result CREATED", created.status === "CREATED")
    const duplicate = await store.write(baseRequest)
    check("identical retry DUPLICATE", duplicate.status === "DUPLICATE" && !duplicate.reconciledUnknownOutcome)
    const baseResult = created.status === "CREATED" ? created.result : createImmutableConsistencyResult(baseRequest)
    const baseCounts = await counts(workerRuntime, baseResult.resultId)
    check("one authoritative Result graph", baseCounts.results === 1 && baseCounts.inputs === 2 && baseCounts.temporal === 1 && baseCounts.diagnostics === 1 && baseCounts.runLinks === 1)

    const reuseRequest = createResultFixture({ executionProfile: "bounded-result-reuse" })
    check("reuse Run distinct", reuseRequest.runSpecification.runId !== baseRequest.runSpecification.runId)
    await runStore.create(reuseRequest.runSpecification)
    const reused = await store.write(reuseRequest)
    check("cross-Run semantic reuse explicit", reused.status === "REUSED" && reused.result.resultId === baseResult.resultId)
    const reusedCounts = await counts(workerRuntime, baseResult.resultId)
    check("reuse adds Run link only", reusedCounts.results === 1 && reusedCounts.runLinks === 2 && reusedCounts.inputs === 2)

    const conflictingRequest = createResultFixture({ outcome: "INCONSISTENT" })
    const conflict = await store.write(conflictingRequest)
    check("incompatible immutable content CONFLICT", conflict.status === "CONFLICT" && conflict.existingResult.checksum === baseResult.checksum)
    const repeatedConflict = await store.write(conflictingRequest)
    const conflictRows = await store.conflicts(baseResult.resultIdentity)
    check("conflict audit idempotent", repeatedConflict.status === "CONFLICT" && conflictRows.length === 1)
    check("conflict does not overwrite Result", (await store.lookup(baseResult.resultIdentity)).status === "FOUND" && (await counts(workerRuntime, baseResult.resultId)).results === 1)

    const orderedRequest = createResultFixture({ inputs: [temporalFact("ordered-a", "left"), temporalFact("ordered-b", "right")] })
    await runStore.create(orderedRequest.runSpecification)
    const orderedReverse = { ...orderedRequest, inputs: [...orderedRequest.inputs].reverse() }
    const orderedResults = await Promise.all([store.write(orderedRequest), store.write(orderedReverse)])
    check("parallel reordered semantic inputs converge", orderedResults.some((result) => result.status === "CREATED") && orderedResults.some((result) => result.status === "DUPLICATE"))

    const concurrentRequest = createResultFixture({ inputs: [temporalFact("concurrent-a", "left"), temporalFact("concurrent-b", "right")] })
    await runStore.create(concurrentRequest.runSpecification)
    const concurrent = await Promise.all([store.write(concurrentRequest), store.write(concurrentRequest)])
    check("parallel identical writes serialize", concurrent.filter((result) => result.status === "CREATED").length === 1 && concurrent.filter((result) => result.status === "DUPLICATE").length === 1)

    const conflictRaceRequest = createResultFixture({ inputs: [temporalFact("race-a", "left"), temporalFact("race-b", "right")] })
    await runStore.create(conflictRaceRequest.runSpecification)
    const conflictRace = await Promise.all([store.write(conflictRaceRequest), store.write({ ...conflictRaceRequest, outcome: "INCONSISTENT" })])
    check("parallel incompatible writes fail closed", conflictRace.filter((result) => result.status === "CREATED").length === 1 && conflictRace.filter((result) => result.status === "CONFLICT").length === 1)

    const v1Request = createResultFixture({ inputs: [temporalFact("correction-a", "left", 1), temporalFact("correction-b", "right", 1)] })
    const v2Request = createResultFixture({ inputs: [temporalFact("correction-a", "left", 2), temporalFact("correction-b", "right", 1)] })
    await runStore.create(v1Request.runSpecification); await runStore.create(v2Request.runSpecification)
    const corrections = await Promise.all([store.write(v1Request), store.write(v2Request)])
    check("correction creates distinct immutable Result", corrections.every((result) => result.status === "CREATED") && createImmutableConsistencyResult(v1Request).resultId !== createImmutableConsistencyResult(v2Request).resultId)
    const v1Lookup = await store.lookup(createImmutableConsistencyResult(v1Request).resultIdentity)
    check("V1 remains bound to V1", v1Lookup.status === "FOUND" && v1Lookup.result.inputs.every((input) => input.recordVersion === 1))

    const ruleV1 = createResultFixture({ inputs: [temporalFact("rule-a", "left"), temporalFact("rule-b", "right")] })
    const ruleV2 = createResultFixture({ inputs: [temporalFact("rule-a", "left"), temporalFact("rule-b", "right")], ruleVersion: "2.0.0" })
    await runStore.create(ruleV1.runSpecification)
    const ruleWrites = await Promise.all([store.write(ruleV1), store.write(ruleV2)])
    check("Rule-version drift creates distinct Results", ruleWrites.every((result) => result.status === "CREATED") && createImmutableConsistencyResult(ruleV1).resultId !== createImmutableConsistencyResult(ruleV2).resultId)

    const failurePoints: readonly Exclude<ResultStoreFailurePoint, "AFTER_COMMIT_UNKNOWN">[] = ["AFTER_IDENTITY_CALCULATION", "AFTER_RESULT_ROW", "AFTER_FIRST_INPUT_LINK", "AFTER_ALL_INPUT_LINKS", "AFTER_TEMPORAL_LINK", "AFTER_DIAGNOSTICS", "AFTER_CHECKSUM_PERSISTENCE", "AFTER_RUN_LINK"]
    for (const [index, point] of failurePoints.entries()) {
      const request = createResultFixture({ inputs: [temporalFact(`failure-${index}-a`, "left"), temporalFact(`failure-${index}-b`, "right")] })
      await runStore.create(request.runSpecification)
      const result = createImmutableConsistencyResult(request)
      let outcome: Awaited<ReturnType<ConsistencyResultStore["write"]>> | null = null
      try { outcome = await new ConsistencyResultStore(workerRuntime, { fail: current => { if (current === point) throw new Error(point) } }).write(request) } catch { outcome = null }
      const state = await counts(workerRuntime, result.resultId)
      const runState = await workerRuntime.sql.unsafe<{ readonly current_state: string }[]>("SELECT current_state FROM consistency.run_states WHERE run_id=$1", [request.runSpecification.runId])
      check(`rollback ${point}`, (outcome === null || outcome.status === "RETRYABLE_FAILURE") && Object.values(state).every((count) => count === 0) && runState[0]?.current_state === "PENDING")
      const retry = await store.write(request)
      check(`deterministic retry ${point}`, retry.status === "CREATED")
    }

    const unknownRequest = createResultFixture({ inputs: [temporalFact("unknown-a", "left"), temporalFact("unknown-b", "right")] })
    await runStore.create(unknownRequest.runSpecification)
    const unknown = await new ConsistencyResultStore(workerRuntime, { fail: point => { if (point === "AFTER_COMMIT_UNKNOWN") throw new Error(point) } }).write(unknownRequest)
    check("unknown commit reconciled by identity/checksum", unknown.status === "DUPLICATE" && unknown.reconciledUnknownOutcome)

    const lookup = await store.lookup(baseResult.resultIdentity)
    if (lookup.status === "FOUND") { const reconciliation = reconcileConsistencyResult(lookup.result, baseRequest, lookup.runReferences, conflictRows); if (!reconciliation.consistent) console.log(JSON.stringify({ reconciliationReasons: reconciliation.reasonCodes })); check("persisted reconciliation passes", reconciliation.consistent) }
    else check("persisted reconciliation passes", false)

    let updateDenied = false; let deleteDenied = false
    try { await workerRuntime.sql.unsafe("UPDATE consistency.immutable_results SET outcome='INDETERMINATE' WHERE result_id=$1", [baseResult.resultId]) } catch (error) { updateDenied = ["42501", "55000"].includes(postgresCode(error) ?? "") }
    try { await workerRuntime.sql.unsafe("DELETE FROM consistency.immutable_results WHERE result_id=$1", [baseResult.resultId]) } catch (error) { deleteDenied = ["42501", "55000"].includes(postgresCode(error) ?? "") }
    check("physical Result update denied", updateDenied)
    check("physical Result delete denied", deleteDenied)

    const failures = checks.filter(([, passed]) => !passed)
    console.log(`D4 PHASE 2B ISOLATED POSTGRESQL SUITE: ${failures.length ? "FAIL" : "PASS"}`)
    for (const [name, passed] of checks) console.log(`[${passed ? "PASS" : "FAIL"}] ${name}`)
    if (failures.length) process.exitCode = 1
  } finally {
    await workerRuntime.shutdown()
    await migrationRuntime.shutdown()
  }
}

async function seedRules(runtime: ConsistencyPostgresRuntime): Promise<void> {
  await runtime.sql.unsafe("INSERT INTO consistency.rule_sets(rule_set_id,rule_set_version,policy_version_id,state,definition_checksum,created_at) VALUES('RESULT-RULES','1.0.0','result-policy','APPROVED',repeat('a',64),'2026-02-01T00:00:00Z')")
  for (const version of ["1.0.0", "2.0.0"]) await runtime.sql.unsafe("INSERT INTO consistency.rules(rule_id,rule_version,rule_set_id,rule_set_version,category,semantic_class,diagnostics_schema_version,policy_version_id,default_severity,definition_checksum,created_at) VALUES('result-rule',$1,'RESULT-RULES','1.0.0','DATASET_AGREEMENT','FACTUAL','1','result-policy','BLOCKING',repeat($2,64),'2026-02-01T00:00:00Z')", [version, version === "1.0.0" ? "b" : "c"])
}

async function counts(runtime: ConsistencyPostgresRuntime, resultId: string) {
  const rows = await runtime.sql.unsafe<{ readonly results: number; readonly inputs: number; readonly temporal: number; readonly diagnostics: number; readonly runLinks: number }[]>("SELECT (SELECT count(*)::int FROM consistency.immutable_results WHERE result_id=$1) results,(SELECT count(*)::int FROM consistency.result_input_references WHERE result_id=$1) inputs,(SELECT count(*)::int FROM consistency.result_temporal_references WHERE result_id=$1) temporal,(SELECT count(*)::int FROM consistency.immutable_result_diagnostics WHERE result_id=$1) diagnostics,(SELECT count(*)::int FROM consistency.result_run_links WHERE result_id=$1) \"runLinks\"", [resultId])
  return rows[0]!
}

function postgresCode(error: unknown): string | null { return typeof error === "object" && error !== null && "code" in error ? String((error as { readonly code: unknown }).code) : null }

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
