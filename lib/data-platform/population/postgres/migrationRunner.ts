import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { D3_POPULATION_MIGRATION_ORDER } from "./schema"
import type { D3PostgresClient } from "./client"

export interface D3MigrationArtifact { readonly migrationId: string; readonly filename: string; readonly checksum: string; readonly sql: string }
export type D3MigrationResult = { readonly status: "APPLIED" | "SKIPPED" | "FAILED"; readonly migrationId: string; readonly checksum: string; readonly reason?: string }
const PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/
export const D3_MIGRATION_ROOT = path.join(process.cwd(), "lib", "data-platform", "population", "postgres", "migrations")

export function validateD3MigrationNames(names: readonly string[]): readonly string[] {
  const errors: string[] = []; const ids = new Set<string>()
  for (const name of names) { const match = PATTERN.exec(name); if (!match) { errors.push(`MALFORMED:${name}`); continue }; if (ids.has(match[1])) errors.push(`DUPLICATE:${match[1]}`); ids.add(match[1]) }
  if ([...names].sort().join("|") !== names.join("|")) errors.push("NON_DETERMINISTIC_ORDER")
  return errors
}

export async function discoverD3Migrations(root = D3_MIGRATION_ROOT): Promise<readonly D3MigrationArtifact[]> {
  const errors = validateD3MigrationNames(D3_POPULATION_MIGRATION_ORDER); if (errors.length) throw new Error(errors.join(","))
  return Promise.all(D3_POPULATION_MIGRATION_ORDER.map(async (filename) => { const sql = await readFile(path.join(root, filename), "utf8"); const id = PATTERN.exec(filename)![1]; return Object.freeze({ migrationId: id, filename, checksum: createHash("sha256").update(sql).digest("hex"), sql }) }))
}

async function requireD2Dependency(client: D3PostgresClient): Promise<void> {
  const rows = await client.sql<{ readonly commits: string | null; readonly raw: string | null }[]>`SELECT to_regclass('control.canonical_commits')::text commits,to_regclass('raw.objects')::text raw`
  if (!rows[0]?.commits || !rows[0]?.raw) throw new Error("D2_SCHEMA_DEPENDENCY_MISSING")
}

export async function applyD3Migrations(client: D3PostgresClient, appliedBy: string): Promise<readonly D3MigrationResult[]> {
  if (client.roleIntent !== "MIGRATION_OWNER" || !appliedBy.trim()) throw new Error("D3 migrations require migration owner and audit identity")
  await requireD2Dependency(client)
  const artifacts = await discoverD3Migrations(); const results: D3MigrationResult[] = []
  for (const artifact of artifacts) {
    try {
      const ledger = await client.sql<{ readonly checksum: string }[]>`SELECT migration_checksum checksum FROM control.population_migration_ledger WHERE migration_id=${artifact.migrationId}`.catch(() => [])
      if (ledger[0]) { if (ledger[0].checksum !== artifact.checksum) throw new Error("APPLIED_D3_MIGRATION_CHECKSUM_MISMATCH"); results.push({ status: "SKIPPED", migrationId: artifact.migrationId, checksum: artifact.checksum }); continue }
      await client.transaction(async (sql) => { await sql.unsafe(artifact.sql); await sql`INSERT INTO control.population_migration_ledger(migration_id,migration_checksum,applied_at,applied_by) VALUES(${artifact.migrationId},${artifact.checksum},now(),${appliedBy})` })
      results.push({ status: "APPLIED", migrationId: artifact.migrationId, checksum: artifact.checksum })
    } catch (cause) { results.push({ status: "FAILED", migrationId: artifact.migrationId, checksum: artifact.checksum, reason: cause instanceof Error ? cause.message : "UNKNOWN" }); break }
  }
  return results
}
