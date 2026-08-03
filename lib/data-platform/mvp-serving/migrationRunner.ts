import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type postgres from "postgres"
import type { MvpServingRoleIntent } from "./safety"
import { MVP_SERVING_CERTIFIED_LEGACY_CHECKSUMS, MVP_SERVING_MIGRATION_ORDER } from "./migrationOrder"

export interface MvpServingMigrationArtifact { readonly migrationId: string; readonly filename: string; readonly checksum: string; readonly sql: string }
export type MvpServingMigrationResult = { readonly status: "APPLIED" | "SKIPPED" | "FAILED"; readonly migrationId: string; readonly checksum: string; readonly reason?: string }

export interface MvpServingMigrationClient {
  readonly roleIntent: MvpServingRoleIntent
  transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T>
}

export async function discoverMvpServingMigrations(root = path.join(process.cwd(), "lib", "data-platform", "mvp-serving", "migrations")): Promise<readonly MvpServingMigrationArtifact[]> {
  const artifacts: MvpServingMigrationArtifact[] = []
  for (const filename of MVP_SERVING_MIGRATION_ORDER) {
    const sql = (await readFile(path.join(root, filename), "utf8")).replace(/\r\n/g, "\n"), migrationId = /^(\d{3})_/.exec(filename)?.[1]
    if (!migrationId) throw new Error("MVP_SERVING_MIGRATION_FILENAME_INVALID")
    artifacts.push(Object.freeze({ migrationId, filename, checksum: createHash("sha256").update(sql).digest("hex"), sql }))
  }
  return Object.freeze(artifacts)
}

export class MvpServingMigrationRunner {
  constructor(private readonly client: MvpServingMigrationClient) { if (client.roleIntent !== "MIGRATION_OWNER") throw new Error("MVP_SERVING_MIGRATION_OWNER_REQUIRED") }
  async apply(appliedBy: string): Promise<readonly MvpServingMigrationResult[]> {
    await this.client.transaction(async (sql) => {
      await sql.unsafe("CREATE SCHEMA IF NOT EXISTS serving_control")
      await sql.unsafe("CREATE TABLE IF NOT EXISTS serving_control.migration_ledger (migration_id text PRIMARY KEY,migration_filename text NOT NULL UNIQUE,migration_checksum text NOT NULL CHECK (migration_checksum ~ '^[0-9a-f]{64}$'),applied_at timestamptz NOT NULL,applied_by text NOT NULL)")
    })
    const results: MvpServingMigrationResult[] = []
    for (const artifact of await discoverMvpServingMigrations()) {
      try {
        const status = await this.client.transaction(async (sql) => {
          const existing = await sql.unsafe<Array<{ migration_checksum: string }>>("SELECT migration_checksum FROM serving_control.migration_ledger WHERE migration_id=$1", [artifact.migrationId])
          if (existing[0]) {
            const legacy = MVP_SERVING_CERTIFIED_LEGACY_CHECKSUMS[artifact.migrationId]
            const accepted = existing[0].migration_checksum === artifact.checksum || (legacy?.repositoryChecksum === artifact.checksum && legacy.appliedChecksums.includes(existing[0].migration_checksum))
            if (!accepted) throw new Error("APPLIED_MVP_SERVING_MIGRATION_CHECKSUM_MISMATCH")
            return "SKIPPED" as const
          }
          await sql.unsafe(artifact.sql)
          await sql.unsafe("INSERT INTO serving_control.migration_ledger VALUES($1,$2,$3,now(),$4)", [artifact.migrationId, artifact.filename, artifact.checksum, appliedBy])
          return "APPLIED" as const
        })
        results.push({ status, migrationId: artifact.migrationId, checksum: artifact.checksum })
      } catch (error) { results.push({ status: "FAILED", migrationId: artifact.migrationId, checksum: artifact.checksum, reason: error instanceof Error ? error.message : "MVP_SERVING_MIGRATION_FAILED" }); break }
    }
    return Object.freeze(results)
  }
}
