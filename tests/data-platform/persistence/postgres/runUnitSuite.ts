import { readFileSync } from "node:fs"
import { discoverApprovedMigrations, inspectIsolatedTarget, validateMigrationFilenames, validatePostgresConfig, validateTypedCanonicalFact } from "@/lib/data-platform/persistence/postgres"
import { fundingCommand } from "./fixtures"

async function main() {
const checks: Array<[string, boolean]> = []
const check = (name: string, pass: boolean) => checks.push([name, pass])

check("isolated target accepted", inspectIsolatedTarget("postgres://user:redacted@d2-isolated.example/d2_test").safe)
check("production target rejected", !inspectIsolatedTarget("postgres://user:redacted@primary.example/quantterminal_prod").safe)
check("credential redaction", !inspectIsolatedTarget("postgres://secret-user:secret-password@d2-isolated.example/d2_test").redactedTarget.includes("secret"))
check("bounded client config", validatePostgresConfig({ connectionString: "postgres://redacted@d2-isolated.example/d2_test", roleIntent: "CANONICAL_WRITER", maxConnections: 4, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d2-test" }).length === 0)
check("unbounded connection count rejected", validatePostgresConfig({ connectionString: "postgres://redacted@d2-isolated.example/d2_test", roleIntent: "CANONICAL_WRITER", maxConnections: 20, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d2-test" }).includes("MAX_CONNECTIONS_OUT_OF_BOUNDS"))

const migrations = await discoverApprovedMigrations()
check("approved migration discovery", migrations.length === 5)
check("migration checksums deterministic", migrations.every((migration) => /^[a-f0-9]{64}$/.test(migration.checksum)))
check("migration order deterministic", migrations.map((migration) => migration.migrationId).join(",") === "001,002,003,004,005")
check("malformed migration rejected", validateMigrationFilenames(["bad.sql"]).some((error) => error.startsWith("MALFORMED_MIGRATION")))
check("duplicate migration number rejected", validateMigrationFilenames(["001_one.sql", "001_two.sql"]).includes("DUPLICATE_MIGRATION_NUMBER:001"))

const adapterSource = readFileSync("lib/data-platform/persistence/postgres/canonicalAdapter.ts", "utf8")
check("no generic fact payload writer", !adapterSource.includes("payload: unknown") && adapterSource.includes("insertTypedCanonicalFact"))
check("advisory identity lock present", adapterSource.includes("pg_advisory_xact_lock"))
check("duplicate and conflict are distinct", adapterSource.includes('status: "DUPLICATE"') && adapterSource.includes('status: "CONFLICT"'))
check("bounded retry budget", adapterSource.includes("maxRetries") && adapterSource.includes("retryWithSameIdempotencyKey"))
check("no environment selection in client", !readFileSync("lib/data-platform/persistence/postgres/client.ts", "utf8").includes("process.env"))
const fundingFact = fundingCommand().fact
check("typed funding validation", fundingFact.kind === "FUNDING" && validateTypedCanonicalFact(fundingFact).length === 0)
check("invalid typed funding rejected", fundingFact.kind === "FUNDING" && validateTypedCanonicalFact({ ...fundingFact, fundingRate: "not-a-decimal" }).includes("INVALID_FUNDING_FACT"))

const failures = checks.filter(([, pass]) => !pass)
console.log(`D2 PHASE 2 UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
