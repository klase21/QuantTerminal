import assert from "node:assert/strict"

import { verifyAppliedMvpRefreshMigrationChecksum } from "@/lib/data-platform/mvp-refresh"
import {
  assertMvpRefreshDisposableConnectedIdentity,
  inspectMvpRefreshCertificationDatabase,
  MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE,
  MVP_REFRESH_CERTIFICATION_DATABASE_NAME,
} from "./disposableCertificationDatabase"

const VALID_DATABASE = "quantterminal_mvp_refresh_dbprovider_cert_a1"
const localUrl = (database: string) => `postgresql://qt_d2_owner:must-never-escape@127.0.0.1:55432/${database}`
const inspect = (values: Record<string, string | undefined>) => inspectMvpRefreshCertificationDatabase(values)

assert.deepEqual(inspect({}), {
  mode: "FIXED_FIXTURE",
  safe: true,
  databaseName: "quantterminal_mvp_refresh_isolated",
  hostClassification: "LOCAL_DOCKER",
  port: null,
  roleName: "qt_d2_owner",
  reasons: [],
})

for (const values of [
  { [MVP_REFRESH_CERTIFICATION_DATABASE_NAME]: VALID_DATABASE, MVP_REFRESH_ISOLATED_POSTGRES_URL: localUrl(VALID_DATABASE) },
  { [MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE]: "true", MVP_REFRESH_ISOLATED_POSTGRES_URL: localUrl(VALID_DATABASE) },
]) assert.equal(inspect(values).safe, false)

const valid = inspect({
  [MVP_REFRESH_CERTIFICATION_DATABASE_NAME]: VALID_DATABASE,
  [MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE]: "true",
  MVP_REFRESH_ISOLATED_POSTGRES_URL: localUrl(VALID_DATABASE),
})
assert.equal(valid.safe, true)
assert.equal(valid.hostClassification, "LOCAL_DOCKER")
assert.equal(valid.roleName, "qt_d2_owner")
assert.equal(valid.port, 55432)

for (const databaseName of [
  "wrong_prefix",
  "quantterminal_mvp_refresh_isolated",
  "postgres",
  "template0",
  "template1",
  "neondb",
  "mvp_release_20260721_9c177d6309",
  "quantterminal-mvp-refresh-dbprovider-cert-invalid",
]) {
  assert.equal(inspect({
    [MVP_REFRESH_CERTIFICATION_DATABASE_NAME]: databaseName,
    [MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE]: "true",
    MVP_REFRESH_ISOLATED_POSTGRES_URL: localUrl(databaseName),
  }).safe, false)
}

assert.equal(inspect({
  [MVP_REFRESH_CERTIFICATION_DATABASE_NAME]: VALID_DATABASE,
  [MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE]: "true",
  MVP_REFRESH_ISOLATED_POSTGRES_URL: localUrl("quantterminal_mvp_refresh_dbprovider_cert_other"),
}).safe, false)
assert.equal(inspect({
  [MVP_REFRESH_CERTIFICATION_DATABASE_NAME]: VALID_DATABASE,
  [MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE]: "true",
  MVP_REFRESH_ISOLATED_POSTGRES_URL: localUrl(VALID_DATABASE).replace("127.0.0.1", "remote.example"),
}).safe, false)

assert.doesNotThrow(() => assertMvpRefreshDisposableConnectedIdentity(VALID_DATABASE, {
  database: VALID_DATABASE,
  role: "qt_d2_owner",
  version: 160_000,
}))
assert.throws(
  () => assertMvpRefreshDisposableConnectedIdentity(VALID_DATABASE, {
    database: "quantterminal_mvp_refresh_dbprovider_cert_other",
    role: "qt_d2_owner",
    version: 160_000,
  }),
  /MVP_REFRESH_DISPOSABLE_CONNECTED_IDENTITY_MISMATCH/,
)

const unsafe = inspect({
  [MVP_REFRESH_CERTIFICATION_DATABASE_NAME]: VALID_DATABASE,
  [MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE]: "true",
  MVP_REFRESH_ISOLATED_POSTGRES_URL: "postgresql://qt_d2_owner:must-never-escape@remote.example:5432/wrong",
})
assert.equal(JSON.stringify(unsafe).includes("must-never-escape"), false)
assert.throws(
  () => verifyAppliedMvpRefreshMigrationChecksum("a".repeat(64), "b".repeat(64)),
  /APPLIED_MVP_REFRESH_MIGRATION_CHECKSUM_MISMATCH/,
)

console.log(JSON.stringify({
  status: "PASS",
  fixedFixtureDefault: "PASS",
  explicitOptIn: "PASS",
  disposableNameGuard: "PASS",
  localHostGuard: "PASS",
  connectionDatabaseBinding: "PASS",
  connectedDatabaseVerification: "PASS",
  secretRedaction: "PASS",
  migrationChecksumValidation: "UNCHANGED",
}, null, 2))
