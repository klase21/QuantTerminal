import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { GreenCleanRebuildDatabaseSet } from "./greenCleanRebuildSafety"

/** Pure preflight contract; execution and database mutation remain outside this module. */
export const GREEN_CLEAN_REBUILD_CONTRACT_VERSION = "mvp-green-clean-rebuild/2.0.0" as const

export type GreenCleanDatabase = "BACKFILL" | "D4" | "REFRESH" | "SERVING"
export type GreenCleanClosureKind = "MIGRATION" | "SEED" | "FOREIGN_KEY" | "ROLE_GRANT"
export type GreenCleanObservedState = "MISSING" | "MATCH" | "CONFLICT"

export interface GreenCleanTopology {
  readonly databases: Readonly<Record<GreenCleanDatabase, string>>
  readonly roles: Readonly<Record<GreenCleanDatabase, readonly string[]>>
  readonly topologyChecksum: string
}

export interface GreenCleanClosureItem {
  readonly itemId: string
  readonly database: GreenCleanDatabase
  readonly kind: GreenCleanClosureKind
  readonly checksum: string
  readonly parentItemIds: readonly string[]
}

export interface GreenCleanRebuildClosure {
  readonly items: readonly GreenCleanClosureItem[]
  readonly closureChecksum: string
}

export interface GreenCleanPreflightObservation {
  readonly targets: Readonly<Record<GreenCleanDatabase, string>>
  readonly productionTargets: Readonly<Record<GreenCleanDatabase, string>>
  readonly items: Readonly<Record<string, GreenCleanObservedState>>
}

export type GreenCleanPreflightDisposition = "READY" | "IDEMPOTENT" | "BLOCKED"
export type GreenCleanPreflightCode = "TARGET_IDENTITY_MISMATCH" | "PRODUCTION_GREEN_TARGET_COLLISION" | "CLOSURE_ITEM_MISSING" | "CLOSURE_ITEM_CONFLICT" | "CLOSURE_PARENT_MISSING"

export interface GreenCleanPreflight {
  readonly disposition: GreenCleanPreflightDisposition
  readonly codes: readonly GreenCleanPreflightCode[]
  readonly targets: Readonly<Record<GreenCleanDatabase, string>>
  readonly productionTargets: Readonly<Record<GreenCleanDatabase, string>>
  readonly closureChecksum: string
}

export interface GreenCleanPreflightPort {
  inspect(input: { readonly databases: Readonly<Record<GreenCleanDatabase, string>> }): Promise<GreenCleanPreflightObservation>
}

const DATABASES: readonly GreenCleanDatabase[] = Object.freeze(["BACKFILL", "D4", "REFRESH", "SERVING"])
const CANONICAL_ROLES: Readonly<Record<GreenCleanDatabase, readonly string[]>> = Object.freeze({
  BACKFILL: Object.freeze(["qt_d2_backfill_owner", "qt_d3_backfill_owner"]),
  D4: Object.freeze(["qt_d2_owner", "qt_d4_consistency_worker", "qt_d4_evidence_assembler", "qt_d4_projection_builder", "qt_d4_read_only"]),
  REFRESH: Object.freeze(["qt_d2_owner"]),
  SERVING: Object.freeze(["mvp_green_migration_owner", "mvp_serving_publisher", "mvp_serving_reader"]),
})
const ITEM_ID = /^[a-z][a-z0-9_.-]{2,127}$/
const CHECKSUM = /^[0-9a-f]{64}$/

function sortedUnique(values: readonly string[], error: string): readonly string[] {
  if (new Set(values).size !== values.length) throw new Error(error)
  return Object.freeze([...values].sort())
}

function redactTarget(target: string): string {
  try {
    const url = new URL(target)
    if (!/^postgres(?:ql)?:$/.test(url.protocol)) return "<invalid-target>"
    return `postgres://<redacted>@${url.hostname || "<missing-host>"}${url.port ? `:${url.port}` : ""}/${url.pathname.replace(/^\//, "") || "<missing-database>"}`
  } catch {
    return target.replace(/:\/\/[^@/]*@/g, "://<redacted>@")
  }
}

export function createGreenCleanTopology(databaseSet: GreenCleanRebuildDatabaseSet): GreenCleanTopology {
  const databases = Object.freeze({ BACKFILL: databaseSet.backfillDatabase, D4: databaseSet.d4Database, REFRESH: databaseSet.refreshDatabase, SERVING: databaseSet.servingDatabase })
  const expectedPrefix = `quantterminal_green_clean_${databaseSet.id}_`
  if (!/^[a-z0-9]{3,24}$/.test(databaseSet.id) || Object.values(databases).some((database) => !database.startsWith(expectedPrefix)) || new Set(Object.values(databases)).size !== DATABASES.length) throw new Error("GREEN_CLEAN_DATABASE_SET_INVALID")
  const roles = Object.freeze({
    BACKFILL: sortedUnique([databaseSet.d2Role, databaseSet.d3Role], "GREEN_CLEAN_BACKFILL_ROLE_SET_INVALID"),
    D4: sortedUnique([databaseSet.d4OwnerRole, databaseSet.d4ConsistencyRole, databaseSet.d4EvidenceRole, databaseSet.d4ProjectionRole, databaseSet.d4ReadOnlyRole], "GREEN_CLEAN_D4_ROLE_SET_INVALID"),
    REFRESH: sortedUnique([databaseSet.refreshRole], "GREEN_CLEAN_REFRESH_ROLE_SET_INVALID"),
    SERVING: sortedUnique([databaseSet.servingMigrationOwnerRole, databaseSet.servingPublisherRole, databaseSet.servingReaderRole], "GREEN_CLEAN_SERVING_ROLE_SET_INVALID"),
  })
  const basis = { version: GREEN_CLEAN_REBUILD_CONTRACT_VERSION, databases, roles }
  return Object.freeze({ ...basis, topologyChecksum: canonicalChecksum(basis) })
}

export function assertGreenCleanTopology(topology: GreenCleanTopology): void {
  const databases = Object.freeze({ ...topology.databases })
  if (new Set(Object.values(databases)).size !== DATABASES.length || DATABASES.some((database) => !databases[database] || topology.roles[database].join(",") !== CANONICAL_ROLES[database].join(","))) throw new Error("GREEN_CLEAN_TOPOLOGY_INVALID")
  const { topologyChecksum, ...basis } = topology
  if (canonicalChecksum(basis) !== topologyChecksum) throw new Error("GREEN_CLEAN_TOPOLOGY_CHECKSUM_INVALID")
}

export function createGreenCleanRebuildClosure(input: { readonly items: readonly GreenCleanClosureItem[] }): GreenCleanRebuildClosure {
  const items = Object.freeze([...input.items].map((item) => Object.freeze({ ...item, parentItemIds: sortedUnique(item.parentItemIds, "GREEN_CLEAN_CLOSURE_PARENT_DUPLICATE") })).sort((a, b) => a.itemId.localeCompare(b.itemId)))
  if (!items.length || new Set(items.map((item) => item.itemId)).size !== items.length || items.some((item) => !ITEM_ID.test(item.itemId) || !CHECKSUM.test(item.checksum) || !DATABASES.includes(item.database))) throw new Error("GREEN_CLEAN_CLOSURE_INVALID")
  const itemIds = new Set(items.map((item) => item.itemId))
  if (items.some((item) => item.parentItemIds.some((parent) => parent === item.itemId || !itemIds.has(parent)))) throw new Error("GREEN_CLEAN_CLOSURE_PARENT_INVALID")
  const basis = { version: GREEN_CLEAN_REBUILD_CONTRACT_VERSION, items }
  return Object.freeze({ ...basis, closureChecksum: canonicalChecksum(basis) })
}

export function classifyGreenCleanPreflight(topology: GreenCleanTopology, closure: GreenCleanRebuildClosure, observed: GreenCleanPreflightObservation): GreenCleanPreflight {
  assertGreenCleanTopology(topology)
  if (createGreenCleanRebuildClosure(closure).closureChecksum !== closure.closureChecksum) throw new Error("GREEN_CLEAN_REBUILD_CLOSURE_CHECKSUM_INVALID")
  const codes: GreenCleanPreflightCode[] = []
  for (const database of DATABASES) {
    if (observed.targets[database] !== topology.databases[database]) codes.push("TARGET_IDENTITY_MISMATCH")
    if (observed.targets[database] === observed.productionTargets[database]) codes.push("PRODUCTION_GREEN_TARGET_COLLISION")
  }
  for (const item of closure.items) {
    const state = observed.items[item.itemId] ?? "MISSING"
    if (state === "MISSING") codes.push("CLOSURE_ITEM_MISSING")
    if (state === "CONFLICT") codes.push("CLOSURE_ITEM_CONFLICT")
    if (item.parentItemIds.some((parentId) => (observed.items[parentId] ?? "MISSING") !== "MATCH")) codes.push("CLOSURE_PARENT_MISSING")
  }
  const orderedCodes = Object.freeze([...new Set(codes)].sort() as GreenCleanPreflightCode[])
  const fatal = orderedCodes.some((code) => code === "TARGET_IDENTITY_MISMATCH" || code === "PRODUCTION_GREEN_TARGET_COLLISION" || code === "CLOSURE_ITEM_CONFLICT")
  return Object.freeze({ disposition: !orderedCodes.length ? "IDEMPOTENT" : fatal ? "BLOCKED" : "READY", codes: orderedCodes, targets: Object.freeze(Object.fromEntries(DATABASES.map((database) => [database, redactTarget(observed.targets[database])])) as Record<GreenCleanDatabase, string>), productionTargets: Object.freeze(Object.fromEntries(DATABASES.map((database) => [database, redactTarget(observed.productionTargets[database])])) as Record<GreenCleanDatabase, string>), closureChecksum: closure.closureChecksum })
}

export async function preflightGreenCleanRebuild(port: GreenCleanPreflightPort, topology: GreenCleanTopology, closure: GreenCleanRebuildClosure): Promise<GreenCleanPreflight> {
  return classifyGreenCleanPreflight(topology, closure, await port.inspect({ databases: topology.databases }))
}
