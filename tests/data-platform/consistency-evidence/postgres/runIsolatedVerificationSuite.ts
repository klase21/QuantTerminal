import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import postgres from "postgres"
import {
  ConsistencyMigrationRunner,
  ConsistencyPostgresRuntime,
  D2DependencyBootstrapRunner,
  D2_DEPENDENCY_INVENTORY,
  D4_MIGRATION_ROOT,
  D4_MIGRATION_ORDER,
  resetD4FullIsolated,
  resetD4Runtime,
  verifyD2Foundation,
  verifyD4Reset,
  verifyEnvironment,
} from "@/lib/data-platform/consistency-evidence/postgres"

interface SeparationSnapshot {
  readonly database: string
  readonly d4Control: string | null
  readonly ruleSets: string | null
  readonly evidenceProfiles: string | null
}

async function inspectSeparateTarget(connectionString: string): Promise<SeparationSnapshot> {
  const sql = postgres(connectionString, { max: 1, connect_timeout: 5, idle_timeout: 5, prepare: false })
  try {
    const rows = await sql.unsafe<SeparationSnapshot[]>("SELECT current_database() database,to_regnamespace('d4_control')::text \"d4Control\",to_regclass('consistency.rule_sets')::text \"ruleSets\",to_regclass('evidence.profiles')::text \"evidenceProfiles\"")
    if (!rows[0]) throw new Error("SEPARATION_PROBE_EMPTY")
    return Object.freeze(rows[0])
  } finally {
    await sql.end({ timeout: 5 })
  }
}

async function main() {
  const environment = {
    D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL,
    D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL,
    D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL,
    DATABASE_URL: process.env.DATABASE_URL,
  }
  const inspection = verifyEnvironment(environment)
  if (!environment.D2_ISOLATED_POSTGRES_URL || !environment.D3_ISOLATED_POSTGRES_URL) throw new Error("D2_AND_D3_SEPARATION_URLS_REQUIRED")
  if (environment.D2_ISOLATED_POSTGRES_URL === environment.D4_ISOLATED_POSTGRES_URL || environment.D3_ISOLATED_POSTGRES_URL === environment.D4_ISOLATED_POSTGRES_URL) throw new Error("D4_TARGET_REUSE_REJECTED")
  console.log(JSON.stringify({ host: inspection.host, port: inspection.port, database: inspection.database, sslMode: inspection.sslMode, safe: inspection.safe }))

  const d2Before = await inspectSeparateTarget(environment.D2_ISOLATED_POSTGRES_URL)
  const d3Before = await inspectSeparateTarget(environment.D3_ISOLATED_POSTGRES_URL)
  const runtime = new ConsistencyPostgresRuntime({
    connectionString: environment.D4_ISOLATED_POSTGRES_URL!, environment, roleIntent: "MIGRATION_OWNER",
    maxConnections: 2, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "quantterminal-d4-part01b-certification",
  })
  const checks: Array<[string, boolean]> = []
  const check = (name: string, pass: boolean) => checks.push([name, pass])
  let failureRoot: string | null = null
  try {
    const database = await runtime.connect()
    check("database identity", database.database === "quantterminal_d4_isolated")
    check("PostgreSQL version available", database.serverVersion !== "UNKNOWN")
    check("D3 schema absent", !database.d3PopulationSchemaPresent)

    await resetD4FullIsolated(runtime, { explicitOptIn: "RESET_D4_FULL_ISOLATED_REBUILD", auditIdentity: "d4-part01b-certification" })
    check("full reset starts empty", !(await verifyD2Foundation(runtime)))
    let orderRejected = false
    try { await new ConsistencyMigrationRunner(runtime).apply("d4-part01b-certification") } catch (error) { orderRejected = error instanceof Error && error.message === "D2_SCHEMA_DEPENDENCY_MISSING" }
    check("D2 foundation required before D4", orderRejected)

    const bootstrap = new D2DependencyBootstrapRunner(runtime)
    await runtime.sql.unsafe("CREATE SCHEMA control")
    await runtime.sql.unsafe("CREATE TABLE control.registry_snapshots(incompatible integer)")
    const dependencySqlFailure = await bootstrap.apply("d4-part01b-certification")
    const dependencySqlFailureState = await runtime.sql.unsafe<{ readonly ledger: number; readonly laterObject: string | null }[]>("SELECT (SELECT count(*)::int FROM d4_control.dependency_bootstrap_ledger) ledger,to_regclass('raw.objects')::text \"laterObject\"")
    check("dependency SQL failure stops and is not ledgered", dependencySqlFailure.length === 1 && dependencySqlFailure[0]?.status === "FAILED" && dependencySqlFailureState[0]?.ledger === 0 && !dependencySqlFailureState[0]?.laterObject)
    const dependencySqlRetry = await bootstrap.apply("d4-part01b-certification")
    check("failed dependency retry remains fail closed", dependencySqlRetry.length === 1 && dependencySqlRetry[0]?.status === "FAILED")
    await resetD4FullIsolated(runtime, { explicitOptIn: "RESET_D4_FULL_ISOLATED_REBUILD", auditIdentity: "d4-part01b-certification" })

    await runtime.sql.unsafe("CREATE SCHEMA d4_control")
    await runtime.sql.unsafe("CREATE TABLE d4_control.dependency_bootstrap_ledger (dependency_owner text NOT NULL CHECK (dependency_owner='D2'), certified_baseline text NOT NULL, source_filename text NOT NULL, sequence text NOT NULL CHECK (sequence <> '001'), source_checksum text NOT NULL CHECK (source_checksum ~ '^[0-9a-f]{64}$'), applied_at timestamptz NOT NULL, target_database text NOT NULL CHECK (target_database='quantterminal_d4_isolated'), bootstrap_runner_version text NOT NULL, status text NOT NULL CHECK (status='APPLIED'), PRIMARY KEY (dependency_owner,sequence), UNIQUE (dependency_owner,source_filename))")
    const dependencyLedgerFailure = await bootstrap.apply("d4-part01b-certification")
    const dependencyLedgerFailureState = await runtime.sql.unsafe<{ readonly ledger: number; readonly commitTable: string | null }[]>("SELECT (SELECT count(*)::int FROM d4_control.dependency_bootstrap_ledger) ledger,to_regclass('control.canonical_commits')::text \"commitTable\"")
    check("dependency ledger failure rolls back migration", dependencyLedgerFailure.length === 1 && dependencyLedgerFailure[0]?.status === "FAILED" && dependencyLedgerFailureState[0]?.ledger === 0 && !dependencyLedgerFailureState[0]?.commitTable)
    await resetD4FullIsolated(runtime, { explicitOptIn: "RESET_D4_FULL_ISOLATED_REBUILD", auditIdentity: "d4-part01b-certification" })

    const dependencyFirst = await bootstrap.apply("d4-part01b-certification")
    check("certified D2 dependency applies", dependencyFirst.length === 4 && dependencyFirst.every((item) => item.status === "APPLIED"))
    check("D2 foundation verified", await verifyD2Foundation(runtime))
    const dependencyLedger = await runtime.sql.unsafe<{ readonly count: number }[]>("SELECT count(*)::int count FROM d4_control.dependency_bootstrap_ledger")
    check("dependency ledger complete", dependencyLedger[0]?.count === D2_DEPENDENCY_INVENTORY.length)
    const canonicalRows = await runtime.sql.unsafe<{ readonly total: number }[]>("SELECT ((SELECT count(*) FROM canonical.ohlcv)+(SELECT count(*) FROM canonical.funding)+(SELECT count(*) FROM canonical.open_interest)+(SELECT count(*) FROM canonical.liquidations)+(SELECT count(*) FROM canonical.prediction_snapshots)+(SELECT count(*) FROM canonical.etf_observations)+(SELECT count(*) FROM canonical.reserve_observations)+(SELECT count(*) FROM canonical.macro_observations)+(SELECT count(*) FROM canonical.stream_manifests))::int total")
    check("no canonical data copied", canonicalRows[0]?.total === 0)
    const dependencySecond = await bootstrap.apply("d4-part01b-certification")
    check("dependency rerun skips", dependencySecond.length === 4 && dependencySecond.every((item) => item.status === "SKIPPED"))

    await runtime.sql.unsafe("UPDATE d4_control.dependency_bootstrap_ledger SET source_checksum=repeat('0',64) WHERE sequence='001'")
    let dependencyDriftRejected = false
    try { await bootstrap.apply("d4-part01b-certification") } catch (error) { dependencyDriftRejected = error instanceof Error && error.message === "D2_BOOTSTRAP_HISTORY_MISMATCH" }
    check("dependency checksum drift rejected", dependencyDriftRejected)
    await runtime.sql.unsafe("UPDATE d4_control.dependency_bootstrap_ledger SET source_checksum=$1 WHERE sequence='001'", [D2_DEPENDENCY_INVENTORY[0].checksum])

    failureRoot = await mkdtemp(path.join(tmpdir(), "qt-d4-failure-"))
    await cp(D4_MIGRATION_ROOT, failureRoot, { recursive: true })
    const failureMigration = path.join(failureRoot, "001_consistency_contracts.sql")
    await writeFile(failureMigration, (await readFile(failureMigration, "utf8")) + "\nSELECT d4_intentional_missing_function();\n", "utf8")
    const failedMigration = await new ConsistencyMigrationRunner(runtime, failureRoot).apply("d4-part01b-certification")
    check("D4 SQL failure stops first migration", failedMigration.length === 1 && failedMigration[0]?.status === "FAILED")
    const failedState = await runtime.sql.unsafe<{ readonly ledger: number; readonly ruleSets: string | null }[]>("SELECT (SELECT count(*)::int FROM d4_control.migration_ledger) ledger,to_regclass('consistency.rule_sets')::text \"ruleSets\"")
    check("failed D4 migration rolls back SQL and ledger", failedState[0]?.ledger === 0 && !failedState[0]?.ruleSets)

    const nativeRunner = new ConsistencyMigrationRunner(runtime)
    const nativeFirst = await nativeRunner.apply("d4-part01b-certification")
    check("fresh D4 migrations apply", nativeFirst.length === D4_MIGRATION_ORDER.length && nativeFirst.every((item) => item.status === "APPLIED"))
    const nativeSecond = await nativeRunner.apply("d4-part01b-certification")
    check("D4 migration rerun skips", nativeSecond.length === D4_MIGRATION_ORDER.length && nativeSecond.every((item) => item.status === "SKIPPED"))
    const objects = await runtime.sql.unsafe<{ readonly ruleRuns: string | null; readonly ruleResults: string | null; readonly d2Runs: string | null; readonly d2Results: string | null }[]>("SELECT to_regclass('consistency.rule_runs')::text \"ruleRuns\",to_regclass('consistency.rule_results')::text \"ruleResults\",to_regclass('consistency.runs')::text \"d2Runs\",to_regclass('consistency.results')::text \"d2Results\"")
    check("D2 and D4 consistency objects coexist", Boolean(objects[0]?.ruleRuns && objects[0]?.ruleResults && objects[0]?.d2Runs && objects[0]?.d2Results))

    await runtime.sql.unsafe("UPDATE d4_control.migration_ledger SET migration_checksum=repeat('f',64) WHERE migration_id='001'")
    const nativeDrift = await nativeRunner.apply("d4-part01b-certification")
    check("D4 applied checksum drift rejected", nativeDrift.length === 1 && nativeDrift[0]?.status === "FAILED")
    const nativeArtifacts = await import("@/lib/data-platform/consistency-evidence/postgres").then((module) => module.discoverD4Migrations())
    await runtime.sql.unsafe("UPDATE d4_control.migration_ledger SET migration_checksum=$1 WHERE migration_id='001'", [nativeArtifacts[0]?.checksum])

    await runtime.sql.unsafe("CREATE TABLE d4_control.lifecycle_probe(id integer PRIMARY KEY)")
    await runtime.transaction(async (sql) => { await sql.unsafe("INSERT INTO d4_control.lifecycle_probe(id) VALUES(1)") })
    let rolledBack = false
    try { await runtime.transaction(async (sql) => { await sql.unsafe("INSERT INTO d4_control.lifecycle_probe(id) VALUES(2)"); throw new Error("INTENTIONAL_ROLLBACK") }) } catch { rolledBack = true }
    const lifecycleRows = await runtime.sql.unsafe<{ readonly count: number }[]>("SELECT count(*)::int count FROM d4_control.lifecycle_probe")
    check("explicit transaction commit and rollback", rolledBack && lifecycleRows[0]?.count === 1)
    await runtime.sql.unsafe("DROP TABLE d4_control.lifecycle_probe")

    await resetD4Runtime(runtime, { explicitOptIn: "RESET_D4_ISOLATED_DATABASE", auditIdentity: "d4-part01b-certification" })
    check("native reset preserves dependency foundation", await verifyD4Reset(runtime))
    const nativeReapply = await nativeRunner.apply("d4-part01b-certification")
    check("D4 reapplication after native reset", nativeReapply.length === D4_MIGRATION_ORDER.length && nativeReapply.every((item) => item.status === "APPLIED"))

    await resetD4FullIsolated(runtime, { explicitOptIn: "RESET_D4_FULL_ISOLATED_REBUILD", auditIdentity: "d4-part01b-certification" })
    const fullResetState = await runtime.sql.unsafe<{ readonly d2: string | null; readonly dependencyLedger: string | null; readonly nativeLedger: string | null }[]>("SELECT to_regclass('control.canonical_commits')::text d2,to_regclass('d4_control.dependency_bootstrap_ledger')::text \"dependencyLedger\",to_regclass('d4_control.migration_ledger')::text \"nativeLedger\"")
    check("full reset removes both foundations and ledgers", !fullResetState[0]?.d2 && !fullResetState[0]?.dependencyLedger && !fullResetState[0]?.nativeLedger)
    const rebuildDependency = await bootstrap.apply("d4-part01b-certification")
    const rebuildNative = await nativeRunner.apply("d4-part01b-certification")
    check("full isolated rebuild succeeds", rebuildDependency.every((item) => item.status === "APPLIED") && rebuildNative.every((item) => item.status === "APPLIED"))

    const d2After = await inspectSeparateTarget(environment.D2_ISOLATED_POSTGRES_URL)
    const d3After = await inspectSeparateTarget(environment.D3_ISOLATED_POSTGRES_URL)
    check("D2 target unchanged by D4 certification", JSON.stringify(d2After) === JSON.stringify(d2Before))
    check("D3 target unchanged by D4 certification", JSON.stringify(d3After) === JSON.stringify(d3Before))

    const failures = checks.filter(([, pass]) => !pass)
    console.log("D4 PHASE 2 PART 01B ISOLATED SUITE: " + (failures.length ? "FAIL" : "PASS"))
    for (const [name, pass] of checks) console.log("[" + (pass ? "PASS" : "FAIL") + "] " + name)
    if (failures.length) process.exitCode = 1
  } finally {
    if (failureRoot) await rm(failureRoot, { recursive: true, force: true })
    await runtime.shutdown()
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
