import assert from "node:assert/strict"
import { inspectD4RuntimeTarget } from "@/lib/data-platform/consistency-evidence/postgres/safety"
import { inspectDurableCanonicalTarget } from "@/lib/data-platform/persistence/postgres/durableTargetSafety"
import { inspectDurableD3Target } from "@/lib/data-platform/population/postgres/safety"
import { inspectGreenCleanRebuildSafety } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"
import { inspectMvpRefreshTarget } from "@/lib/data-platform/mvp-refresh/safety"
import { inspectMvpServingIsolatedTarget } from "@/lib/data-platform/mvp-serving/safety"

const id = "localtest01"
const prefix = `quantterminal_green_clean_${id}`
const environment = {
  MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
  MVP_GREEN_CLEAN_REBUILD_ID: id,
  MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: `${prefix}_backfill`,
  MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: `${prefix}_d4`,
  MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: `${prefix}_refresh`,
  MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: `${prefix}_serving`,
} as const

const url = (role: string, database: string, host = "127.0.0.1") => `postgresql://${role}:test-only@${host}:55432/${database}`
const inspection = inspectGreenCleanRebuildSafety(environment)
assert.equal(inspection.enabled, true)
assert.equal(inspection.reasons.length, 0)
assert.equal(inspection.databaseSet?.backfillDatabase, `${prefix}_backfill`)
assert.equal(inspectDurableCanonicalTarget(url("qt_d2_backfill_owner", `${prefix}_backfill`), "INTEGRATED_BACKFILL", environment).safe, true)
assert.equal(inspectDurableD3Target(url("qt_d3_backfill_owner", `${prefix}_backfill`), "INTEGRATED_BACKFILL", environment).safe, true)
assert.equal(inspectD4RuntimeTarget(url("qt_d2_owner", `${prefix}_d4`), { ...environment, D4_ISOLATED_POSTGRES_URL: url("qt_d2_owner", `${prefix}_d4`), D4_EXPECTED_DATABASE_NAME: `${prefix}_d4` }).safe, true)
assert.equal(inspectMvpRefreshTarget(url("qt_d2_owner", `${prefix}_refresh`), environment, `${prefix}_refresh`).safe, true)
assert.equal(inspectMvpServingIsolatedTarget(url("mvp_serving_publisher", `${prefix}_serving`), environment, { database: `${prefix}_serving`, role: "mvp_serving_publisher" }).safe, true)
assert.equal(inspectDurableCanonicalTarget(url("qt_d2_backfill_owner", `${prefix}_backfill`, "remote.example"), "INTEGRATED_BACKFILL", environment).safe, false)
assert.equal(inspectMvpRefreshTarget(url("wrong_role", `${prefix}_refresh`), environment, `${prefix}_refresh`).safe, false)
assert.equal(inspectMvpServingIsolatedTarget(url("mvp_serving_publisher", `${prefix}_refresh`), environment, { database: `${prefix}_serving`, role: "mvp_serving_publisher" }).safe, false)
const malformed = inspectGreenCleanRebuildSafety({ ...environment, MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: "arbitrary" })
assert.equal(malformed.databaseSet, null)
assert.ok(malformed.reasons.includes("MVP_GREEN_CLEAN_REBUILD_D4_DATABASE_MISMATCH"))
assert.equal(inspectDurableCanonicalTarget(url("qt_d2_backfill_owner", "quantterminal_backfill"), "INTEGRATED_BACKFILL", { MVP_GREEN_CLEAN_REBUILD_MODE: "wrong" }).safe, false)
assert.equal(inspectDurableCanonicalTarget(url("qt_d2_backfill_owner", "quantterminal_backfill"), "INTEGRATED_BACKFILL", {}).safe, true)
assert.equal(inspectMvpRefreshTarget(url("qt_d2_owner", "quantterminal_mvp_refresh_isolated"), {}, "quantterminal_mvp_refresh_isolated").safe, true)
assert.equal(inspectMvpServingIsolatedTarget(url("mvp_serving_publisher", "quantterminal_mvp_serving_isolated"), {}, { database: "quantterminal_mvp_serving_isolated", role: "mvp_serving_publisher" }).safe, true)
console.log(JSON.stringify({ status: "PASS", suite: "green-clean-rebuild-safety" }))
