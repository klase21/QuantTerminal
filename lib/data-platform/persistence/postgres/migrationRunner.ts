import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type postgres from "postgres"

import type { IsolatedPostgresClient } from "./client"
import { D2_MIGRATION_ORDER } from "./schema"

export interface MigrationArtifact { readonly migrationId: string; readonly filename: string; readonly checksum: string; readonly sql: string }
export type MigrationExecutionResult =
  | { readonly status: "APPLIED"; readonly migrationId: string; readonly checksum: string }
  | { readonly status: "SKIPPED"; readonly migrationId: string; readonly checksum: string }
  | { readonly status: "FAILED"; readonly migrationId: string; readonly checksum: string; readonly reason: string }

const MIGRATION_PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/
export const DEFAULT_MIGRATION_ROOT = path.join(process.cwd(), "lib", "data-platform", "persistence", "postgres", "migrations")

export function validateMigrationFilenames(filenames: readonly string[]): readonly string[] {
  const errors: string[] = []
  const numbers = new Set<string>()
  for (const filename of filenames) {
    const match = MIGRATION_PATTERN.exec(filename)
    if (!match) { errors.push(`MALFORMED_MIGRATION:${filename}`); continue }
    if (numbers.has(match[1])) errors.push(`DUPLICATE_MIGRATION_NUMBER:${match[1]}`)
    numbers.add(match[1])
  }
  if ([...filenames].sort().join("|") !== filenames.join("|")) errors.push("MIGRATION_ORDER_NOT_DETERMINISTIC")
  return Object.freeze(errors)
}

export async function discoverApprovedMigrations(root = DEFAULT_MIGRATION_ROOT): Promise<readonly MigrationArtifact[]> {
  const filenameErrors = validateMigrationFilenames(D2_MIGRATION_ORDER)
  if (filenameErrors.length) throw new Error(filenameErrors.join(","))
  const numbers = new Set<string>()
  const artifacts: MigrationArtifact[] = []
  for (const filename of D2_MIGRATION_ORDER) {
    const match = MIGRATION_PATTERN.exec(filename)
    if (!match || numbers.has(match[1])) throw new Error(`Malformed or duplicate approved migration: ${filename}`)
    numbers.add(match[1])
    const sql = await readFile(path.join(root, filename), "utf8")
    if (!sql.trim()) throw new Error(`Approved migration is empty: ${filename}`)
    artifacts.push(Object.freeze({ migrationId: match[1], filename, checksum: createHash("sha256").update(sql).digest("hex"), sql }))
  }
  return Object.freeze(artifacts)
}

async function ledgerExists(sql: postgres.Sql): Promise<boolean> {
  const rows = await sql<{ readonly table_name: string | null }[]>`SELECT to_regclass('control.migration_ledger')::text AS table_name`
  return rows[0]?.table_name === "control.migration_ledger"
}

async function appliedChecksum(sql: postgres.Sql | postgres.TransactionSql, migrationId: string): Promise<string | null> {
  const rows = await sql<{ readonly migration_checksum: string }[]>`SELECT migration_checksum FROM control.migration_ledger WHERE migration_id = ${migrationId}`
  return rows[0]?.migration_checksum ?? null
}

export async function applyApprovedMigrations(client: IsolatedPostgresClient, appliedBy: string): Promise<readonly MigrationExecutionResult[]> {
  if (client.roleIntent !== "MIGRATION_OWNER") throw new Error("Migrations require MIGRATION_OWNER intent")
  if (!appliedBy.trim()) throw new Error("Migration audit identity is required")
  const migrations = await discoverApprovedMigrations()
  const results: MigrationExecutionResult[] = []
  let hasLedger = await ledgerExists(client.sql)

  for (const migration of migrations) {
    try {
      if (hasLedger) {
        const existing = await appliedChecksum(client.sql, migration.migrationId)
        if (existing !== null) {
          if (existing !== migration.checksum) throw new Error("APPLIED_MIGRATION_CHECKSUM_MISMATCH")
          results.push({ status: "SKIPPED", migrationId: migration.migrationId, checksum: migration.checksum })
          continue
        }
      }
      await client.transaction(async (sql) => {
        await sql.unsafe(migration.sql)
        await sql`INSERT INTO control.migration_ledger (migration_id, migration_checksum, applied_at, applied_by)
          VALUES (${migration.migrationId}, ${migration.checksum}, now(), ${appliedBy})`
      })
      hasLedger = true
      results.push({ status: "APPLIED", migrationId: migration.migrationId, checksum: migration.checksum })
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "UNKNOWN_MIGRATION_FAILURE"
      results.push({ status: "FAILED", migrationId: migration.migrationId, checksum: migration.checksum, reason })
      break
    }
  }
  return Object.freeze(results)
}
