import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type { MvpRefreshPostgresClient } from "./client"
import { MVP_REFRESH_MIGRATION_ORDER } from "./migrationOrder"

export interface MvpRefreshMigrationArtifact { readonly migrationId: string; readonly filename: string; readonly checksum: string; readonly sql: string }
export type MvpRefreshMigrationResult = { readonly status: "APPLIED" | "SKIPPED" | "FAILED"; readonly migrationId: string; readonly checksum: string; readonly reason?: string }

export function verifyAppliedMvpRefreshMigrationChecksum(appliedChecksum: string, artifactChecksum: string): void {
  if (appliedChecksum !== artifactChecksum) throw new Error("APPLIED_MVP_REFRESH_MIGRATION_CHECKSUM_MISMATCH")
}

export async function discoverMvpRefreshMigrations(root = path.join(process.cwd(), "lib", "data-platform", "mvp-refresh", "migrations")): Promise<readonly MvpRefreshMigrationArtifact[]> {
  const artifacts: MvpRefreshMigrationArtifact[] = []
  for (const filename of MVP_REFRESH_MIGRATION_ORDER) {
    const sql = await readFile(path.join(root, filename), "utf8")
    const migrationId = /^(\d{3})_/.exec(filename)?.[1]
    if (!migrationId) throw new Error("MVP_REFRESH_MIGRATION_FILENAME_INVALID")
    artifacts.push(Object.freeze({ migrationId, filename, checksum: createHash("sha256").update(sql).digest("hex"), sql }))
  }
  return Object.freeze(artifacts)
}

export class MvpRefreshMigrationRunner {
  constructor(private readonly client: MvpRefreshPostgresClient) {}
  async apply(appliedBy: string): Promise<readonly MvpRefreshMigrationResult[]> {
    await this.client.sql.unsafe("CREATE SCHEMA IF NOT EXISTS refresh_control")
    await this.client.sql.unsafe("CREATE TABLE IF NOT EXISTS refresh_control.migration_ledger (migration_id text PRIMARY KEY,migration_filename text NOT NULL UNIQUE,migration_checksum text NOT NULL CHECK (migration_checksum ~ '^[0-9a-f]{64}$'),applied_at timestamptz NOT NULL,applied_by text NOT NULL)")
    const results: MvpRefreshMigrationResult[] = []
    for (const artifact of await discoverMvpRefreshMigrations()) {
      try {
        const existing = await this.client.sql.unsafe<Array<{ migration_checksum: string }>>("SELECT migration_checksum FROM refresh_control.migration_ledger WHERE migration_id=$1", [artifact.migrationId])
        if (existing[0]) {
          verifyAppliedMvpRefreshMigrationChecksum(existing[0].migration_checksum, artifact.checksum)
          results.push({ status: "SKIPPED", migrationId: artifact.migrationId, checksum: artifact.checksum })
          continue
        }
        await this.client.transaction(async (sql) => {
          await sql.unsafe(artifact.sql)
          await sql.unsafe("INSERT INTO refresh_control.migration_ledger VALUES($1,$2,$3,now(),$4)", [artifact.migrationId, artifact.filename, artifact.checksum, appliedBy])
        })
        results.push({ status: "APPLIED", migrationId: artifact.migrationId, checksum: artifact.checksum })
      } catch (error) {
        results.push({ status: "FAILED", migrationId: artifact.migrationId, checksum: artifact.checksum, reason: error instanceof Error ? error.message : "MVP_REFRESH_MIGRATION_FAILED" })
        break
      }
    }
    return Object.freeze(results)
  }
}
