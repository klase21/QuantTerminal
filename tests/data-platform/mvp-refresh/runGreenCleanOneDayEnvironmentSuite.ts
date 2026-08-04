import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { createGreenCleanRuntimeEnvironment } from "@/lib/data-platform/mvp-refresh/greenCleanBootstrapRuntime"

import {
  GREEN_CLEAN_RUN_ONE_DAY_REQUIRED_ENVIRONMENT_NAMES,
  inspectGreenCleanRunOneDayEnvironment,
  requireGreenCleanRunOneDayEnvironment,
} from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"

const id = "dispose20260731a"
const prefix = `quantterminal_green_clean_${id}`

function postgresUrl(role: string, database: string, host = "127.0.0.1", password = "test-password"): string {
  return ["postgresql://", encodeURIComponent(role), ":", encodeURIComponent(password), "@", host, ":55432/", database].join("")
}

function validEnvironment(): Record<string, string | undefined> {
  return {
    MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
    MVP_GREEN_CLEAN_REBUILD_ID: id,
    MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: `${prefix}_backfill`,
    MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: `${prefix}_d4`,
    MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: `${prefix}_refresh`,
    MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: `${prefix}_serving`,
    D2_CANONICAL_POSTGRES_URL: postgresUrl("qt_d2_backfill_owner", `${prefix}_backfill`),
    D3_POPULATION_POSTGRES_URL: postgresUrl("qt_d3_backfill_owner", `${prefix}_backfill`),
    D4_ISOLATED_POSTGRES_URL: postgresUrl("qt_d2_owner", `${prefix}_d4`),
    MVP_REFRESH_ISOLATED_POSTGRES_URL: postgresUrl("qt_d2_owner", `${prefix}_refresh`),
    MVP_SERVING_ISOLATED_POSTGRES_URL: postgresUrl("mvp_serving_publisher", `${prefix}_serving`),
    D3_BACKFILL_OBJECT_ROOT: "D:\\QuantTerminalData\\raw-artifacts",
    LOCALAPPDATA: "C:\\local-app-data",
  }
}

function validManagedEnvironment(): Record<string, string | undefined> {
  const environment = validEnvironment()
  const host = "ep-green-a3.us-east-2.aws.neon.tech"
  const remoteUrl = (role: string, database: string) => postgresUrl(role, database, host)
  return {
    ...environment,
    MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_MANAGED_POSTGRES_SET",
    MVP_GREEN_MANAGED_PROJECT_ID: "soft-cell-16396854",
    MVP_GREEN_MANAGED_PRODUCTION_BRANCH_ID: "br-production-a1",
    MVP_GREEN_MANAGED_ACTIVE_APPLICATION_BRANCH_ID: "br-application-a2",
    MVP_GREEN_MANAGED_BRANCH_ID: "br-green-a3",
    MVP_GREEN_MANAGED_ENDPOINT_ID: "ep-green-a3",
    MVP_GREEN_MANAGED_HOST: host,
    MVP_GREEN_MANAGED_TARGET_FINGERPRINT: "neon:soft-cell-16396854/br-green-a3/ep-green-a3",
    MVP_GREEN_CLEAN_RETAINED_SOURCE_POSTGRES_URL: postgresUrl("qt_d2_backfill_owner", "quantterminal_backfill"),
    D2_CANONICAL_POSTGRES_URL: remoteUrl("qt_d2_backfill_owner", `${prefix}_backfill`),
    D3_POPULATION_POSTGRES_URL: remoteUrl("qt_d3_backfill_owner", `${prefix}_backfill`),
    D4_ISOLATED_POSTGRES_URL: remoteUrl("qt_d2_owner", `${prefix}_d4`),
    MVP_REFRESH_ISOLATED_POSTGRES_URL: remoteUrl("qt_d2_owner", `${prefix}_refresh`),
    MVP_SERVING_ISOLATED_POSTGRES_URL: remoteUrl("mvp_serving_publisher", `${prefix}_serving`),
  }
}

function main(): void {
  const missing = inspectGreenCleanRunOneDayEnvironment({})
  assert.deepEqual(missing.missingVariables, GREEN_CLEAN_RUN_ONE_DAY_REQUIRED_ENVIRONMENT_NAMES)
  assert.equal(missing.passed, false)
  assert.throws(() => requireGreenCleanRunOneDayEnvironment({}), new RegExp(`MISSING=${GREEN_CLEAN_RUN_ONE_DAY_REQUIRED_ENVIRONMENT_NAMES.join(",")}`))

  const valid = validEnvironment()
  const ready = inspectGreenCleanRunOneDayEnvironment(valid)
  assert.equal(ready.passed, true)
  assert.equal(ready.bindings.length, 5)
  assert(ready.bindings.every((binding) => binding.passed))

  const managed = validManagedEnvironment()
  const managedReady = inspectGreenCleanRunOneDayEnvironment(managed)
  assert.equal(managedReady.passed, true)
  assert.equal(managedReady.bindings.length, 5)
  const managedRuntime = createGreenCleanRuntimeEnvironment(managed as NodeJS.ProcessEnv)
  assert.equal(managedRuntime.environment.D4_ISOLATED_POSTGRES_URL, managed.D4_ISOLATED_POSTGRES_URL)
  assert.equal(managedRuntime.environment.D4_EXPECTED_DATABASE_NAME, `${prefix}_d4`)
  assert.equal(managedRuntime.environment.MVP_SERVING_ISOLATED_POSTGRES_URL, managed.MVP_SERVING_ISOLATED_POSTGRES_URL)
  assert(managedRuntime.redactedTargets.every((target) => target.includes("MANAGED_REDACTED") && !target.includes("ep-green-a3")))
  assert(inspectGreenCleanRunOneDayEnvironment({ ...managed, D4_ISOLATED_POSTGRES_URL: postgresUrl("qt_d2_owner", `${prefix}_d4`, "other.neon.tech") }).reasons.includes("D4_ISOLATED_POSTGRES_URL_GREEN_HOST_MISMATCH"))
  assert(inspectGreenCleanRunOneDayEnvironment({ ...managed, D4_ISOLATED_POSTGRES_URL: postgresUrl("qt_d2_owner", `${prefix}_d4`) }).reasons.includes("D4_ISOLATED_POSTGRES_URL_LOOPBACK_TARGET"))
  assert(inspectGreenCleanRunOneDayEnvironment({ ...managed, DATABASE_URL: postgresUrl("production", "production", "ep-green-a3.us-east-2.aws.neon.tech") }).reasons.includes("DATABASE_URL_GREEN_TARGET_COLLISION"))
  assert(inspectGreenCleanRunOneDayEnvironment({ ...managed, MVP_GREEN_CLEAN_RETAINED_SOURCE_POSTGRES_URL: postgresUrl("qt_d2_backfill_owner", "not-canonical") }).reasons.includes("MVP_GREEN_CLEAN_RETAINED_SOURCE_POSTGRES_URL_DATABASE_MISMATCH"))
  const managedSecret = "managed-environment-suite-secret"
  let managedMessage = ""
  try { requireGreenCleanRunOneDayEnvironment({ ...managed, D4_ISOLATED_POSTGRES_URL: postgresUrl("qt_d2_owner", `${prefix}_d4`, "other.neon.tech", managedSecret) }) } catch (error) { managedMessage = error instanceof Error ? error.message : String(error) }
  assert(managedMessage)
  assert.doesNotMatch(managedMessage, new RegExp(managedSecret))
  assert.doesNotMatch(managedMessage, /postgresql:\/\//)

  const remote = { ...valid, D4_ISOLATED_POSTGRES_URL: postgresUrl("qt_d2_owner", `${prefix}_d4`, "remote.invalid") }
  assert(inspectGreenCleanRunOneDayEnvironment(remote).reasons.includes("D4_ISOLATED_POSTGRES_URL_NON_LOCAL_TARGET"))

  const wrongDatabase = { ...valid, MVP_REFRESH_ISOLATED_POSTGRES_URL: postgresUrl("qt_d2_owner", "not-approved") }
  assert(inspectGreenCleanRunOneDayEnvironment(wrongDatabase).reasons.includes("MVP_REFRESH_ISOLATED_POSTGRES_URL_DATABASE_MISMATCH"))

  const wrongRole = { ...valid, MVP_SERVING_ISOLATED_POSTGRES_URL: postgresUrl("qt_d2_owner", `${prefix}_serving`) }
  assert(inspectGreenCleanRunOneDayEnvironment(wrongRole).reasons.includes("MVP_SERVING_ISOLATED_POSTGRES_URL_ROLE_MISMATCH"))

  const secret = "environment-suite-secret"
  const secretEnvironment = { ...valid, MVP_REFRESH_ISOLATED_POSTGRES_URL: postgresUrl("qt_d2_owner", `${prefix}_refresh`, "remote.invalid", secret) }
  let message = ""
  try { requireGreenCleanRunOneDayEnvironment(secretEnvironment) } catch (error) { message = error instanceof Error ? error.message : String(error) }
  assert(message)
  assert.doesNotMatch(message, new RegExp(secret))
  assert.doesNotMatch(message, /postgresql:\/\//)

  const runtimeSource = readFileSync("lib/data-platform/mvp-refresh/greenCleanBootstrapRuntime.ts", "utf8")
  assert.match(runtimeSource, /const population = postgres\(required\(environment, "D3_POPULATION_POSTGRES_URL"\)/)
  assert.match(runtimeSource, /population\.unsafe<Array<\{ population_runs: number; population_units: number \}>>/)

  console.log(JSON.stringify({ status: "PASS", requiredVariables: GREEN_CLEAN_RUN_ONE_DAY_REQUIRED_ENVIRONMENT_NAMES.length, bindings: ready.bindings.length, databaseConnections: 0, databaseMutations: 0 }))
}

try { main() } catch (error) {
  console.error(error instanceof Error ? error.message : "GREEN_CLEAN_ONE_DAY_ENVIRONMENT_SUITE_FAILED")
  process.exitCode = 1
}
