import { createCanonicalPersistenceAdapter, inspectDurableCanonicalTarget, type IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"

let failures = 0
function check(name: string, value: boolean) { if (value) console.log(`PASS ${name}`); else { failures += 1; console.error(`FAIL ${name}`) } }

async function main() {
  const accepted = inspectDurableCanonicalTarget("postgres://bounded_writer:secret@localhost:55432/quantterminal_d2_backfill")
  check("allowlisted durable D2 target accepted", accepted.safe && accepted.database === "quantterminal_d2_backfill" && !accepted.redactedTarget.includes("secret"))
  check("D2 certification target rejected", !inspectDurableCanonicalTarget("postgres://writer:secret@localhost:55432/quantterminal_d2_isolated").safe)
  check("D3 certification target rejected", !inspectDurableCanonicalTarget("postgres://writer:secret@localhost:55432/quantterminal_d3_isolated").safe)
  check("D4 certification target rejected", !inspectDurableCanonicalTarget("postgres://writer:secret@localhost:55432/quantterminal_d4_isolated").safe)
  check("production-like host rejected", !inspectDurableCanonicalTarget("postgres://writer:secret@production.example/quantterminal_d2_backfill").safe)
  check("missing durable target fails closed", !inspectDurableCanonicalTarget(undefined).safe)

  let queried = false
  const client = { roleIntent: "READ_ONLY", sql: (() => { queried = true; throw new Error("UNEXPECTED_QUERY") }) as unknown as IsolatedPostgresClient["sql"], async transaction() { throw new Error("NOT_USED") }, async shutdown() {} } as IsolatedPostgresClient
  const invalid = await createCanonicalPersistenceAdapter(client).readLatestCanonicalVersion({ canonicalRecordId: "", datasetId: "ohlcv", businessIdentity: "identity", providerId: "provider" })
  check("invalid latest-version lookup fails before SQL", invalid.status === "INVALID_REQUEST" && !queried)
  if (failures) throw new Error(`${failures} durable D2 boundary checks failed`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
