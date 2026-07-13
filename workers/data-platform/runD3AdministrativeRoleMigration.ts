import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { requireIntegratedBackfillTarget } from "@/lib/data-platform/population/backfill"

const CONTAINER = "quantterminal-d2-postgres"
const ADMIN_ROLE = "qt_d2_owner"
const DATABASE = "quantterminal_backfill"
const MIGRATION_ID = "002"
const MIGRATION_FILENAME = "002_population_roles.sql"
const EXPECTED_CHECKSUM = "15282384709e595158a1da55fe34b185f833f32389ed95a121ac2d8f0516e978"
const APPLIED_BY = "d3-phase3-local-container-admin"
const EXPECTED_ROLES = ["qt_d3_scheduler", "qt_d3_coordinator", "qt_d3_worker", "qt_d3_read_only"] as const

type Mode = "apply" | "inspect"

function psql(sql: string): string {
  const result = spawnSync("docker", [
    "exec", "-i", CONTAINER, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
    "-U", ADMIN_ROLE, "-d", DATABASE,
  ], { input: sql, encoding: "utf8", maxBuffer: 4 * 1024 * 1024, windowsHide: true })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const message = `${result.stderr || result.stdout}`.trim().replace(/postgres(?:ql)?:\/\/\S+/gi, "POSTGRES_URL_REDACTED")
    throw new Error(`ADMIN_PSQL_FAILED:${result.status}:${message || "UNKNOWN"}`)
  }
  return result.stdout.trim()
}

function scalar(sql: string): string {
  return psql(`${sql.trim().replace(/;?$/, ";")}\n`)
}

function validateBootstrapRoles(): void {
  const roleList = EXPECTED_ROLES.map((role) => `'${role}'`).join(",")
  const summary = scalar(`
    SELECT count(*) || '|' ||
      count(*) FILTER (WHERE rolcanlogin OR rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls) || '|' ||
      (SELECT count(*) FROM pg_auth_members m WHERE m.member IN (SELECT oid FROM pg_roles WHERE rolname IN (${roleList})) OR m.roleid IN (SELECT oid FROM pg_roles WHERE rolname IN (${roleList}))) || '|' ||
      (SELECT count(*) FROM pg_class c WHERE c.relowner IN (SELECT oid FROM pg_roles WHERE rolname IN (${roleList})))
    FROM pg_roles WHERE rolname IN (${roleList})
  `)
  if (summary !== "4|0|0|0") throw new Error(`D3_BOOTSTRAP_ROLE_CONFLICT:${summary}`)

  const explicitGrantCount = scalar(`
    WITH role_oids AS (SELECT oid FROM pg_roles WHERE rolname IN (${roleList})), grants AS (
      SELECT x.grantee FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) x WHERE n.nspacl IS NOT NULL
      UNION ALL SELECT x.grantee FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) x WHERE c.relacl IS NOT NULL
      UNION ALL SELECT x.grantee FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) x WHERE p.proacl IS NOT NULL
    ) SELECT count(*) FROM grants WHERE grantee IN (SELECT oid FROM role_oids)
  `)
  if (explicitGrantCount !== "0") throw new Error(`D3_BOOTSTRAP_ROLE_UNEXPECTED_GRANTS:${explicitGrantCount}`)
}

async function main() {
  const mode = process.argv[2] as Mode | undefined
  if (mode !== "apply" && mode !== "inspect") throw new Error("Usage: runD3AdministrativeRoleMigration.ts <apply|inspect>")

  const target = await requireIntegratedBackfillTarget({
    d2Url: process.env.D2_CANONICAL_POSTGRES_URL,
    d3Url: process.env.D3_POPULATION_POSTGRES_URL,
    objectRoot: process.env.D3_BACKFILL_OBJECT_ROOT,
    repositoryRoot: process.cwd(),
  })
  if (target.host !== "localhost" || target.port !== "55432" || target.database !== DATABASE) throw new Error("D3_ADMIN_TARGET_REJECTED")
  if (scalar("SELECT current_database() || '|' || current_user") !== `${DATABASE}|${ADMIN_ROLE}`) throw new Error("D3_ADMIN_IDENTITY_REJECTED")

  const migrationPath = path.join(process.cwd(), "lib", "data-platform", "population", "postgres", "migrations", MIGRATION_FILENAME)
  const migrationSql = await readFile(migrationPath, "utf8")
  const checksum = createHash("sha256").update(migrationSql).digest("hex")
  if (checksum !== EXPECTED_CHECKSUM) throw new Error("D3_ADMIN_MIGRATION_CHECKSUM_MISMATCH")
  if (scalar("SELECT count(*) FROM control.migration_ledger") !== "4") throw new Error("D2_LEDGER_BASELINE_INVALID")
  const d3Baseline = scalar("SELECT string_agg(migration_id || ':' || migration_checksum, ',' ORDER BY migration_id) FROM control.population_migration_ledger")
  if (d3Baseline !== `001:ce8d7f6a18221fb303a0d6cec5983d97bd59765ce5de2155634461ed6d8c2e67` && d3Baseline !== `001:ce8d7f6a18221fb303a0d6cec5983d97bd59765ce5de2155634461ed6d8c2e67,002:${EXPECTED_CHECKSUM}`) throw new Error("D3_LEDGER_BASELINE_INVALID")

  const existing = scalar(`SELECT COALESCE((SELECT migration_checksum FROM control.population_migration_ledger WHERE migration_id='${MIGRATION_ID}'),'')`)
  if (existing) {
    if (existing !== EXPECTED_CHECKSUM) throw new Error("D3_ADMIN_APPLIED_CHECKSUM_MISMATCH")
    console.log(JSON.stringify({ status: "SKIPPED", migrationId: MIGRATION_ID, filename: MIGRATION_FILENAME, checksum, database: target.database, administrator: ADMIN_ROLE }))
    return
  }
  if (mode === "inspect") throw new Error("D3_ADMIN_MIGRATION_NOT_APPLIED")

  validateBootstrapRoles()
  const transaction = `\\set ON_ERROR_STOP on\nBEGIN;\n${migrationSql}\nINSERT INTO control.population_migration_ledger(migration_id,migration_checksum,applied_at,applied_by) VALUES ('${MIGRATION_ID}','${EXPECTED_CHECKSUM}',now(),'${APPLIED_BY}');\nCOMMIT;\n`
  psql(transaction)

  const applied = scalar(`SELECT migration_checksum || '|' || applied_by FROM control.population_migration_ledger WHERE migration_id='${MIGRATION_ID}'`)
  if (applied !== `${EXPECTED_CHECKSUM}|${APPLIED_BY}`) throw new Error("D3_ADMIN_LEDGER_VERIFICATION_FAILED")
  const d3Owner = scalar("SELECT rolsuper || '|' || rolcreaterole || '|' || rolcreatedb || '|' || rolreplication || '|' || rolbypassrls FROM pg_roles WHERE rolname='qt_d3_backfill_owner'")
  if (d3Owner !== "false|false|false|false|false") throw new Error(`D3_OWNER_PRIVILEGE_ESCALATION:${d3Owner}`)

  console.log(JSON.stringify({ status: "APPLIED", migrationId: MIGRATION_ID, filename: MIGRATION_FILENAME, checksum, database: target.database, administrator: ADMIN_ROLE, appliedBy: APPLIED_BY }))
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" }))
  process.exitCode = 1
})
