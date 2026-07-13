import {
  applyApprovedMigrations,
  createDurableCanonicalPostgresClientFromEnvironment,
  discoverApprovedMigrations,
} from "@/lib/data-platform/persistence/postgres"
import { requireIntegratedBackfillTarget } from "@/lib/data-platform/population/backfill"
import {
  applyD3Migrations,
  createDurableD3PostgresClientFromEnvironment,
  discoverD3Migrations,
} from "@/lib/data-platform/population/postgres"

type Mode = "d2" | "d3"

async function main() {
  const mode = process.argv[2] as Mode | undefined
  if (mode !== "d2" && mode !== "d3") throw new Error("Usage: runD3IntegratedMigrations.ts <d2|d3>")

  const target = await requireIntegratedBackfillTarget({
    d2Url: process.env.D2_CANONICAL_POSTGRES_URL,
    d3Url: process.env.D3_POPULATION_POSTGRES_URL,
    objectRoot: process.env.D3_BACKFILL_OBJECT_ROOT,
    repositoryRoot: process.cwd(),
  })
  console.log(JSON.stringify({ profile: target.profile, host: target.host, port: target.port, database: target.database, d2Role: target.d2Role, d3Role: target.d3Role }))

  if (mode === "d2") {
    const expected = await discoverApprovedMigrations()
    const client = createDurableCanonicalPostgresClientFromEnvironment({
      roleIntent: "MIGRATION_OWNER",
      maxConnections: 1,
      connectTimeoutSeconds: 10,
      idleTimeoutSeconds: 30,
      applicationName: "d3-integrated-d2-migration",
      targetPurpose: "INTEGRATED_BACKFILL",
    })
    try {
      const first = await applyApprovedMigrations(client, "d3-phase3-integrated-d2")
      const second = first.every((result) => result.status !== "FAILED")
        ? await applyApprovedMigrations(client, "d3-phase3-integrated-d2-rerun")
        : []
      console.log(JSON.stringify({ mode, expected: expected.map(({ migrationId, filename, checksum }) => ({ migrationId, filename, checksum })), first, second }))
      if (first.some((result) => result.status === "FAILED") || second.some((result) => result.status !== "SKIPPED")) process.exitCode = 1
    } finally {
      await client.shutdown()
    }
    return
  }

  const expected = await discoverD3Migrations()
  const client = createDurableD3PostgresClientFromEnvironment({
    roleIntent: "MIGRATION_OWNER",
    maxConnections: 1,
    applicationName: "d3-integrated-migration",
    targetPurpose: "INTEGRATED_BACKFILL",
  })
  try {
    const first = await applyD3Migrations(client, "d3-phase3-integrated-d3")
    const second = first.every((result) => result.status !== "FAILED")
      ? await applyD3Migrations(client, "d3-phase3-integrated-d3-rerun")
      : []
    console.log(JSON.stringify({ mode, expected: expected.map(({ migrationId, filename, checksum }) => ({ migrationId, filename, checksum })), first, second }))
    if (first.some((result) => result.status === "FAILED") || second.some((result) => result.status !== "SKIPPED")) process.exitCode = 1
  } finally {
    await client.shutdown()
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" }))
  process.exitCode = 1
})
