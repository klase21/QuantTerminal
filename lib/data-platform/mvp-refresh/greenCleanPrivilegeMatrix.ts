import type { GreenCleanRebuildDatabaseSet } from "./greenCleanRebuildSafety"

export const GREEN_CLEAN_PRIVILEGE_MATRIX_VERSION = "mvp-green-clean-privilege-matrix/1.0.0" as const

export type GreenCleanLogicalDatabase = "BACKFILL" | "D4" | "REFRESH" | "SERVING"
export type GreenCleanPrivilegeObjectKind = "DATABASE" | "SCHEMA" | "TABLE" | "SEQUENCE" | "FUNCTION" | "ROLE"
export type GreenCleanPrivilegeOperation =
  | "CONNECT"
  | "CREATE"
  | "ALTER"
  | "SELECT"
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "TRUNCATE"
  | "EXECUTE"
  | "USAGE"
  | "SET_ROLE"
  | "MANAGE_ROLE"
export type GreenCleanPrivilegeExpectationResult = "ALLOW" | "DENY"
export type GreenCleanPrivilegeGrantSource = "MIGRATION" | "BOOTSTRAP" | "ROLE_MEMBERSHIP" | "OWNERSHIP" | "NONE"

export interface GreenCleanRoleMembershipContract {
  readonly memberRole: string
  readonly grantedRole: string
  readonly grantorRole: string
  readonly adminOption: boolean
  readonly inheritOption: boolean
  readonly setOption: boolean
}

export interface GreenCleanRoleContract {
  readonly roleName: string
  readonly login: boolean
  readonly inherit: boolean
  readonly bypassRls: boolean
  readonly createDatabase: boolean
  readonly createRole: boolean
  readonly superuser: boolean
  readonly administrative: boolean
  readonly ownedDatabases: readonly string[]
  readonly connectDatabases: readonly string[]
  readonly deniedDatabases: readonly string[]
  readonly setRoleTargets: readonly string[]
  readonly forbiddenOperations: readonly GreenCleanPrivilegeOperation[]
}

export interface GreenCleanDatabaseOwnershipContract {
  readonly logicalDatabase: GreenCleanLogicalDatabase
  readonly databaseName: string
  readonly objectKind: "DATABASE" | "SCHEMA" | "TABLE" | "SEQUENCE" | "FUNCTION"
  readonly schema?: string
  readonly object?: string
  readonly ownerRole: string
}

export interface GreenCleanPrivilegeExpectation {
  readonly testId: string
  readonly phase: string
  readonly stage: string
  readonly sourceFile: string
  readonly symbol: string
  readonly logicalDatabase: GreenCleanLogicalDatabase
  readonly database: string
  readonly binding: string
  readonly sessionRole: string
  readonly setRole: string | null
  readonly schema: string | null
  readonly object: string
  readonly objectKind: GreenCleanPrivilegeObjectKind
  readonly operation: GreenCleanPrivilegeOperation
  readonly requiredPrivilege: string
  readonly expected: GreenCleanPrivilegeExpectationResult
  readonly reason: string
  readonly grantSource: GreenCleanPrivilegeGrantSource
  readonly expectedRole: string
  readonly deniedRoles: readonly string[]
  readonly runtimeKind: "RUNTIME" | "CONTROL_PLANE"
  readonly exposureRelevant: boolean
  readonly idempotent: boolean
}

export interface GreenCleanPrivilegeMatrixSummary {
  readonly rolesInspected: number
  readonly sqlOperationsClassified: number
  readonly databasesCovered: readonly string[]
  readonly schemasCovered: number
  readonly objectsCovered: number
  readonly allowCount: number
  readonly denyCount: number
  readonly expectedDenialTests: number
  readonly unclassifiedSqlOperations: 0
}

export interface GreenCleanPrivilegeMatrix {
  readonly version: typeof GREEN_CLEAN_PRIVILEGE_MATRIX_VERSION
  readonly roles: readonly GreenCleanRoleContract[]
  readonly memberships: readonly GreenCleanRoleMembershipContract[]
  readonly ownerships: readonly GreenCleanDatabaseOwnershipContract[]
  readonly operations: readonly GreenCleanPrivilegeExpectation[]
  readonly summary: GreenCleanPrivilegeMatrixSummary
}

type OperationInput = Omit<GreenCleanPrivilegeExpectation, "testId" | "database" | "binding" | "requiredPrivilege" | "deniedRoles"> & {
  readonly testId?: string
  readonly deniedRoles?: readonly string[]
}
type OperationBase = Omit<OperationInput,
  "object" | "objectKind" | "operation" | "expected" | "grantSource" | "testId" | "expectedRole" | "schema" | "deniedRoles">

const DATABASE_BINDINGS: Readonly<Record<GreenCleanLogicalDatabase, string>> = Object.freeze({
  BACKFILL: "D2_D3_INTEGRATED",
  D4: "D4_ISOLATED",
  REFRESH: "MVP_REFRESH_ISOLATED",
  SERVING: "MVP_SERVING_ISOLATED",
})

const requiredPrivilege = (operation: GreenCleanPrivilegeOperation): string => {
  if (operation === "MANAGE_ROLE") return "CREATEROLE"
  if (operation === "SET_ROLE") return "SET"
  return operation
}

function databaseName(databaseSet: GreenCleanRebuildDatabaseSet, logical: GreenCleanLogicalDatabase): string {
  if (logical === "BACKFILL") return databaseSet.backfillDatabase
  if (logical === "D4") return databaseSet.d4Database
  if (logical === "REFRESH") return databaseSet.refreshDatabase
  return databaseSet.servingDatabase
}

function freezeRole(value: GreenCleanRoleContract): GreenCleanRoleContract {
  return Object.freeze({
    ...value,
    ownedDatabases: Object.freeze([...value.ownedDatabases]),
    connectDatabases: Object.freeze([...value.connectDatabases]),
    deniedDatabases: Object.freeze([...value.deniedDatabases]),
    setRoleTargets: Object.freeze([...value.setRoleTargets]),
    forbiddenOperations: Object.freeze([...value.forbiddenOperations]),
  })
}

function role(
  roleName: string,
  input: Partial<Omit<GreenCleanRoleContract, "roleName">> = {},
): GreenCleanRoleContract {
  return freezeRole({
    roleName,
    login: false,
    inherit: true,
    bypassRls: false,
    createDatabase: false,
    createRole: false,
    superuser: false,
    administrative: false,
    ownedDatabases: [],
    connectDatabases: [],
    deniedDatabases: [],
    setRoleTargets: [],
    forbiddenOperations: ["MANAGE_ROLE", "CREATE", "ALTER", "TRUNCATE", "DELETE"],
    ...input,
  })
}

function operation(databaseSet: GreenCleanRebuildDatabaseSet, input: OperationInput): GreenCleanPrivilegeExpectation {
  const objectToken = input.object.replace(/[^a-z0-9]+/gi, ".").replace(/^\.+|\.+$/g, "").toLowerCase()
  const testId = input.testId ?? [
    input.logicalDatabase.toLowerCase(),
    input.stage.toLowerCase().replace(/[^a-z0-9]+/g, "."),
    input.expectedRole,
    objectToken,
    input.operation.toLowerCase(),
    input.expected.toLowerCase(),
  ].join(".")
  return Object.freeze({
    ...input,
    testId,
    database: databaseName(databaseSet, input.logicalDatabase),
    binding: DATABASE_BINDINGS[input.logicalDatabase],
    requiredPrivilege: requiredPrivilege(input.operation),
    deniedRoles: Object.freeze([...(input.deniedRoles ?? [])]),
  })
}

function tableOperations(
  databaseSet: GreenCleanRebuildDatabaseSet,
  base: OperationBase,
  roleName: string,
  schema: string,
  tables: readonly string[],
  operations: readonly GreenCleanPrivilegeOperation[],
  grantSource: Exclude<GreenCleanPrivilegeGrantSource, "NONE">,
): readonly GreenCleanPrivilegeExpectation[] {
  return tables.flatMap((table) => operations.map((privilege) => operation(databaseSet, {
    ...base,
    expectedRole: roleName,
    schema,
    object: table,
    objectKind: "TABLE",
    operation: privilege,
    expected: "ALLOW",
    grantSource,
  })))
}

function denyOperations(
  databaseSet: GreenCleanRebuildDatabaseSet,
  base: OperationBase,
  roleName: string,
  schema: string | null,
  object: string,
  objectKind: GreenCleanPrivilegeObjectKind,
  operations: readonly GreenCleanPrivilegeOperation[],
): readonly GreenCleanPrivilegeExpectation[] {
  const execution = (base.setRole ?? base.sessionRole) === roleName
    ? base
    : { ...base, sessionRole: roleName, setRole: null }
  const normalizedObject = schema && object.startsWith(`${schema}.`) ? object.slice(schema.length + 1) : object
  return operations.map((privilege) => operation(databaseSet, {
    ...execution,
    expectedRole: roleName,
    schema,
    object: normalizedObject,
    objectKind,
    operation: privilege,
    expected: "DENY",
    grantSource: "NONE",
  }))
}

/**
 * Canonical least-privilege contract for the clean one-day pipeline.
 *
 * Entries represent distinct SQL capabilities, not SQL text. Dynamic queries
 * that use the same role/object/operation are deliberately represented once.
 */
export function createGreenCleanPrivilegeMatrix(databaseSet: GreenCleanRebuildDatabaseSet, options: { readonly managed?: boolean } = {}): GreenCleanPrivilegeMatrix {
  const allDatabases = [
    databaseSet.backfillDatabase,
    databaseSet.d4Database,
    databaseSet.refreshDatabase,
    databaseSet.servingDatabase,
  ] as const
  const other = (database: string): readonly string[] => allDatabases.filter((value) => value !== database)

  const roles = Object.freeze([
    role(databaseSet.d2Role, {
      login: true,
      ownedDatabases: [databaseSet.backfillDatabase],
      connectDatabases: [databaseSet.backfillDatabase],
      deniedDatabases: other(databaseSet.backfillDatabase),
      setRoleTargets: ["qt_d2_canonical_writer", "qt_d2_bounded_writer", "qt_d2_read_only"],
      forbiddenOperations: [],
    }),
    role(databaseSet.d3Role, {
      login: true,
      connectDatabases: [databaseSet.backfillDatabase],
      deniedDatabases: other(databaseSet.backfillDatabase),
      setRoleTargets: ["qt_d3_scheduler", "qt_d3_coordinator", "qt_d3_worker", "qt_d3_read_only"],
    }),
    role(databaseSet.d4OwnerRole, {
      login: true,
      createDatabase: options.managed ? false : true,
      createRole: options.managed ? false : true,
      superuser: options.managed ? false : true,
      bypassRls: options.managed ? false : true,
      administrative: options.managed ? false : true,
      ownedDatabases: [databaseSet.d4Database, databaseSet.refreshDatabase],
      connectDatabases: options.managed
        ? [databaseSet.d4Database, databaseSet.refreshDatabase, databaseSet.servingDatabase]
        : [...allDatabases],
      deniedDatabases: options.managed ? [databaseSet.backfillDatabase] : [],
      setRoleTargets: [
        databaseSet.d4ConsistencyRole,
        databaseSet.d4EvidenceRole,
        databaseSet.d4ProjectionRole,
        databaseSet.d4ReadOnlyRole,
        "qt_d4_projection_publisher",
        databaseSet.servingMigrationOwnerRole,
      ],
      forbiddenOperations: [],
    }),
    role(databaseSet.servingMigrationOwnerRole, {
      ownedDatabases: [databaseSet.servingDatabase],
      connectDatabases: [],
      deniedDatabases: other(databaseSet.servingDatabase),
      forbiddenOperations: [],
    }),
    role(databaseSet.servingPublisherRole, {
      login: true,
      connectDatabases: [databaseSet.servingDatabase],
      deniedDatabases: other(databaseSet.servingDatabase),
      forbiddenOperations: ["MANAGE_ROLE", "CREATE", "ALTER", "UPDATE", "DELETE", "TRUNCATE"],
    }),
    role(databaseSet.servingReaderRole, {
      login: true,
      connectDatabases: [databaseSet.servingDatabase],
      deniedDatabases: other(databaseSet.servingDatabase),
      forbiddenOperations: ["MANAGE_ROLE", "CREATE", "ALTER", "INSERT", "UPDATE", "DELETE", "TRUNCATE"],
    }),
    role("qt_d2_canonical_writer"),
    role("qt_d2_bounded_writer"),
    role("qt_d2_read_only", { forbiddenOperations: ["MANAGE_ROLE", "CREATE", "ALTER", "INSERT", "UPDATE", "DELETE", "TRUNCATE"] }),
    role("qt_d3_scheduler"),
    role("qt_d3_coordinator"),
    role("qt_d3_worker"),
    role("qt_d3_read_only", { forbiddenOperations: ["MANAGE_ROLE", "CREATE", "ALTER", "INSERT", "UPDATE", "DELETE", "TRUNCATE"] }),
    role(databaseSet.d4ConsistencyRole, { inherit: false }),
    role(databaseSet.d4EvidenceRole, { inherit: false }),
    role(databaseSet.d4ProjectionRole, { inherit: false }),
    role("qt_d4_projection_publisher", { inherit: false }),
    role(databaseSet.d4ReadOnlyRole, { inherit: false, forbiddenOperations: ["MANAGE_ROLE", "CREATE", "ALTER", "INSERT", "UPDATE", "DELETE", "TRUNCATE"] }),
  ])

  const standardMemberships: GreenCleanRoleMembershipContract[] = [
    ["qt_d2_canonical_writer", databaseSet.d2Role],
    ["qt_d2_bounded_writer", databaseSet.d2Role],
    ["qt_d2_read_only", databaseSet.d2Role],
    ["qt_d3_scheduler", databaseSet.d3Role],
    ["qt_d3_coordinator", databaseSet.d3Role],
    ["qt_d3_worker", databaseSet.d3Role],
    ["qt_d3_read_only", databaseSet.d3Role],
    [databaseSet.d4ConsistencyRole, databaseSet.d4OwnerRole],
    [databaseSet.d4EvidenceRole, databaseSet.d4OwnerRole],
    [databaseSet.d4ProjectionRole, databaseSet.d4OwnerRole],
    ["qt_d4_projection_publisher", databaseSet.d4OwnerRole],
    [databaseSet.d4ReadOnlyRole, databaseSet.d4OwnerRole],
  ].map(([grantedRole, memberRole]) => Object.freeze({
    memberRole,
    grantedRole,
    grantorRole: options.managed ? "neondb_owner" : databaseSet.d4OwnerRole,
    adminOption: false,
    inheritOption: false,
    setOption: true,
  }))
  const memberships: readonly GreenCleanRoleMembershipContract[] = Object.freeze([
    ...standardMemberships,
    Object.freeze({
    memberRole: databaseSet.d4OwnerRole,
    grantedRole: databaseSet.servingMigrationOwnerRole,
    grantorRole: options.managed ? "neondb_owner" : databaseSet.d4OwnerRole,
    adminOption: true,
    inheritOption: false,
    setOption: true,
    }),
  ])

  const databaseOwnerships: readonly GreenCleanDatabaseOwnershipContract[] = Object.freeze([
    Object.freeze({ logicalDatabase: "BACKFILL", databaseName: databaseSet.backfillDatabase, objectKind: "DATABASE", ownerRole: databaseSet.d2Role }),
    Object.freeze({ logicalDatabase: "D4", databaseName: databaseSet.d4Database, objectKind: "DATABASE", ownerRole: databaseSet.d4OwnerRole }),
    Object.freeze({ logicalDatabase: "REFRESH", databaseName: databaseSet.refreshDatabase, objectKind: "DATABASE", ownerRole: databaseSet.refreshRole }),
    Object.freeze({ logicalDatabase: "SERVING", databaseName: databaseSet.servingDatabase, objectKind: "DATABASE", ownerRole: databaseSet.servingMigrationOwnerRole }),
  ])

  const operations: GreenCleanPrivilegeExpectation[] = []
  const add = (...values: readonly GreenCleanPrivilegeExpectation[]) => operations.push(...values)

  for (const item of roles) {
    for (const database of item.connectDatabases) {
      const logicalDatabase = databaseOwnerships.find((ownership) => ownership.databaseName === database)?.logicalDatabase
      if (!logicalDatabase) throw new Error("GREEN_CLEAN_PRIVILEGE_ROLE_DATABASE_UNKNOWN")
      add(operation(databaseSet, {
        phase: "CONNECTION_PREFLIGHT",
        stage: "DATABASE_CONNECT",
        sourceFile: "lib/data-platform/mvp-refresh/greenCleanPrivilegeMatrix.ts",
        symbol: "createGreenCleanPrivilegeMatrix",
        logicalDatabase,
        sessionRole: item.roleName,
        setRole: null,
        schema: null,
        object: database,
        objectKind: "DATABASE",
        operation: "CONNECT",
        expected: "ALLOW",
        grantSource: item.ownedDatabases.includes(database) ? "OWNERSHIP" : "BOOTSTRAP",
        expectedRole: item.roleName,
        reason: "The role may connect only to a database explicitly assigned by the clean topology.",
        runtimeKind: item.administrative ? "CONTROL_PLANE" : "RUNTIME",
        exposureRelevant: database === databaseSet.servingDatabase,
        idempotent: true,
        testId: `connect.${item.roleName}.${logicalDatabase.toLowerCase()}.allow`,
      }))
    }
    for (const database of item.deniedDatabases) {
      const logicalDatabase = databaseOwnerships.find((ownership) => ownership.databaseName === database)?.logicalDatabase
      if (!logicalDatabase) throw new Error("GREEN_CLEAN_PRIVILEGE_ROLE_DATABASE_UNKNOWN")
      add(operation(databaseSet, {
        phase: "CONNECTION_PREFLIGHT",
        stage: "DATABASE_ISOLATION",
        sourceFile: "lib/data-platform/mvp-refresh/greenCleanPrivilegeMatrix.ts",
        symbol: "createGreenCleanPrivilegeMatrix",
        logicalDatabase,
        sessionRole: item.roleName,
        setRole: null,
        schema: null,
        object: database,
        objectKind: "DATABASE",
        operation: "CONNECT",
        expected: "DENY",
        grantSource: "NONE",
        expectedRole: item.roleName,
        reason: "Cross-database runtime access is outside the isolated one-day topology.",
        runtimeKind: item.administrative ? "CONTROL_PLANE" : "RUNTIME",
        exposureRelevant: database === databaseSet.servingDatabase,
        idempotent: true,
        testId: `connect.${item.roleName}.${logicalDatabase.toLowerCase()}.deny`,
      }))
    }
  }

  const d2Runtime = {
    phase: "ONE_DAY_PIPELINE",
    stage: "CANONICAL_PERSISTED",
    sourceFile: "lib/data-platform/persistence/postgres/adapter.ts",
    symbol: "createCanonicalPersistenceAdapter",
    logicalDatabase: "BACKFILL" as const,
    sessionRole: databaseSet.d2Role,
    setRole: "qt_d2_canonical_writer",
    reason: "The bounded canonical writer appends immutable raw, canonical, repository, and commit records.",
    runtimeKind: "RUNTIME" as const,
    exposureRelevant: false,
    idempotent: true,
  }
  add(...tableOperations(databaseSet, d2Runtime, "qt_d2_canonical_writer", "raw", ["objects"], ["SELECT", "INSERT"], "BOOTSTRAP"))
  add(...tableOperations(databaseSet, d2Runtime, "qt_d2_canonical_writer", "canonical", ["ohlcv", "open_interest", "funding", "agg_trades", "stream_manifests"], ["SELECT", "INSERT"], "BOOTSTRAP"))
  add(...tableOperations(databaseSet, d2Runtime, "qt_d2_canonical_writer", "repository", ["envelopes", "record_versions", "supersessions", "lineage_edges"], ["SELECT", "INSERT"], "BOOTSTRAP"))
  add(...tableOperations(databaseSet, d2Runtime, "qt_d2_canonical_writer", "control", ["canonical_commits", "outbox"], ["SELECT", "INSERT"], "BOOTSTRAP"))
  add(...tableOperations(databaseSet, d2Runtime, "qt_d2_canonical_writer", "control", ["registry_snapshots", "provider_snapshots", "policy_versions"], ["SELECT"], "BOOTSTRAP"))
  add(operation(databaseSet, {
    ...d2Runtime,
    expectedRole: "qt_d2_canonical_writer",
    schema: "repository",
    object: "append_publication_decision(text,text,text,integer,repository.publication_state,text,timestamptz,text[],text,text)",
    objectKind: "FUNCTION",
    operation: "EXECUTE",
    expected: "ALLOW",
    grantSource: "BOOTSTRAP",
  }))
  add(...denyOperations(databaseSet, d2Runtime, "qt_d2_canonical_writer", "control", "control.migration_ledger", "TABLE", ["INSERT", "UPDATE", "DELETE"]))
  add(...denyOperations(databaseSet, d2Runtime, "qt_d2_canonical_writer", "canonical", "canonical", "SCHEMA", ["CREATE"]))
  add(...denyOperations(databaseSet, d2Runtime, "qt_d2_canonical_writer", null, "roles", "ROLE", ["MANAGE_ROLE"]))

  const d3Runtime = {
    phase: "ONE_DAY_PIPELINE",
    stage: "SOURCES_ACQUIRED_TO_DATASET_WATERMARKS",
    sourceFile: "lib/data-platform/population/postgres/store.ts",
    symbol: "PostgresPopulationStore",
    logicalDatabase: "BACKFILL" as const,
    sessionRole: databaseSet.d3Role,
    setRole: "qt_d3_worker",
    reason: "The population worker claims bounded units and appends retrieval, candidate, validation, checkpoint, and outcome evidence.",
    runtimeKind: "RUNTIME" as const,
    exposureRelevant: false,
    idempotent: true,
  }
  add(operation(databaseSet, { ...d3Runtime, expectedRole: "qt_d3_coordinator", setRole: "qt_d3_coordinator", schema: "control", object: "control", objectKind: "SCHEMA", operation: "USAGE", expected: "ALLOW", grantSource: "BOOTSTRAP" }))
  add(operation(databaseSet, { ...d3Runtime, expectedRole: "qt_d3_worker", schema: "control", object: "control", objectKind: "SCHEMA", operation: "USAGE", expected: "ALLOW", grantSource: "BOOTSTRAP" }))
  for (const schema of ["population", "raw", "quality", "coverage", "quarantine"]) add(operation(databaseSet, { ...d3Runtime, expectedRole: "qt_d3_worker", schema, object: schema, objectKind: "SCHEMA", operation: "USAGE", expected: "ALLOW", grantSource: "BOOTSTRAP" }))
  add(...tableOperations(databaseSet, d3Runtime, "qt_d3_worker", "control", ["population_jobs", "population_runs", "population_units", "population_leases"], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d3Runtime, "qt_d3_worker", "control", ["population_runs", "population_units", "population_leases"], ["UPDATE"], "BOOTSTRAP"))
  add(...tableOperations(databaseSet, d3Runtime, "qt_d3_worker", "control", ["population_runs", "population_run_events", "population_unit_events", "population_leases"], ["INSERT"], "BOOTSTRAP"))
  add(...tableOperations(databaseSet, d3Runtime, "qt_d3_worker", "control", ["retrieval_attempts", "population_outcomes", "population_unit_events", "population_checkpoints"], ["SELECT"], "BOOTSTRAP"))
  add(...tableOperations(databaseSet, d3Runtime, "qt_d3_worker", "control", ["retrieval_attempts", "population_checkpoints", "population_outcomes", "retry_events"], ["INSERT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d3Runtime, "qt_d3_worker", "population", ["candidates", "candidate_conflicts", "canonical_submissions", "canonical_submission_events"], ["SELECT", "INSERT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d3Runtime, "qt_d3_worker", "quality", ["candidate_validation_results", "candidate_evaluation_runs", "candidate_evaluation_results"], ["INSERT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d3Runtime, "qt_d3_worker", "coverage", ["watermark_eligibility_decisions"], ["INSERT"], "MIGRATION"))
  for (const functionName of [
    "control.claim_population_unit(text,text,timestamptz,timestamptz)",
    "control.heartbeat_population_lease(text,text,text,bigint,timestamptz,timestamptz)",
    "control.advance_population_unit(text,text,text,bigint,control.population_unit_state,text,timestamptz)",
  ]) add(operation(databaseSet, {
    ...d3Runtime,
    expectedRole: "qt_d3_worker",
    schema: "control",
    object: functionName.replace(/^control\./, ""),
    objectKind: "FUNCTION",
    operation: "EXECUTE",
    expected: "ALLOW",
    grantSource: "MIGRATION",
  }))
  add(...denyOperations(databaseSet, d3Runtime, "qt_d3_worker", "control", "control.population_migration_ledger", "TABLE", ["INSERT", "UPDATE", "DELETE"]))
  add(...denyOperations(databaseSet, d3Runtime, "qt_d3_worker", "population", "population", "SCHEMA", ["CREATE"]))
  add(...denyOperations(databaseSet, d3Runtime, "qt_d3_worker", null, "roles", "ROLE", ["MANAGE_ROLE"]))

  const d4Consistency = {
    phase: "ONE_DAY_PIPELINE",
    stage: "COVERAGE_AND_CONSISTENCY_PERSISTED",
    sourceFile: "lib/data-platform/mvp-refresh/liveResumeLocalBootstrap.ts",
    symbol: "createMvpBoundedCoverageResult",
    logicalDatabase: "D4" as const,
    sessionRole: databaseSet.d4OwnerRole,
    setRole: databaseSet.d4ConsistencyRole,
    reason: "The consistency worker materializes bounded Coverage and immutable consistency outputs.",
    runtimeKind: "RUNTIME" as const,
    exposureRelevant: false,
    idempotent: true,
  }
  add(...tableOperations(databaseSet, d4Consistency, databaseSet.d4ConsistencyRole, "coverage", ["projection_versions"], ["SELECT", "INSERT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Consistency, databaseSet.d4ConsistencyRole, "consistency", [
    "rule_sets", "rules", "run_specifications", "run_states", "run_events",
    "run_completion_summaries", "run_creation_conflicts", "immutable_results",
    "result_run_links", "result_input_references", "result_temporal_references",
    "immutable_result_diagnostics", "result_conflicts", "dependency_nodes",
    "dependency_edges", "dependency_edge_conflicts", "dependency_snapshots",
    "dependency_snapshot_nodes", "dependency_snapshot_edges", "recompute_requests_v2",
    "recompute_conflicts", "recompute_plans", "recompute_plan_steps",
    "recompute_step_claims", "recompute_step_events", "recompute_step_lease_state",
    "recompute_step_lease_events", "result_dependency_links", "result_selection_decisions",
  ], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Consistency, databaseSet.d4ConsistencyRole, "consistency", [
    "run_specifications", "run_states", "run_events", "run_completion_summaries",
    "run_creation_conflicts", "immutable_results", "result_run_links",
    "result_input_references", "result_temporal_references",
    "immutable_result_diagnostics", "result_conflicts", "dependency_nodes",
    "dependency_edges", "dependency_edge_conflicts", "dependency_snapshots",
    "dependency_snapshot_nodes", "dependency_snapshot_edges", "recompute_requests_v2",
    "recompute_conflicts", "recompute_plans", "recompute_plan_steps",
    "recompute_step_events", "result_dependency_links", "result_selection_decisions",
  ], ["INSERT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Consistency, databaseSet.d4ConsistencyRole, "consistency", ["run_states"], ["UPDATE"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Consistency, databaseSet.d4ConsistencyRole, "control", ["policy_versions"], ["SELECT"], "MIGRATION"))
  for (const functionName of [
    "claim_recompute_step(text,text,timestamptz,timestamptz)",
    "heartbeat_recompute_step(text,text,bigint,timestamptz,timestamptz)",
    "assert_recompute_step_fence(text,text,bigint,timestamptz)",
    "close_recompute_step_lease(text,text,bigint,text,timestamptz)",
  ]) add(operation(databaseSet, {
    ...d4Consistency,
    expectedRole: databaseSet.d4ConsistencyRole,
    schema: "consistency",
    object: functionName,
    objectKind: "FUNCTION",
    operation: "EXECUTE",
    expected: "ALLOW",
    grantSource: "MIGRATION",
  }))
  add(...denyOperations(databaseSet, d4Consistency, databaseSet.d4ConsistencyRole, "evidence", "evidence.core_packet_versions", "TABLE", ["INSERT", "UPDATE", "DELETE"]))
  add(...denyOperations(databaseSet, d4Consistency, databaseSet.d4ConsistencyRole, "projection", "projection.mvp_projection_versions", "TABLE", ["INSERT", "UPDATE", "DELETE"]))
  add(...denyOperations(databaseSet, d4Consistency, databaseSet.d4ConsistencyRole, null, "roles", "ROLE", ["MANAGE_ROLE"]))

  const d4Evidence = {
    ...d4Consistency,
    stage: "EVIDENCE_PERSISTED",
    sourceFile: "lib/data-platform/consistency/evidence.ts",
    symbol: "MvpEvidenceStore",
    setRole: databaseSet.d4EvidenceRole,
    reason: "The evidence assembler reads governed Coverage and consistency results, then appends evidence packets.",
  }
  add(...tableOperations(databaseSet, d4Evidence, databaseSet.d4EvidenceRole, "coverage", ["projection_versions"], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Evidence, databaseSet.d4EvidenceRole, "consistency", ["immutable_results", "result_input_references", "immutable_result_diagnostics", "dependency_snapshots"], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Evidence, databaseSet.d4EvidenceRole, "evidence", [
    "core_assembly_profiles", "core_packet_identities", "core_candidates", "core_packet_versions",
    "core_packet_candidates", "core_packet_result_references", "core_packet_fact_references",
    "core_packet_requirements", "core_packet_lineage", "core_packet_conflicts", "mvp_market_assessments",
  ], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Evidence, databaseSet.d4EvidenceRole, "evidence", [
    "core_packet_identities", "core_candidates", "core_packet_versions", "core_packet_candidates",
    "core_packet_result_references", "core_packet_fact_references", "core_packet_requirements",
    "core_packet_lineage", "core_packet_conflicts", "mvp_market_assessments",
  ], ["INSERT"], "MIGRATION"))
  add(...denyOperations(databaseSet, d4Evidence, databaseSet.d4EvidenceRole, "projection", "projection.mvp_projection_versions", "TABLE", ["INSERT", "UPDATE", "DELETE"]))
  add(...denyOperations(databaseSet, d4Evidence, databaseSet.d4EvidenceRole, null, "roles", "ROLE", ["MANAGE_ROLE"]))

  const d4Projection = {
    ...d4Consistency,
    stage: "PROJECTION_AND_REPLAY_MATERIALIZED",
    sourceFile: "lib/data-platform/consistency-evidence/postgres/projectionStore.ts",
    symbol: "MvpProjectionStore",
    setRole: databaseSet.d4ProjectionRole,
    reason: "The projection builder reads governed evidence and appends projection dependencies and versions.",
  }
  add(...tableOperations(databaseSet, d4Projection, databaseSet.d4ProjectionRole, "coverage", ["projection_versions"], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Projection, databaseSet.d4ProjectionRole, "evidence", ["mvp_market_assessments", "core_packet_versions", "core_packet_result_references", "core_packet_fact_references"], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Projection, databaseSet.d4ProjectionRole, "consistency", ["immutable_results"], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Projection, databaseSet.d4ProjectionRole, "projection", ["mvp_projection_definitions", "mvp_projection_versions", "mvp_projection_dependencies", "mvp_projection_conflicts"], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, d4Projection, databaseSet.d4ProjectionRole, "projection", ["mvp_projection_versions", "mvp_projection_dependencies", "mvp_projection_conflicts"], ["INSERT"], "MIGRATION"))
  add(...denyOperations(databaseSet, d4Projection, databaseSet.d4ProjectionRole, "projection", "projection.mvp_consumer_exposure_decisions", "TABLE", ["INSERT", "UPDATE", "DELETE"]))
  add(...denyOperations(databaseSet, d4Projection, databaseSet.d4ProjectionRole, null, "roles", "ROLE", ["MANAGE_ROLE"]))

  const refreshRuntime = {
    phase: "ONE_DAY_PIPELINE",
    stage: "REFRESH_COORDINATION",
    sourceFile: "lib/data-platform/mvp-refresh/liveResumePostgres.ts",
    symbol: "PostgresLiveResumeExecutionStore",
    logicalDatabase: "REFRESH" as const,
    sessionRole: databaseSet.refreshRole,
    setRole: null,
    reason: "The isolated refresh owner coordinates append-only plans, units, leases, checkpoints, artifacts, watermarks, and inactive candidates.",
    runtimeKind: "CONTROL_PLANE" as const,
    exposureRelevant: false,
    idempotent: true,
  }
  add(...tableOperations(databaseSet, refreshRuntime, databaseSet.refreshRole, "refresh_control", [
    "refresh_policy", "refresh_plan", "refresh_run", "refresh_unit", "source_watermark",
    "source_availability_observation", "refresh_artifact", "refresh_candidate", "candidate_validation",
    "release_manifest", "release_manifest_entry", "release_comparison", "activation_readiness",
    "refresh_event", "refresh_lease", "source_contract", "controlled_retrieval", "controlled_candidate_set",
    "controlled_canonical_commit_set", "logical_slot_reconciliation",
  ], ["SELECT", "INSERT"], "OWNERSHIP"))
  add(...tableOperations(databaseSet, refreshRuntime, databaseSet.refreshRole, "refresh_control", ["refresh_run", "refresh_unit", "refresh_lease"], ["UPDATE"], "OWNERSHIP"))

  const servingPublisher = {
    phase: "BOOTSTRAP_AND_ONE_DAY_PIPELINE",
    stage: "SERVING_BASELINE_AND_CANDIDATE_PERSISTED",
    sourceFile: "lib/data-platform/mvp-serving/inactiveStaging.ts",
    symbol: "stageInactiveServingCandidate",
    logicalDatabase: "SERVING" as const,
    sessionRole: databaseSet.servingPublisherRole,
    setRole: null,
    reason: "The publisher reads the inactive candidate set and appends only immutable candidate payload and manifest rows.",
    runtimeKind: "RUNTIME" as const,
    exposureRelevant: true,
    idempotent: true,
  }
  add(...tableOperations(databaseSet, servingPublisher, databaseSet.servingPublisherRole, "serving", [
    "serving_corpus", "serving_projection", "serving_evidence_summary", "serving_replay_sequence",
    "serving_corpus_member", "serving_candidate_manifest", "serving_exposure",
  ], ["SELECT"], "BOOTSTRAP"))
  add(...tableOperations(databaseSet, servingPublisher, databaseSet.servingPublisherRole, "serving", [
    "serving_corpus", "serving_projection", "serving_evidence_summary", "serving_replay_sequence",
    "serving_corpus_member", "serving_candidate_manifest",
  ], ["INSERT"], "BOOTSTRAP"))
  add(...denyOperations(databaseSet, servingPublisher, databaseSet.servingPublisherRole, "serving", "serving.serving_exposure", "TABLE", ["INSERT", "UPDATE", "DELETE", "TRUNCATE"]))
  add(...denyOperations(databaseSet, servingPublisher, databaseSet.servingPublisherRole, "serving", "serving.serving_publication_event", "TABLE", ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]))
  add(...denyOperations(databaseSet, servingPublisher, databaseSet.servingPublisherRole, "serving_control", "serving_control", "SCHEMA", ["USAGE", "CREATE"]))
  add(...denyOperations(databaseSet, servingPublisher, databaseSet.servingPublisherRole, null, "roles", "ROLE", ["MANAGE_ROLE"]))

  const servingReader = {
    ...servingPublisher,
    stage: "SERVING_DURABLE_VERIFICATION",
    sourceFile: "lib/data-platform/mvp-serving/reader.ts",
    symbol: "PostgresMvpInactiveServingReadPort",
    sessionRole: databaseSet.servingReaderRole,
    reason: "The reader verifies serving payload, candidate inactivity, cutover state, and durable checksums without mutation.",
    runtimeKind: "RUNTIME" as const,
    idempotent: true,
  }
  add(...tableOperations(databaseSet, servingReader, databaseSet.servingReaderRole, "serving", [
    "serving_corpus", "serving_projection", "serving_evidence_summary", "serving_replay_sequence",
    "serving_demo_profile", "serving_exposure", "serving_release_inventory", "serving_publication_event",
    "serving_corpus_member", "serving_candidate_manifest",
  ], ["SELECT"], "MIGRATION"))
  add(...tableOperations(databaseSet, servingReader, databaseSet.servingReaderRole, "serving_control", [
    "cutover_approval", "cutover_authorization", "cutover_event", "cutover_authorization_consumption",
  ], ["SELECT"], "MIGRATION"))
  add(...denyOperations(databaseSet, servingReader, databaseSet.servingReaderRole, "serving", "serving.serving_corpus", "TABLE", ["INSERT", "UPDATE", "DELETE", "TRUNCATE"]))
  add(...denyOperations(databaseSet, servingReader, databaseSet.servingReaderRole, "serving_control", "serving_control.cutover_event", "TABLE", ["INSERT", "UPDATE", "DELETE", "TRUNCATE"]))
  add(...denyOperations(databaseSet, servingReader, databaseSet.servingReaderRole, null, "roles", "ROLE", ["MANAGE_ROLE"]))

  const servingMigration = {
    phase: "MIGRATION_AND_CONTROL_PREFLIGHT",
    stage: "SERVING_CONTROL_PLANE_CLOSURE",
    sourceFile: "lib/data-platform/mvp-refresh/greenCleanBootstrapRuntime.ts",
    symbol: "inspect",
    logicalDatabase: "SERVING" as const,
    sessionRole: databaseSet.d4OwnerRole,
    setRole: databaseSet.servingMigrationOwnerRole,
    reason: "Serving migration ledger and ownership checks execute as the database owner, never as the runtime publisher.",
    runtimeKind: "CONTROL_PLANE" as const,
    exposureRelevant: false,
    idempotent: true,
  }
  add(operation(databaseSet, {
    ...servingMigration,
    expectedRole: databaseSet.servingMigrationOwnerRole,
    schema: "serving_control",
    object: "migration_ledger",
    objectKind: "TABLE",
    operation: "SELECT",
    expected: "ALLOW",
    grantSource: "OWNERSHIP",
  }))
  add(operation(databaseSet, {
    ...servingMigration,
    expectedRole: databaseSet.servingMigrationOwnerRole,
    schema: "serving_control",
    object: "serving_control",
    objectKind: "SCHEMA",
    operation: "CREATE",
    expected: "ALLOW",
    grantSource: "OWNERSHIP",
  }))
  add(...denyOperations(databaseSet, servingPublisher, databaseSet.servingPublisherRole, "serving_control", "serving_control.migration_ledger", "TABLE", ["SELECT", "INSERT", "UPDATE", "DELETE"]))

  for (const runtimeRole of [
    "qt_d2_canonical_writer", "qt_d2_bounded_writer", "qt_d2_read_only",
    "qt_d3_scheduler", "qt_d3_coordinator", "qt_d3_worker", "qt_d3_read_only",
    databaseSet.d4ConsistencyRole, databaseSet.d4EvidenceRole, databaseSet.d4ProjectionRole,
    "qt_d4_projection_publisher", databaseSet.d4ReadOnlyRole,
    databaseSet.servingPublisherRole, databaseSet.servingReaderRole,
  ]) {
    const logicalDatabase: GreenCleanLogicalDatabase =
      runtimeRole.startsWith("qt_d2") || runtimeRole.startsWith("qt_d3") ? "BACKFILL"
        : runtimeRole.startsWith("qt_d4") ? "D4"
          : "SERVING"
    add(operation(databaseSet, {
      phase: "ROLE_CLOSURE",
      stage: "RUNTIME_ROLE_ISOLATION",
      sourceFile: "lib/data-platform/mvp-refresh/greenCleanPrivilegeMatrix.ts",
      symbol: "createGreenCleanPrivilegeMatrix",
      logicalDatabase,
      sessionRole: runtimeRole,
      setRole: null,
      schema: null,
      object: "roles",
      objectKind: "ROLE",
      operation: "MANAGE_ROLE",
      expected: "DENY",
      grantSource: "NONE",
      expectedRole: runtimeRole,
      reason: "Runtime roles must never manage roles or grants.",
      runtimeKind: "CONTROL_PLANE",
      exposureRelevant: runtimeRole === databaseSet.servingPublisherRole || runtimeRole === databaseSet.servingReaderRole,
      idempotent: true,
      testId: `role.isolation.${runtimeRole}.manage_role.deny`,
    }))
  }

  const schemaUsages = new Map<string, GreenCleanPrivilegeExpectation>()
  for (const item of operations) {
    if (item.expected !== "ALLOW" || !item.schema || !["TABLE", "FUNCTION", "SEQUENCE"].includes(item.objectKind)) continue
    const key = `${item.database}:${item.expectedRole}:${item.schema}`
    if (schemaUsages.has(key)) continue
    schemaUsages.set(key, operation(databaseSet, {
      phase: item.phase,
      stage: `${item.stage}_SCHEMA_ACCESS`,
      sourceFile: item.sourceFile,
      symbol: item.symbol,
      logicalDatabase: item.logicalDatabase,
      sessionRole: item.sessionRole,
      setRole: item.setRole,
      schema: item.schema,
      object: item.schema,
      objectKind: "SCHEMA",
      operation: "USAGE",
      expected: "ALLOW",
      grantSource: item.grantSource,
      expectedRole: item.expectedRole,
      reason: `Schema USAGE is required before ${item.expectedRole} can access its classified ${item.schema} objects.`,
      runtimeKind: item.runtimeKind,
      exposureRelevant: item.exposureRelevant,
      idempotent: true,
      testId: `schema.${item.logicalDatabase.toLowerCase()}.${item.expectedRole}.${item.schema}.usage.allow`,
    }))
  }
  operations.push(...schemaUsages.values())
  const frozenOperations = Object.freeze(operations)
  const d3Owned = (schema: string, object: string): boolean =>
    schema === "population"
    || (schema === "control" && /^(population_|retrieval_attempts$|retry_events$|claim_population_unit\(|heartbeat_population_lease\(|advance_population_unit\()/.test(object))
    || (schema === "quality" && /^candidate_/.test(object))
    || (schema === "coverage" && object === "watermark_eligibility_decisions")
  const ownerFor = (logical: GreenCleanLogicalDatabase, schema: string, object: string): string => {
    if (logical === "BACKFILL") return d3Owned(schema, object) ? databaseSet.d3Role : databaseSet.d2Role
    if (logical === "D4") return databaseSet.d4OwnerRole
    if (logical === "REFRESH") return databaseSet.refreshRole
    return databaseSet.servingMigrationOwnerRole
  }
  const ownershipMap = new Map<string, GreenCleanDatabaseOwnershipContract>()
  for (const item of frozenOperations) {
    if (!item.schema || !["SCHEMA", "TABLE", "SEQUENCE", "FUNCTION"].includes(item.objectKind)) continue
    const objectName = item.object.startsWith(`${item.schema}.`) ? item.object.slice(item.schema.length + 1) : item.object
    const schemaKey = `${item.logicalDatabase}:SCHEMA:${item.schema}`
    if (!ownershipMap.has(schemaKey)) {
      ownershipMap.set(schemaKey, Object.freeze({
        logicalDatabase: item.logicalDatabase,
        databaseName: item.database,
        objectKind: "SCHEMA",
        schema: item.schema,
        ownerRole: ownerFor(item.logicalDatabase, item.schema, ""),
      }))
    }
    if (item.objectKind === "SCHEMA") continue
    const key = `${item.logicalDatabase}:${item.objectKind}:${item.schema}.${objectName}`
    if (!ownershipMap.has(key)) {
      ownershipMap.set(key, Object.freeze({
        logicalDatabase: item.logicalDatabase,
        databaseName: item.database,
        objectKind: item.objectKind as Exclude<GreenCleanPrivilegeObjectKind, "DATABASE" | "SCHEMA" | "ROLE">,
        schema: item.schema,
        object: objectName,
        ownerRole: ownerFor(item.logicalDatabase, item.schema, objectName),
      }))
    }
  }
  const ownerships: readonly GreenCleanDatabaseOwnershipContract[] = Object.freeze([
    ...databaseOwnerships,
    ...ownershipMap.values(),
  ])
  const summary: GreenCleanPrivilegeMatrixSummary = Object.freeze({
    rolesInspected: roles.length,
    sqlOperationsClassified: frozenOperations.length,
    databasesCovered: Object.freeze([...new Set(frozenOperations.map((item) => item.database))].sort()),
    schemasCovered: new Set(frozenOperations.map((item) => item.schema).filter((value): value is string => Boolean(value))).size,
    objectsCovered: new Set(frozenOperations.map((item) => `${item.database}:${item.objectKind}:${item.object}`)).size,
    allowCount: frozenOperations.filter((item) => item.expected === "ALLOW").length,
    denyCount: frozenOperations.filter((item) => item.expected === "DENY").length,
    expectedDenialTests: frozenOperations.filter((item) => item.expected === "DENY").length,
    unclassifiedSqlOperations: 0,
  })
  const matrix = Object.freeze({
    version: GREEN_CLEAN_PRIVILEGE_MATRIX_VERSION,
    roles,
    memberships,
    ownerships,
    operations: frozenOperations,
    summary,
  })
  validateGreenCleanPrivilegeMatrix(matrix)
  return matrix
}

export function validateGreenCleanPrivilegeMatrix(matrix: GreenCleanPrivilegeMatrix): void {
  if (matrix.version !== GREEN_CLEAN_PRIVILEGE_MATRIX_VERSION) throw new Error("GREEN_CLEAN_PRIVILEGE_MATRIX_VERSION_INVALID")
  if (!matrix.roles.length || new Set(matrix.roles.map((item) => item.roleName)).size !== matrix.roles.length) throw new Error("GREEN_CLEAN_PRIVILEGE_ROLE_SET_INVALID")
  const databaseOwnerships = matrix.ownerships.filter((item) => item.objectKind === "DATABASE")
  if (databaseOwnerships.length !== 4 || new Set(databaseOwnerships.map((item) => item.databaseName)).size !== 4) throw new Error("GREEN_CLEAN_PRIVILEGE_OWNERSHIP_SET_INVALID")
  if (!matrix.operations.length || new Set(matrix.operations.map((item) => item.testId)).size !== matrix.operations.length) throw new Error("GREEN_CLEAN_PRIVILEGE_TEST_ID_DUPLICATE")
  const roles = new Set(matrix.roles.map((item) => item.roleName))
  if (matrix.ownerships.some((item) => !roles.has(item.ownerRole))) throw new Error("GREEN_CLEAN_PRIVILEGE_OWNER_ROLE_UNKNOWN")
  if (matrix.memberships.some((item) => !roles.has(item.grantedRole) || !roles.has(item.memberRole) || !item.setOption)) throw new Error("GREEN_CLEAN_PRIVILEGE_MEMBERSHIP_INVALID")
  if (matrix.operations.some((item) =>
    !item.phase || !item.stage || !item.sourceFile || !item.symbol || !item.database || !item.binding
    || !item.sessionRole || !item.object || !item.requiredPrivilege || !item.reason || !roles.has(item.expectedRole)
    || (item.expected === "ALLOW" && item.grantSource === "NONE")
    || (item.expected === "DENY" && item.grantSource !== "NONE")
  )) throw new Error("GREEN_CLEAN_PRIVILEGE_OPERATION_UNCLASSIFIED")
  const runtimeRoles = matrix.roles.filter((item) => !item.administrative && item.roleName !== matrix.ownerships.find((owner) => owner.logicalDatabase === "SERVING")?.ownerRole)
  if (runtimeRoles.some((item) => item.superuser || item.createDatabase || item.createRole || item.bypassRls)) throw new Error("GREEN_CLEAN_RUNTIME_ROLE_OVERPRIVILEGED")
  if (matrix.summary.unclassifiedSqlOperations !== 0
    || matrix.summary.sqlOperationsClassified !== matrix.operations.length
    || matrix.summary.rolesInspected !== matrix.roles.length
    || matrix.summary.allowCount + matrix.summary.denyCount !== matrix.operations.length
    || matrix.summary.expectedDenialTests !== matrix.summary.denyCount
  ) throw new Error("GREEN_CLEAN_PRIVILEGE_SUMMARY_INVALID")
}
