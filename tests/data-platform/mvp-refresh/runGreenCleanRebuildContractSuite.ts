import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { inspectGreenCleanRebuildSafety } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"
import { classifyGreenCleanPreflight, createGreenCleanRebuildClosure, createGreenCleanTopology, preflightGreenCleanRebuild, type GreenCleanPreflightObservation } from "@/lib/data-platform/mvp-refresh/greenCleanRebuild"

const safety = inspectGreenCleanRebuildSafety({
  MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
  MVP_GREEN_CLEAN_REBUILD_ID: "green20260731",
  MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: "quantterminal_green_clean_green20260731_backfill",
  MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: "quantterminal_green_clean_green20260731_d4",
  MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: "quantterminal_green_clean_green20260731_refresh",
  MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: "quantterminal_green_clean_green20260731_serving",
})
assert(safety.databaseSet)
const topology = createGreenCleanTopology(safety.databaseSet)
const closure = createGreenCleanRebuildClosure({ items: [
  { itemId: "backfill.migration.001", database: "BACKFILL", kind: "MIGRATION", checksum: canonicalChecksum("backfill-migration"), parentItemIds: [] },
  { itemId: "d4.migration.001", database: "D4", kind: "MIGRATION", checksum: canonicalChecksum("d4-migration"), parentItemIds: [] },
  { itemId: "refresh.migration.001", database: "REFRESH", kind: "MIGRATION", checksum: canonicalChecksum("refresh-migration"), parentItemIds: [] },
  { itemId: "serving.migration.001", database: "SERVING", kind: "MIGRATION", checksum: canonicalChecksum("serving-migration"), parentItemIds: [] },
  { itemId: "serving.foreign_key.release", database: "SERVING", kind: "FOREIGN_KEY", checksum: canonicalChecksum("serving-fk"), parentItemIds: ["serving.migration.001", "d4.migration.001"] },
] })
const targets = Object.freeze({ BACKFILL: topology.databases.BACKFILL, D4: topology.databases.D4, REFRESH: topology.databases.REFRESH, SERVING: topology.databases.SERVING })
const productionTargets = Object.freeze({ BACKFILL: "postgresql://prod:never-leak@prod.internal:5432/backfill", D4: "postgresql://prod:never-leak@prod.internal:5432/d4", REFRESH: "postgresql://prod:never-leak@prod.internal:5432/refresh", SERVING: "postgresql://prod:never-leak@prod.internal:5432/serving" })
const observed = (items: Record<string, "MISSING" | "MATCH" | "CONFLICT">, changes: Partial<GreenCleanPreflightObservation> = {}): GreenCleanPreflightObservation => ({ targets, productionTargets, items, ...changes })

async function main() {
  assert.deepEqual(topology, createGreenCleanTopology(safety.databaseSet!))
  assert.equal(new Set(Object.values(topology.databases)).size, 4)
  assert.deepEqual(topology.roles.REFRESH, ["qt_d2_owner"])
  assert.deepEqual(topology.roles.SERVING, ["mvp_green_migration_owner", "mvp_serving_publisher", "mvp_serving_reader"])

  const exact = classifyGreenCleanPreflight(topology, closure, observed(Object.fromEntries(closure.items.map((item) => [item.itemId, "MATCH"]))))
  assert.equal(exact.disposition, "IDEMPOTENT")
  assert.equal(Object.values(exact.productionTargets).some((target) => target.includes("never-leak")), false)

  const missingParent = classifyGreenCleanPreflight(topology, closure, observed({ "backfill.migration.001": "MATCH", "d4.migration.001": "MISSING", "refresh.migration.001": "MATCH", "serving.migration.001": "MATCH", "serving.foreign_key.release": "MISSING" }))
  assert.equal(missingParent.disposition, "READY")
  assert(missingParent.codes.includes("CLOSURE_PARENT_MISSING"))
  const conflict = classifyGreenCleanPreflight(topology, closure, observed({ "backfill.migration.001": "MATCH", "d4.migration.001": "MATCH", "refresh.migration.001": "CONFLICT", "serving.migration.001": "MATCH", "serving.foreign_key.release": "MATCH" }))
  assert.equal(conflict.disposition, "BLOCKED")
  assert(conflict.codes.includes("CLOSURE_ITEM_CONFLICT"))
  const collision = classifyGreenCleanPreflight(topology, closure, observed(Object.fromEntries(closure.items.map((item) => [item.itemId, "MATCH"])), { productionTargets: { ...productionTargets, SERVING: targets.SERVING } }))
  assert.equal(collision.disposition, "BLOCKED")
  assert(collision.codes.includes("PRODUCTION_GREEN_TARGET_COLLISION"))
  assert.throws(() => createGreenCleanRebuildClosure({ items: [{ ...closure.items[0]!, parentItemIds: ["missing.parent"] }] }), /GREEN_CLEAN_CLOSURE_PARENT_INVALID/)

  const port = { inspect: async () => observed(Object.fromEntries(closure.items.map((item) => [item.itemId, "MATCH"]))) }
  assert.equal((await preflightGreenCleanRebuild(port, topology, closure)).disposition, "IDEMPOTENT")
  console.log(JSON.stringify({ status: "PASS", fourDatabaseTopology: true, fixedCanonicalRoles: true, genericExactClosure: true, missingParentClassification: true, idempotentPurePreflight: true, productionMutation: false }))
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "GREEN_CLEAN_REBUILD_CONTRACT_TEST_FAILED"); process.exitCode = 1 })
