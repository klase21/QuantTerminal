import { readFile } from "node:fs/promises"
import path from "node:path"

import { inspectDurableCanonicalTarget } from "@/lib/data-platform/persistence/postgres"
import {
  COMMITTED_RAW_AND_COMMIT_FOREIGN_KEY_COUNT,
  COMPLETE_D3_TO_D2_FOREIGN_KEY_COUNT,
  D3_TO_D2_FOREIGN_KEY_DEPENDENCIES,
  INTEGRATED_BACKFILL_MIGRATION_PLAN,
  inspectIntegratedBackfillTarget,
} from "@/lib/data-platform/population/backfill"
import { inspectDurableD3Target } from "@/lib/data-platform/population/postgres"

let failures = 0
function check(name: string, value: boolean) {
  if (value) console.log(`PASS ${name}`)
  else { failures += 1; console.error(`FAIL ${name}`) }
}

const d2 = (host = "localhost", port = "55432", database = "quantterminal_backfill", role = "qt_d2_backfill_owner") => `postgres://${role}:secret@${host}:${port}/${database}`
const d3 = (host = "localhost", port = "55432", database = "quantterminal_backfill", role = "qt_d3_backfill_owner") => `postgres://${role}:secret@${host}:${port}/${database}`

async function inspect(d2Url: string | undefined, d3Url: string | undefined, objectRoot = path.parse(process.cwd()).root) {
  return inspectIntegratedBackfillTarget({ d2Url, d3Url, objectRoot, repositoryRoot: process.cwd() })
}

async function main() {
  const accepted = await inspect(d2(), d3())
  check("integrated profile accepts shared target and distinct roles", accepted.safe && accepted.database === "quantterminal_backfill" && accepted.d2Role !== accepted.d3Role)
  check("credentials are redacted", !accepted.d2RedactedTarget.includes("secret") && !accepted.d3RedactedTarget.includes("secret"))
  check("dedicated D2 profile remains unchanged", inspectDurableCanonicalTarget("postgres://owner:secret@localhost:55432/quantterminal_d2_backfill").safe)
  check("dedicated D3 profile remains unchanged", inspectDurableD3Target("postgres://owner:secret@localhost:55432/quantterminal_d3_backfill").safe)
  check("integrated profile rejects separate durable databases", !(await inspect(d2("localhost", "55432", "quantterminal_d2_backfill"), d3("localhost", "55432", "quantterminal_d3_backfill"))).safe)
  check("integrated profile requires shared host", !(await inspect(d2(), d3("127.0.0.1"))).safe)
  check("integrated profile requires shared port", !(await inspect(d2(), d3("localhost", "55433"))).safe)
  check("integrated profile requires shared database", !(await inspect(d2(), d3("localhost", "55432", "quantterminal_d3_backfill"))).safe)
  check("integrated profile requires distinct roles", !(await inspect(d2(), d3("localhost", "55432", "quantterminal_backfill", "qt_d2_backfill_owner"))).safe)
  check("integrated profile requires approved D2 role", !(await inspect(d2("localhost", "55432", "quantterminal_backfill", "other"), d3())).safe)
  check("integrated profile requires approved D3 role", !(await inspect(d2(), d3("localhost", "55432", "quantterminal_backfill", "other"))).safe)
  check("integrated profile rejects absent variables", !(await inspect(undefined, undefined)).safe)
  check("integrated profile rejects malformed URLs", !(await inspect("not-a-url", d3())).safe)
  check("integrated profile rejects certification database", !(await inspect(d2("localhost", "55432", "quantterminal_d2_isolated"), d3())).safe)
  check("integrated profile rejects D4 database", !(await inspect(d2("localhost", "55432", "quantterminal_d4_isolated"), d3())).safe)
  check("integrated profile rejects production target", !(await inspect(d2("production.example"), d3("production.example"))).safe)
  check("integrated profile rejects repository object root", !(await inspect(d2(), d3(), process.cwd())).safe)
  const unsupportedD2 = inspectDurableCanonicalTarget as unknown as (url: string, purpose: string) => { readonly safe: boolean }
  const unsupportedD3 = inspectDurableD3Target as unknown as (url: string, purpose: string) => { readonly safe: boolean }
  check("unsupported target purpose fails closed", !unsupportedD2(d2(), "UNKNOWN").safe && !unsupportedD3(d3(), "UNKNOWN").safe)

  const migration = await readFile(path.join(process.cwd(), "lib", "data-platform", "population", "postgres", "migrations", "001_population_control_plane.sql"), "utf8")
  const adapter = await readFile(path.join(process.cwd(), "lib", "data-platform", "population", "postgres", "adapter.ts"), "utf8")
  const dependencyTargets = ["raw.objects", "control.provider_snapshots", "control.policy_versions", "control.canonical_commits", "quarantine.conflicts", "quarantine.candidates"]
  const physicalReferences = [...migration.matchAll(/REFERENCES\s+([a-z_]+\.[a-z_]+)\s*\(/g)].filter((match) => dependencyTargets.includes(match[1]))
  const rawAndCommit = physicalReferences.filter((match) => match[1] === "raw.objects" || match[1] === "control.canonical_commits")
  check("complete D3-to-D2 physical FK inventory", physicalReferences.length === COMPLETE_D3_TO_D2_FOREIGN_KEY_COUNT && D3_TO_D2_FOREIGN_KEY_DEPENDENCIES.length === COMPLETE_D3_TO_D2_FOREIGN_KEY_COUNT)
  check("committed raw and commit FK count corrects prompt discrepancy", rawAndCommit.length === COMMITTED_RAW_AND_COMMIT_FOREIGN_KEY_COUNT)
  check("D2 migrations precede D3 migrations", INTEGRATED_BACKFILL_MIGRATION_PLAN.d2[0] === "001_control_and_raw.sql" && INTEGRATED_BACKFILL_MIGRATION_PLAN.d3[0] === "001_population_control_plane.sql")
  check("D2 and D3 migration ledgers remain distinct", new Set(INTEGRATED_BACKFILL_MIGRATION_PLAN.ledgerOrder).size === 2)
  check("no cross-database workaround introduced", !/\b(?:dblink|postgres_fdw|CREATE\s+SERVER)\b/i.test(migration))
  check("no D2 replacement schema introduced", !/CREATE\s+(?:SCHEMA|TABLE)\s+(?:IF\s+NOT\s+EXISTS\s+)?canonical\b/i.test(migration))
  check("D3 has no direct Canonical Fact mutation", !/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+canonical\./i.test(adapter))
  check("D3 migration preserves physical foreign keys", rawAndCommit.every((match) => match[0].includes("REFERENCES")))

  if (failures) throw new Error(`${failures} integrated topology checks failed`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
