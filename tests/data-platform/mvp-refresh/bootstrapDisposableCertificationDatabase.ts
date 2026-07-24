import {
  discoverMvpRefreshMigrations,
  MvpRefreshMigrationRunner,
  verifyAppliedMvpRefreshMigrationChecksum,
} from "@/lib/data-platform/mvp-refresh"
import {
  createMvpRefreshCertificationClientFromEnvironment,
  inspectMvpRefreshCertificationDatabase,
} from "./disposableCertificationDatabase"

async function main(): Promise<void> {
  const inspection = inspectMvpRefreshCertificationDatabase(process.env)
  if (!inspection.safe || inspection.mode !== "DISPOSABLE_CERTIFICATION") {
    throw new Error("MVP_REFRESH_DISPOSABLE_CERTIFICATION_REQUIRED")
  }
  const client = createMvpRefreshCertificationClientFromEnvironment()
  try {
    await client.verify()
    const migrations = await new MvpRefreshMigrationRunner(client).apply("mvp-refresh-disposable-certification-bootstrap")
    if (migrations.some((migration) => migration.status === "FAILED")) {
      throw new Error("MVP_REFRESH_DISPOSABLE_MIGRATION_BOOTSTRAP_FAILED")
    }
    const artifacts = await discoverMvpRefreshMigrations()
    const ledger = await client.sql.unsafe<Array<{ migration_id: string; migration_checksum: string }>>(
      "SELECT migration_id,migration_checksum FROM refresh_control.migration_ledger ORDER BY migration_id",
    )
    for (const artifact of artifacts) {
      verifyAppliedMvpRefreshMigrationChecksum(
        ledger.find((entry) => entry.migration_id === artifact.migrationId)?.migration_checksum ?? "",
        artifact.checksum,
      )
    }
    console.log(JSON.stringify({
      status: "PASS",
      hostClassification: inspection.hostClassification,
      port: inspection.port,
      roleName: inspection.roleName,
      databaseName: inspection.databaseName,
      fixedFixtureSelected: false,
      explicitDisposableOptIn: true,
      migration001Checksum: artifacts.find((artifact) => artifact.migrationId === "001")?.checksum ?? null,
    }, null, 2))
  } finally {
    await client.shutdown()
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(error instanceof Error ? error.message : "MVP_REFRESH_DISPOSABLE_BOOTSTRAP_FAILED")
  process.exitCode = 1
})
