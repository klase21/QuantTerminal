import assert from "node:assert/strict"

import {
  createGreenCleanPrivilegeMatrix,
  validateGreenCleanPrivilegeMatrix,
  type GreenCleanPrivilegeMatrix,
} from "@/lib/data-platform/mvp-refresh/greenCleanPrivilegeMatrix"
import { inspectGreenCleanRebuildSafety } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"

const safety = inspectGreenCleanRebuildSafety({
  MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
  MVP_GREEN_CLEAN_REBUILD_ID: "matrix20260731",
  MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: "quantterminal_green_clean_matrix20260731_backfill",
  MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: "quantterminal_green_clean_matrix20260731_d4",
  MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: "quantterminal_green_clean_matrix20260731_refresh",
  MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: "quantterminal_green_clean_matrix20260731_serving",
})
assert(safety.databaseSet)
const matrix = createGreenCleanPrivilegeMatrix(safety.databaseSet)

const has = (
  role: string,
  object: string,
  operation: string,
  expected: "ALLOW" | "DENY",
): boolean => matrix.operations.some((item) =>
  item.expectedRole === role
  && (item.schema ? `${item.schema}.${item.object}` : item.object) === object
  && item.operation === operation
  && item.expected === expected)

async function main(): Promise<void> {
  validateGreenCleanPrivilegeMatrix(matrix)
  assert.equal(matrix.summary.unclassifiedSqlOperations, 0)
  assert.equal(matrix.summary.databasesCovered.length, 4)
  assert(matrix.summary.rolesInspected >= 18)
  assert(matrix.summary.sqlOperationsClassified >= 200)
  assert.equal(new Set(matrix.operations.map((item) => item.testId)).size, matrix.operations.length)
  assert.equal(matrix.summary.expectedDenialTests, matrix.operations.filter((item) => item.expected === "DENY").length)

  assert(has("qt_d2_canonical_writer", "raw.objects", "INSERT", "ALLOW"))
  assert(has("qt_d2_canonical_writer", "control.migration_ledger", "INSERT", "DENY"))
  assert(has("qt_d3_worker", "control.claim_population_unit(text,text,timestamptz,timestamptz)", "EXECUTE", "ALLOW"))
  assert(has("qt_d3_worker", "control.population_units", "UPDATE", "ALLOW"))
  assert(has("qt_d3_worker", "control.population_runs", "INSERT", "ALLOW"))
  assert(has("qt_d3_worker", "control.population_leases", "UPDATE", "ALLOW"))
  assert(has("qt_d3_worker", "control.population_unit_events", "INSERT", "ALLOW"))
  assert(has("qt_d3_worker", "control.population_unit_events", "SELECT", "ALLOW"))
  assert(has("qt_d3_worker", "control.population_checkpoints", "SELECT", "ALLOW"))
  assert(has("qt_d3_worker", "control.retrieval_attempts", "SELECT", "ALLOW"))
  assert(has("qt_d3_worker", "control.population_outcomes", "SELECT", "ALLOW"))
  assert(has("qt_d3_coordinator", "control.control", "USAGE", "ALLOW"))
  assert(has("qt_d3_worker", "control.control", "USAGE", "ALLOW"))
  assert(has("qt_d4_consistency_worker", "coverage.projection_versions", "INSERT", "ALLOW"))
  assert(has("qt_d4_evidence_assembler", "evidence.core_packet_versions", "INSERT", "ALLOW"))
  assert(has("qt_d4_projection_builder", "projection.mvp_projection_versions", "INSERT", "ALLOW"))
  assert(has("qt_d4_projection_builder", "projection.mvp_consumer_exposure_decisions", "INSERT", "DENY"))
  assert(has("qt_d2_owner", "refresh_control.refresh_run", "UPDATE", "ALLOW"))

  assert(has("mvp_green_migration_owner", "serving_control.migration_ledger", "SELECT", "ALLOW"))
  assert(has("mvp_serving_publisher", "serving_control.migration_ledger", "SELECT", "DENY"))
  assert(has("mvp_serving_publisher", "serving.serving_candidate_manifest", "INSERT", "ALLOW"))
  assert(has("mvp_serving_publisher", "serving.serving_exposure", "INSERT", "DENY"))
  assert(has("mvp_serving_publisher", "serving.serving_publication_event", "INSERT", "DENY"))
  assert(has("mvp_serving_reader", "serving.serving_corpus", "SELECT", "ALLOW"))
  assert(has("mvp_serving_reader", "serving.serving_corpus", "INSERT", "DENY"))

  const owner = matrix.ownerships.find((item) => item.logicalDatabase === "SERVING")
  assert.equal(owner?.ownerRole, "mvp_green_migration_owner")
  const ownerRole = matrix.roles.find((item) => item.roleName === "mvp_green_migration_owner")
  assert.equal(ownerRole?.login, false)
  const publisher = matrix.roles.find((item) => item.roleName === "mvp_serving_publisher")
  const reader = matrix.roles.find((item) => item.roleName === "mvp_serving_reader")
  assert.equal(publisher?.superuser, false)
  assert.equal(publisher?.createRole, false)
  assert.equal(reader?.forbiddenOperations.includes("INSERT"), true)

  const servingMembership = matrix.memberships.find((item) =>
    item.grantedRole === "mvp_green_migration_owner" && item.memberRole === "qt_d2_owner")
  assert.deepEqual(servingMembership, {
    memberRole: "qt_d2_owner",
    grantedRole: "mvp_green_migration_owner",
    grantorRole: "qt_d2_owner",
    adminOption: true,
    inheritOption: false,
    setOption: true,
  })

  const duplicate: GreenCleanPrivilegeMatrix = {
    ...matrix,
    operations: [...matrix.operations, matrix.operations[0]!],
    summary: { ...matrix.summary, sqlOperationsClassified: matrix.operations.length + 1 },
  }
  assert.throws(() => validateGreenCleanPrivilegeMatrix(duplicate), /GREEN_CLEAN_PRIVILEGE_TEST_ID_DUPLICATE/)

  console.log(JSON.stringify({
    status: "PASS",
    roles: matrix.summary.rolesInspected,
    operations: matrix.summary.sqlOperationsClassified,
    databases: matrix.summary.databasesCovered.length,
    denials: matrix.summary.expectedDenialTests,
    unclassified: matrix.summary.unclassifiedSqlOperations,
  }))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "GREEN_CLEAN_PRIVILEGE_MATRIX_TEST_FAILED")
  process.exitCode = 1
})
