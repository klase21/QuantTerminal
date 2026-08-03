import assert from "node:assert/strict"

import { resolveGreenCleanRetainedRawSourceUrl } from "@/lib/data-platform/mvp-refresh/greenCleanBootstrapRuntime"
import { requireGreenCleanRebuildDatabaseSet } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"
import { selectSingleCleanRebuildRetainedRawRow } from "@/lib/data-platform/mvp-refresh/liveResumeLocalBootstrap"

function main(): void {
  assert.equal(selectSingleCleanRebuildRetainedRawRow([]), null)
  const exact = Object.freeze({ object_id: "raw_exact", dataset_id: "ohlcv" })
  assert.equal(selectSingleCleanRebuildRetainedRawRow([exact]), exact)
  assert.throws(
    () => selectSingleCleanRebuildRetainedRawRow([exact, { object_id: "raw_conflict", dataset_id: "ohlcv" }]),
    /LIVE_CLEAN_REBUILD_RETAINED_RAW_AMBIGUOUS/,
  )
  const databaseSet = requireGreenCleanRebuildDatabaseSet({
    MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
    MVP_GREEN_CLEAN_REBUILD_ID: "dispose20260731a",
    MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: "quantterminal_green_clean_dispose20260731a_backfill",
    MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: "quantterminal_green_clean_dispose20260731a_d4",
    MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: "quantterminal_green_clean_dispose20260731a_refresh",
    MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: "quantterminal_green_clean_dispose20260731a_serving",
  })!
  const target = new URL(resolveGreenCleanRetainedRawSourceUrl("postgresql://qt_d2_backfill_owner:redacted@127.0.0.1:55432/quantterminal_green_clean_dispose20260731a_backfill", databaseSet))
  assert.equal(target.pathname, "/quantterminal_backfill")
  assert.equal(target.username, "qt_d2_backfill_owner")
  assert.throws(() => resolveGreenCleanRetainedRawSourceUrl("postgresql://qt_d2_backfill_owner:redacted@production.example/quantterminal_green_clean_dispose20260731a_backfill", databaseSet), /TARGET_UNSAFE/)
  console.log("GREEN_CLEAN_RETAINED_RAW_REUSE_UNIT_SUITE_PASS")
}

try { main() } catch (error) {
  console.error(error instanceof Error ? error.message : "GREEN_CLEAN_RETAINED_RAW_REUSE_UNIT_SUITE_FAILED")
  process.exitCode = 1
}
