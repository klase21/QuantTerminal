import assert from "node:assert/strict"

import { MVP_GREEN_MIGRATION_OWNER_ROLE } from "@/lib/data-platform/mvp-release"
import {
  MvpServingMigrationRunner,
  assertGreenCleanServingMigrationOwnerObservation,
  type GreenCleanServingMigrationOwnerObservation,
} from "@/lib/data-platform/mvp-serving"
import type postgres from "postgres"

const database = "quantterminal_green_clean_ownercheck_serving"
const sessionUser = "qt_d2_owner"
const exact: GreenCleanServingMigrationOwnerObservation = Object.freeze({
  database,
  sessionUser,
  currentUser: sessionUser,
  databaseOwner: MVP_GREEN_MIGRATION_OWNER_ROLE,
  postgresVersion: 160_000,
  ownerExists: true,
  ownerLogin: false,
  ownerSuperuser: false,
  ownerCreateDatabase: false,
  ownerCreateRole: false,
  membershipAdmin: true,
  membershipInherit: false,
  membershipSet: true,
  canSetRole: true,
})

assert.doesNotThrow(() => assertGreenCleanServingMigrationOwnerObservation(exact, database, sessionUser))
assert.throws(
  () => assertGreenCleanServingMigrationOwnerObservation({ ...exact, databaseOwner: "mvp_serving_publisher" }, database, sessionUser),
  /MVP_GREEN_CLEAN_SERVING_MIGRATION_OWNER_TOPOLOGY_INVALID/,
)
assert.throws(
  () => assertGreenCleanServingMigrationOwnerObservation({ ...exact, canSetRole: false, membershipSet: false }, database, sessionUser),
  /MVP_GREEN_CLEAN_SERVING_MIGRATION_OWNER_TOPOLOGY_INVALID/,
)
assert.throws(
  () => assertGreenCleanServingMigrationOwnerObservation({ ...exact, ownerLogin: true }, database, sessionUser),
  /MVP_GREEN_CLEAN_SERVING_MIGRATION_OWNER_TOPOLOGY_INVALID/,
)

const transaction = async <T>(_work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T> => {
  throw new Error("NOT_CALLED")
}
assert.throws(
  () => new MvpServingMigrationRunner({ roleIntent: "PUBLISHER", transaction }),
  /MVP_SERVING_MIGRATION_OWNER_REQUIRED/,
)
assert.throws(
  () => new MvpServingMigrationRunner({ roleIntent: "READER", transaction }),
  /MVP_SERVING_MIGRATION_OWNER_REQUIRED/,
)
assert.doesNotThrow(
  () => new MvpServingMigrationRunner({ roleIntent: "MIGRATION_OWNER", transaction }),
)

console.log(JSON.stringify({
  status: "PASS",
  migrationOwner: MVP_GREEN_MIGRATION_OWNER_ROLE,
  ownerNoLogin: true,
  setRoleRequired: true,
  wrongOwnerRejected: true,
  runtimeRolesRejected: true,
}))
