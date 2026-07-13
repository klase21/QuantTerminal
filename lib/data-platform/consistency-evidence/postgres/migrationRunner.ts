import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { D4_MIGRATION_ORDER } from "./migrationOrder"
import { verifyD2Foundation } from "./dependencyBootstrap"
import type { ConsistencyPostgresRuntime } from "./client"

export interface D4MigrationArtifact { readonly migrationId: string; readonly filename: string; readonly checksum: string; readonly sql: string }
export type D4MigrationResult = { readonly status: "APPLIED" | "SKIPPED" | "FAILED"; readonly migrationId: string; readonly checksum: string; readonly reason?: string }
const PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/
export const D4_MIGRATION_ROOT = path.join(process.cwd(), "lib", "data-platform", "consistency-evidence", "postgres", "migrations")

export function validateD4MigrationNames(names: readonly string[]): readonly string[] {
  const errors: string[] = []; const ids = new Set<string>()
  for (const name of names) {
    const match = PATTERN.exec(name)
    if (!match) { errors.push("MALFORMED_MIGRATION:" + name); continue }
    if (ids.has(match[1])) errors.push("DUPLICATE_MIGRATION_NUMBER:" + match[1])
    ids.add(match[1])
  }
  if ([...names].sort().join("|") !== names.join("|")) errors.push("MIGRATION_ORDER_NOT_DETERMINISTIC")
  return Object.freeze(errors)
}

export async function discoverD4Migrations(root = D4_MIGRATION_ROOT): Promise<readonly D4MigrationArtifact[]> {
  const files = (await readdir(root)).filter((name) => name.endsWith(".sql")).sort()
  const errors = validateD4MigrationNames(files)
  if (errors.length) throw new Error(errors.join(","))
  if (files.join("|") !== D4_MIGRATION_ORDER.join("|")) throw new Error("UNAPPROVED_D4_MIGRATION_SET")
  const artifacts: D4MigrationArtifact[] = []
  for (const filename of files) {
    const sql = await readFile(path.join(root, filename), "utf8")
    if (!sql.trim()) throw new Error("EMPTY_D4_MIGRATION:" + filename)
    artifacts.push(Object.freeze({ migrationId: PATTERN.exec(filename)![1], filename, checksum: createHash("sha256").update(sql).digest("hex"), sql }))
  }
  return Object.freeze(artifacts)
}

export class ConsistencyMigrationRunner {
  constructor(private readonly runtime: ConsistencyPostgresRuntime, private readonly migrationRoot = D4_MIGRATION_ROOT) {}
  async apply(appliedBy: string): Promise<readonly D4MigrationResult[]> {
    if (this.runtime.roleIntent !== "MIGRATION_OWNER" || !appliedBy.trim()) throw new Error("D4_MIGRATION_AUTHORIZATION_REQUIRED")
    if (!(await verifyD2Foundation(this.runtime))) throw new Error("D2_SCHEMA_DEPENDENCY_MISSING")
    const artifacts = await discoverD4Migrations(this.migrationRoot)
    await this.runtime.transaction(async (sql) => {
      await sql.unsafe("CREATE SCHEMA IF NOT EXISTS d4_control")
      await sql.unsafe("CREATE TABLE IF NOT EXISTS d4_control.migration_ledger (migration_id text PRIMARY KEY, migration_filename text NOT NULL UNIQUE, migration_checksum text NOT NULL CHECK (migration_checksum ~ '^[0-9a-f]{64}$'), applied_at timestamptz NOT NULL, applied_by text NOT NULL)")
    })
    const results: D4MigrationResult[] = []
    for (const artifact of artifacts) {
      try {
        const existing = await this.runtime.sql.unsafe<{ readonly migration_checksum: string }[]>("SELECT migration_checksum FROM d4_control.migration_ledger WHERE migration_id=$1", [artifact.migrationId])
        if (existing[0]) {
          if (existing[0].migration_checksum !== artifact.checksum) throw new Error("APPLIED_D4_MIGRATION_CHECKSUM_MISMATCH")
          results.push({ status: "SKIPPED", migrationId: artifact.migrationId, checksum: artifact.checksum })
          continue
        }
        await this.runtime.transaction(async (sql) => {
          await sql.unsafe(artifact.sql)
          await sql.unsafe("INSERT INTO d4_control.migration_ledger(migration_id,migration_filename,migration_checksum,applied_at,applied_by) VALUES($1,$2,$3,now(),$4)", [artifact.migrationId, artifact.filename, artifact.checksum, appliedBy])
        })
        results.push({ status: "APPLIED", migrationId: artifact.migrationId, checksum: artifact.checksum })
      } catch (cause) {
        results.push({ status: "FAILED", migrationId: artifact.migrationId, checksum: artifact.checksum, reason: cause instanceof Error ? cause.message : "UNKNOWN_D4_MIGRATION_FAILURE" })
        break
      }
    }
    return Object.freeze(results)
  }
}
