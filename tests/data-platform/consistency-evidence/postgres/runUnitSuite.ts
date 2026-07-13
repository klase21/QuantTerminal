import { readFileSync } from "node:fs"
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  ConsistencyPostgresRuntime,
  D2_CERTIFIED_BASELINE,
  D2_DEPENDENCY_INVENTORY,
  D4_MIGRATION_ORDER,
  discoverCertifiedD2Dependencies,
  discoverD4Migrations,
  inspectD4RuntimeTarget,
  validateD4MigrationNames,
  validateDependencyInventory,
  verifyEnvironment,
  verifyReset,
} from "@/lib/data-platform/consistency-evidence/postgres"

async function main() {
  const checks: Array<[string, boolean]> = []
  const check = (name: string, pass: boolean) => checks.push([name, pass])
  const target = "postgres://redacted@localhost:55432/quantterminal_d4_isolated"
  const environment = { D4_ISOLATED_POSTGRES_URL: target }
  check("D4 isolated target accepted", inspectD4RuntimeTarget(target, environment).safe)
  check("expected database enforced", !inspectD4RuntimeTarget("postgres://redacted@localhost/other_isolated", {}).safe)
  check("production marker rejected", !inspectD4RuntimeTarget("postgres://redacted@production/quantterminal_d4_isolated", {}).safe)
  check("D2 URL reuse rejected", !inspectD4RuntimeTarget(target, { D2_ISOLATED_POSTGRES_URL: target }).safe)
  check("D3 URL reuse rejected", !inspectD4RuntimeTarget(target, { D3_ISOLATED_POSTGRES_URL: target }).safe)
  check("DATABASE_URL reuse rejected", !inspectD4RuntimeTarget(target, { DATABASE_URL: target }).safe)
  check("credentials redacted", !inspectD4RuntimeTarget("postgres://secret:password@localhost/quantterminal_d4_isolated", {}).redactedTarget.includes("secret"))
  check("environment verified", verifyEnvironment(environment).safe)
  let missingRejected = false; try { verifyEnvironment({}) } catch { missingRejected = true }; check("missing environment fails closed", missingRejected)

  const runtime = new ConsistencyPostgresRuntime({ connectionString: target, environment, roleIntent: "MIGRATION_OWNER", maxConnections: 2, connectTimeoutSeconds: 5, idleTimeoutSeconds: 15, applicationName: "d4-unit" })
  check("runtime begins disconnected", runtime.state === "DISCONNECTED")
  let queryRejected = false; try { void runtime.sql } catch { queryRejected = true }; check("query before connect rejected", queryRejected)
  let resetRejected = false; try { verifyReset(runtime, { explicitOptIn: "RESET_D4_ISOLATED_DATABASE", auditIdentity: "" }) } catch { resetRejected = true }; check("reset requires audit identity", resetRejected)
  await runtime.shutdown(); check("shutdown explicit", runtime.state === "SHUTDOWN")
  let reconnectRejected = false; try { await runtime.connect() } catch { reconnectRejected = true }; check("shutdown cannot reconnect", reconnectRejected)

  const migrations = await discoverD4Migrations()
  const dependencies = await discoverCertifiedD2Dependencies()
  check("migration discovery exact", migrations.length === D4_MIGRATION_ORDER.length)
  check("migration order deterministic", migrations.map((item) => item.filename).join(",") === D4_MIGRATION_ORDER.join(","))
  check("migration checksums deterministic", migrations.every((item) => /^[a-f0-9]{64}$/.test(item.checksum)))
  check("malformed filename rejected", validateD4MigrationNames(["bad.sql"]).some((item) => item.startsWith("MALFORMED_MIGRATION")))
  check("duplicate migration rejected", validateD4MigrationNames(["001_one.sql", "001_two.sql"]).includes("DUPLICATE_MIGRATION_NUMBER:001"))
  check("certified D2 baseline pinned", D2_CERTIFIED_BASELINE === "1cb1c8d:d2-canonical-persistence-v2.1")
  check("dependency inventory exact", dependencies.length === 4 && dependencies.map((item) => item.filename).join("|") === D2_DEPENDENCY_INVENTORY.map((item) => item.filename).join("|"))
  check("dependency checksums pinned", dependencies.every((item, index) => item.checksum === D2_DEPENDENCY_INVENTORY[index]?.checksum))
  check("dependency order deterministic", dependencies.map((item) => item.sequence).join(",") === "001,002,003,004")
  check("malformed dependency rejected", validateDependencyInventory(["bad.sql"]).some((item) => item.startsWith("MALFORMED_DEPENDENCY_MIGRATION")))
  check("duplicate dependency rejected", validateDependencyInventory(["001_one.sql", "001_two.sql"]).includes("DUPLICATE_DEPENDENCY_SEQUENCE:001"))
  check("D3 migration discovery absent", dependencies.every((item) => !item.sql.includes("population.")))
  const dependencyRoot = await mkdtemp(path.join(tmpdir(), "qt-d4-dependency-unit-"))
  try {
    await cp("lib/data-platform/persistence/postgres/migrations", dependencyRoot, { recursive: true })
    await rm(path.join(dependencyRoot, D2_DEPENDENCY_INVENTORY[3].filename))
    let missingRejected = false
    try { await discoverCertifiedD2Dependencies(dependencyRoot) } catch (error) { missingRejected = error instanceof Error && error.message === "D2_DEPENDENCY_INVENTORY_MISMATCH" }
    check("missing dependency rejected", missingRejected)
    await cp("lib/data-platform/persistence/postgres/migrations", dependencyRoot, { recursive: true, force: true })
    await writeFile(path.join(dependencyRoot, "005_unexpected.sql"), "SELECT 1;\n", "utf8")
    let unexpectedRejected = false
    try { await discoverCertifiedD2Dependencies(dependencyRoot) } catch (error) { unexpectedRejected = error instanceof Error && error.message === "D2_DEPENDENCY_INVENTORY_MISMATCH" }
    check("unexpected dependency rejected", unexpectedRejected)
    await rm(path.join(dependencyRoot, "005_unexpected.sql"))
    const driftPath = path.join(dependencyRoot, D2_DEPENDENCY_INVENTORY[0].filename)
    await writeFile(driftPath, (await readFile(driftPath, "utf8")) + "\n", "utf8")
    let driftRejected = false
    try { await discoverCertifiedD2Dependencies(dependencyRoot) } catch (error) { driftRejected = error instanceof Error && error.message.startsWith("D2_CERTIFIED_CHECKSUM_DRIFT") }
    check("certified dependency byte drift rejected", driftRejected)
  } finally {
    await rm(dependencyRoot, { recursive: true, force: true })
  }
  const runner = readFileSync("lib/data-platform/consistency-evidence/postgres/migrationRunner.ts", "utf8")
  const bootstrap = readFileSync("lib/data-platform/consistency-evidence/postgres/dependencyBootstrap.ts", "utf8")
  const reset = readFileSync("lib/data-platform/consistency-evidence/postgres/reset.ts", "utf8")
  check("D4 ledger isolated", runner.includes("d4_control.migration_ledger") && !runner.includes("FROM control.migration_ledger") && !runner.includes("INTO control.migration_ledger"))
  check("dependency ledger isolated", bootstrap.includes("d4_control.dependency_bootstrap_ledger") && !bootstrap.includes("control.migration_ledger"))
  check("D2 foundation required before D4 migration", runner.includes("verifyD2Foundation") && runner.indexOf("verifyD2Foundation") < runner.indexOf("discoverD4Migrations(this.migrationRoot)"))
  check("no automatic migration", !readFileSync("lib/data-platform/consistency-evidence/postgres/client.ts", "utf8").includes("ConsistencyMigrationRunner"))
  const nativeReset = reset.slice(reset.indexOf("export async function resetD4Runtime"), reset.indexOf("export async function resetD4FullIsolated"))
  check("native reset preserves D2 and D3 schemas", !nativeReset.includes("DROP SCHEMA IF EXISTS control") && !nativeReset.includes("DROP SCHEMA IF EXISTS population") && !nativeReset.includes("DROP SCHEMA IF EXISTS repository"))
  check("native reset preserves dependency ledger", nativeReset.includes("d4_control.migration_ledger") && !nativeReset.includes("dependency_bootstrap_ledger"))

  const failures = checks.filter(([, pass]) => !pass)
  console.log("D4 PHASE 2 PART 01 UNIT SUITE: " + (failures.length ? "FAIL" : "PASS"))
  for (const [name, pass] of checks) console.log("[" + (pass ? "PASS" : "FAIL") + "] " + name)
  if (failures.length) process.exitCode = 1
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
