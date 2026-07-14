import { readFileSync } from "node:fs"
import { deriveCanonicalRecordIdentity } from "@/lib/data-platform/persistence"
import { discoverApprovedMigrations, inspectIsolatedTarget, validateMigrationFilenames, validatePostgresConfig, validateTypedCanonicalFact } from "@/lib/data-platform/persistence/postgres"
import { aggTradeFact, fundingCommand } from "./fixtures"

async function main() {
const checks: Array<[string, boolean]> = []
const check = (name: string, pass: boolean) => checks.push([name, pass])

check("isolated target accepted", inspectIsolatedTarget("postgres://user:redacted@d2-isolated.example/d2_test").safe)
check("production target rejected", !inspectIsolatedTarget("postgres://user:redacted@primary.example/quantterminal_prod").safe)
check("credential redaction", !inspectIsolatedTarget("postgres://secret-user:secret-password@d2-isolated.example/d2_test").redactedTarget.includes("secret"))
check("bounded client config", validatePostgresConfig({ connectionString: "postgres://redacted@d2-isolated.example/d2_test", roleIntent: "CANONICAL_WRITER", maxConnections: 4, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d2-test" }).length === 0)
check("unbounded connection count rejected", validatePostgresConfig({ connectionString: "postgres://redacted@d2-isolated.example/d2_test", roleIntent: "CANONICAL_WRITER", maxConnections: 20, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d2-test" }).includes("MAX_CONNECTIONS_OUT_OF_BOUNDS"))

const migrations = await discoverApprovedMigrations()
check("approved migration discovery", migrations.length === 8)
check("migration checksums deterministic", migrations.every((migration) => /^[a-f0-9]{64}$/.test(migration.checksum)))
check("migration order deterministic", migrations.map((migration) => migration.migrationId).join(",") === "001,002,003,004,005,006,007,008")
check("malformed migration rejected", validateMigrationFilenames(["bad.sql"]).some((error) => error.startsWith("MALFORMED_MIGRATION")))
check("duplicate migration number rejected", validateMigrationFilenames(["001_one.sql", "001_two.sql"]).includes("DUPLICATE_MIGRATION_NUMBER:001"))

const adapterSource = readFileSync("lib/data-platform/persistence/postgres/canonicalAdapter.ts", "utf8")
const typedWriterSource = readFileSync("lib/data-platform/persistence/postgres/typedFactWriter.ts", "utf8")
const aggTradeMigration = readFileSync("lib/data-platform/persistence/postgres/migrations/007_agg_trade_facts.sql", "utf8")
check("no generic fact payload writer", !adapterSource.includes("payload: unknown") && adapterSource.includes("insertTypedCanonicalFact"))
check("advisory identity lock present", adapterSource.includes("pg_advisory_xact_lock"))
check("duplicate and conflict are distinct", adapterSource.includes('status: "DUPLICATE"') && adapterSource.includes('status: "CONFLICT"'))
check("bounded retry budget", adapterSource.includes("maxRetries") && adapterSource.includes("retryWithSameIdempotencyKey"))
check("no environment selection in client", !readFileSync("lib/data-platform/persistence/postgres/client.ts", "utf8").includes("process.env"))
check("agg trade uses the typed writer and reconciliation table", typedWriterSource.includes("canonical.agg_trades") && adapterSource.includes("canonical.agg_trades"))
check("agg trade migration persists required fields and envelope type", ["canonical_instrument_id", "market_type", "aggregate_trade_id", "price", "quantity", "first_trade_id", "last_trade_id", "trade_time", "buyer_is_maker", "'AGG_TRADE'"].every((field) => aggTradeMigration.includes(field)))
const fundingFact = fundingCommand().fact
check("typed funding validation", fundingFact.kind === "FUNDING" && validateTypedCanonicalFact(fundingFact).length === 0)
check("invalid typed funding rejected", fundingFact.kind === "FUNDING" && validateTypedCanonicalFact({ ...fundingFact, fundingRate: "not-a-decimal" }).includes("INVALID_FUNDING_FACT"))
const aggTrade = aggTradeFact()
check("typed agg trade validation", validateTypedCanonicalFact(aggTrade).length === 0)
check("agg trade requires exact typed fields", validateTypedCanonicalFact({ ...aggTrade, aggregateTradeId: "", firstTradeId: "", buyerIsMaker: "true" as unknown as boolean }).includes("INVALID_AGG_TRADE_FACT"))
check("agg trade identity is provider venue symbol aggregate-trade scoped", aggTrade.identity.datasetId === "agg-trade" && aggTrade.identity.canonicalRecordId === deriveCanonicalRecordIdentity({ ...aggTrade, canonicalInstrumentId: "other:BTC-USDT", price: "1", quantity: "2", tradeTime: "2026-01-01T00:01:00.000Z", buyerIsMaker: false }).canonicalRecordId)

const failures = checks.filter(([, pass]) => !pass)
console.log(`D2 PHASE 2 UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
