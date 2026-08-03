import postgres from "postgres"

import {
  inspectGreenCleanPrivilegeClosure,
  type GreenCleanExpectedDenialProbe,
  type GreenCleanPrivilegeClosureReport,
  type GreenCleanPrivilegeMatrixLike,
  type GreenCleanPrivilegeOperationLike,
  type GreenCleanPrivilegeQueryPort,
  type GreenCleanPrivilegeRoleLike,
  type GreenCleanPrivilegeTransactionContext,
  type GreenCleanPrivilegeTransactionPort,
} from "./greenCleanPrivilegeClosure"
import type { GreenCleanPrivilegeMatrix } from "./greenCleanPrivilegeMatrix"
import type { GreenCleanRebuildDatabaseSet } from "./greenCleanRebuildSafety"

export const GREEN_CLEAN_ROLE_PROBE_VERSION = "mvp-green-clean-role-probe/1.0.0" as const
export const GREEN_CLEAN_ROLE_PROBE_BINDING = "D4_ISOLATED_POSTGRES_URL" as const

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const POSTGRES_IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/
const PROBE_DATABASE = /^quantterminal_green_clean_role_probe_[a-z0-9]{8,24}$/

export interface GreenCleanRoleProbeConfiguration {
  readonly adminConnectionString: string
  readonly binding: typeof GREEN_CLEAN_ROLE_PROBE_BINDING
  readonly expectedPort: string
  readonly probeDatabaseName: string
  readonly databaseSet: GreenCleanRebuildDatabaseSet
  readonly forbiddenDatabaseNames: readonly string[]
}

export interface GreenCleanRoleProbeIdentity {
  readonly binding: typeof GREEN_CLEAN_ROLE_PROBE_BINDING
  readonly host: string
  readonly port: string
  readonly databaseName: string
  readonly adminDatabase: "postgres"
  readonly adminRole: "qt_d2_owner"
}

export interface GreenCleanRoleProbePlan {
  readonly databaseName: string
  readonly ownerRole: string
  readonly publisherRole: string
  readonly readerRole: string
  readonly setupStatements: readonly string[]
  readonly matrix: GreenCleanPrivilegeMatrixLike
  readonly denialProbes: readonly GreenCleanExpectedDenialProbe[]
}

export interface GreenCleanRoleProbeAdminVerification {
  readonly database: string
  readonly role: string
  readonly postgresMajor16: boolean
  readonly readWrite: boolean
  readonly canCreateDatabase: boolean
}

export interface GreenCleanRoleProbePort {
  verifyAdmin(): Promise<GreenCleanRoleProbeAdminVerification>
  databaseExists(databaseName: string): Promise<boolean>
  createDatabase(databaseName: string, ownerRole: string): Promise<void>
  initializeProbe(databaseName: string, statements: readonly string[]): Promise<void>
  queryPort(databaseName: string): GreenCleanPrivilegeQueryPort
  transactionPort(databaseName: string): GreenCleanPrivilegeTransactionPort
  releaseProbeConnection(databaseName: string): Promise<void>
  dropDatabase(databaseName: string): Promise<void>
  shutdown(): Promise<void>
}

export interface GreenCleanRoleProbeReport {
  readonly version: typeof GREEN_CLEAN_ROLE_PROBE_VERSION
  readonly status: "PASS" | "FAIL"
  readonly identity: GreenCleanRoleProbeIdentity
  readonly closure: GreenCleanPrivilegeClosureReport | null
  readonly created: boolean
  readonly dropped: boolean
  readonly retainedForDiagnosis: boolean
  readonly failure: string | null
}

type ProbeRoleName = "OWNER" | "PUBLISHER" | "READER"

function quoteIdentifier(value: string): string {
  if (!POSTGRES_IDENTIFIER.test(value)) throw new Error("GREEN_CLEAN_ROLE_PROBE_IDENTIFIER_INVALID")
  return `"${value.replaceAll("\"", "\"\"")}"`
}

function effectivePort(value: URL): string {
  return value.port || "5432"
}

function decoded(value: string, classification: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new Error(classification)
  }
}

function parseConfiguration(configuration: GreenCleanRoleProbeConfiguration): {
  readonly source: URL
  readonly identity: GreenCleanRoleProbeIdentity
} {
  if (configuration.binding !== GREEN_CLEAN_ROLE_PROBE_BINDING) {
    throw new Error("GREEN_CLEAN_ROLE_PROBE_BINDING_INVALID")
  }
  if (!PROBE_DATABASE.test(configuration.probeDatabaseName)) {
    throw new Error("GREEN_CLEAN_ROLE_PROBE_DATABASE_NAME_INVALID")
  }
  if (!/^[0-9]+$/.test(configuration.expectedPort) || Number(configuration.expectedPort) < 1 || Number(configuration.expectedPort) > 65_535) {
    throw new Error("GREEN_CLEAN_ROLE_PROBE_PORT_INVALID")
  }
  const protectedNames = new Set([
    configuration.databaseSet.backfillDatabase,
    configuration.databaseSet.d4Database,
    configuration.databaseSet.refreshDatabase,
    configuration.databaseSet.servingDatabase,
    "neondb",
    ...configuration.forbiddenDatabaseNames,
  ])
  if (protectedNames.has(configuration.probeDatabaseName)) {
    throw new Error("GREEN_CLEAN_ROLE_PROBE_DATABASE_PROTECTED")
  }
  let source: URL
  try {
    source = new URL(configuration.adminConnectionString)
  } catch {
    throw new Error("GREEN_CLEAN_ROLE_PROBE_ADMIN_URL_INVALID")
  }
  if (!/^postgres(?:ql)?:$/.test(source.protocol)) throw new Error("GREEN_CLEAN_ROLE_PROBE_ADMIN_PROTOCOL_INVALID")
  if (!LOOPBACK_HOSTS.has(source.hostname.toLowerCase())) throw new Error("GREEN_CLEAN_ROLE_PROBE_ADMIN_NOT_LOOPBACK")
  if (effectivePort(source) !== configuration.expectedPort) throw new Error("GREEN_CLEAN_ROLE_PROBE_ADMIN_PORT_MISMATCH")
  if (decoded(source.username, "GREEN_CLEAN_ROLE_PROBE_ADMIN_ROLE_INVALID") !== configuration.databaseSet.d4OwnerRole
    || configuration.databaseSet.d4OwnerRole !== "qt_d2_owner") {
    throw new Error("GREEN_CLEAN_ROLE_PROBE_ADMIN_ROLE_INVALID")
  }
  if (!source.password) throw new Error("GREEN_CLEAN_ROLE_PROBE_ADMIN_PASSWORD_REQUIRED")
  const database = decoded(source.pathname.replace(/^\/+/, ""), "GREEN_CLEAN_ROLE_PROBE_ADMIN_DATABASE_INVALID")
  if (database !== "postgres") throw new Error("GREEN_CLEAN_ROLE_PROBE_ADMIN_DATABASE_INVALID")
  if (source.searchParams.has("options") && /default_transaction_read_only\s*=\s*on/i.test(source.searchParams.get("options") ?? "")) {
    throw new Error("GREEN_CLEAN_ROLE_PROBE_ADMIN_READ_ONLY")
  }
  return Object.freeze({
    source,
    identity: Object.freeze({
      binding: GREEN_CLEAN_ROLE_PROBE_BINDING,
      host: source.hostname,
      port: effectivePort(source),
      databaseName: configuration.probeDatabaseName,
      adminDatabase: "postgres",
      adminRole: "qt_d2_owner",
    }),
  })
}

export function inspectGreenCleanRoleProbeSafety(configuration: GreenCleanRoleProbeConfiguration): GreenCleanRoleProbeIdentity {
  return parseConfiguration(configuration).identity
}

function roleByName(matrix: GreenCleanPrivilegeMatrix, roleName: string): GreenCleanPrivilegeRoleLike {
  const value = matrix.roles.find((role) => role.roleName === roleName)
  if (!value) throw new Error(`GREEN_CLEAN_ROLE_PROBE_CANONICAL_ROLE_MISSING:${roleName}`)
  return Object.freeze({
    roleName: value.roleName,
    login: value.login,
    inherit: value.inherit,
    bypassRls: value.bypassRls,
    createDatabase: value.createDatabase,
    createRole: value.createRole,
    superuser: value.superuser,
  })
}

function operation(
  database: string,
  role: string,
  input: {
    readonly id: string
    readonly setRole?: string
    readonly schema?: string
    readonly object: string
    readonly kind: GreenCleanPrivilegeOperationLike["objectKind"]
    readonly privilege: string
    readonly expected: "ALLOW" | "DENY"
  },
): GreenCleanPrivilegeOperationLike {
  return Object.freeze({
    testId: `role-probe.${input.id}`,
    database,
    sessionRole: role,
    setRole: input.setRole ?? null,
    schema: input.kind === "SCHEMA" ? null : input.schema ?? null,
    object: input.object,
    objectKind: input.kind,
    operation: input.privilege,
    requiredPrivilege: input.privilege,
    expected: input.expected,
    expectedRole: input.setRole ?? role,
  })
}

function denial(testId: string, database: string, role: string, statement: string): GreenCleanExpectedDenialProbe {
  return Object.freeze({
    testId,
    database,
    role,
    statement,
    expectedSqlStates: Object.freeze(["42501"]),
  })
}

function setupStatements(database: string, owner: string, publisher: string, reader: string): readonly string[] {
  const db = quoteIdentifier(database)
  const ownerId = quoteIdentifier(owner)
  const publisherId = quoteIdentifier(publisher)
  const readerId = quoteIdentifier(reader)
  return Object.freeze([
    `SET ROLE ${ownerId}`,
    `CREATE SCHEMA serving AUTHORIZATION ${ownerId}`,
    `CREATE SCHEMA serving_control AUTHORIZATION ${ownerId}`,
    "CREATE TABLE serving.serving_corpus (probe_id text PRIMARY KEY)",
    "CREATE TABLE serving.serving_candidate_manifest (probe_id text PRIMARY KEY)",
    "CREATE TABLE serving.serving_exposure (probe_id text PRIMARY KEY)",
    "CREATE TABLE serving.serving_publication_event (probe_id text PRIMARY KEY)",
    "CREATE TABLE serving_control.migration_ledger (probe_id text PRIMARY KEY)",
    "CREATE TABLE serving_control.cutover_approval (probe_id text PRIMARY KEY)",
    "CREATE TABLE serving_control.cutover_authorization (probe_id text PRIMARY KEY)",
    "CREATE TABLE serving_control.cutover_event (probe_id text PRIMARY KEY)",
    "CREATE TABLE serving_control.cutover_authorization_consumption (probe_id text PRIMARY KEY)",
    "RESET ROLE",
    `REVOKE CONNECT ON DATABASE ${db} FROM PUBLIC`,
    `GRANT CONNECT ON DATABASE ${db} TO ${publisherId}, ${readerId}`,
    `GRANT USAGE ON SCHEMA serving TO ${publisherId}, ${readerId}`,
    `GRANT SELECT, INSERT ON TABLE serving.serving_corpus, serving.serving_candidate_manifest TO ${publisherId}`,
    `GRANT SELECT ON TABLE serving.serving_exposure TO ${publisherId}`,
    `GRANT SELECT ON TABLE serving.serving_corpus, serving.serving_candidate_manifest, serving.serving_exposure, serving.serving_publication_event TO ${readerId}`,
    `GRANT USAGE ON SCHEMA serving_control TO ${readerId}`,
    `GRANT SELECT ON TABLE serving_control.cutover_approval, serving_control.cutover_authorization, serving_control.cutover_event, serving_control.cutover_authorization_consumption TO ${readerId}`,
  ])
}

export function createGreenCleanRoleProbePlan(
  configuration: GreenCleanRoleProbeConfiguration,
  canonicalMatrix: GreenCleanPrivilegeMatrix,
): GreenCleanRoleProbePlan {
  inspectGreenCleanRoleProbeSafety(configuration)
  const database = configuration.probeDatabaseName
  const owner = configuration.databaseSet.servingMigrationOwnerRole
  const publisher = configuration.databaseSet.servingPublisherRole
  const reader = configuration.databaseSet.servingReaderRole
  const admin = configuration.databaseSet.d4OwnerRole
  const roles: Readonly<Record<ProbeRoleName, GreenCleanPrivilegeRoleLike>> = Object.freeze({
    OWNER: roleByName(canonicalMatrix, owner),
    PUBLISHER: roleByName(canonicalMatrix, publisher),
    READER: roleByName(canonicalMatrix, reader),
  })
  const operations: GreenCleanPrivilegeOperationLike[] = [
    operation(database, publisher, { id: "publisher.connect", object: database, kind: "DATABASE", privilege: "CONNECT", expected: "ALLOW" }),
    operation(database, reader, { id: "reader.connect", object: database, kind: "DATABASE", privilege: "CONNECT", expected: "ALLOW" }),
    operation(database, admin, { id: "admin.set-owner", setRole: owner, object: owner, kind: "ROLE", privilege: "SET_ROLE", expected: "ALLOW" }),
    operation(database, owner, { id: "owner.control-create", schema: "serving_control", object: "serving_control", kind: "SCHEMA", privilege: "CREATE", expected: "ALLOW" }),
    operation(database, owner, { id: "owner.ledger-select", schema: "serving_control", object: "migration_ledger", kind: "TABLE", privilege: "SELECT", expected: "ALLOW" }),
    operation(database, publisher, { id: "publisher.serving-usage", schema: "serving", object: "serving", kind: "SCHEMA", privilege: "USAGE", expected: "ALLOW" }),
    operation(database, publisher, { id: "publisher.corpus-select", schema: "serving", object: "serving_corpus", kind: "TABLE", privilege: "SELECT", expected: "ALLOW" }),
    operation(database, publisher, { id: "publisher.corpus-insert", schema: "serving", object: "serving_corpus", kind: "TABLE", privilege: "INSERT", expected: "ALLOW" }),
    operation(database, publisher, { id: "publisher.manifest-select", schema: "serving", object: "serving_candidate_manifest", kind: "TABLE", privilege: "SELECT", expected: "ALLOW" }),
    operation(database, publisher, { id: "publisher.manifest-insert", schema: "serving", object: "serving_candidate_manifest", kind: "TABLE", privilege: "INSERT", expected: "ALLOW" }),
    operation(database, publisher, { id: "publisher.exposure-select", schema: "serving", object: "serving_exposure", kind: "TABLE", privilege: "SELECT", expected: "ALLOW" }),
    operation(database, reader, { id: "reader.serving-usage", schema: "serving", object: "serving", kind: "SCHEMA", privilege: "USAGE", expected: "ALLOW" }),
    operation(database, reader, { id: "reader.control-usage", schema: "serving_control", object: "serving_control", kind: "SCHEMA", privilege: "USAGE", expected: "ALLOW" }),
    operation(database, reader, { id: "reader.corpus-select", schema: "serving", object: "serving_corpus", kind: "TABLE", privilege: "SELECT", expected: "ALLOW" }),
    operation(database, reader, { id: "reader.cutover-select", schema: "serving_control", object: "cutover_event", kind: "TABLE", privilege: "SELECT", expected: "ALLOW" }),
  ]
  const denied: Array<{
    readonly id: string
    readonly role: string
    readonly schema?: string
    readonly object: string
    readonly kind: GreenCleanPrivilegeOperationLike["objectKind"]
    readonly privilege: string
    readonly statement: string
  }> = [
    { id: "publisher.exposure-insert", role: publisher, schema: "serving", object: "serving_exposure", kind: "TABLE", privilege: "INSERT", statement: "INSERT INTO serving.serving_exposure(probe_id) VALUES ('forbidden')" },
    { id: "publisher.exposure-update", role: publisher, schema: "serving", object: "serving_exposure", kind: "TABLE", privilege: "UPDATE", statement: "UPDATE serving.serving_exposure SET probe_id='forbidden'" },
    { id: "publisher.exposure-delete", role: publisher, schema: "serving", object: "serving_exposure", kind: "TABLE", privilege: "DELETE", statement: "DELETE FROM serving.serving_exposure" },
    { id: "publisher.exposure-truncate", role: publisher, schema: "serving", object: "serving_exposure", kind: "TABLE", privilege: "TRUNCATE", statement: "TRUNCATE TABLE serving.serving_exposure" },
    { id: "publisher.publication-select", role: publisher, schema: "serving", object: "serving_publication_event", kind: "TABLE", privilege: "SELECT", statement: "SELECT probe_id FROM serving.serving_publication_event" },
    { id: "publisher.publication-insert", role: publisher, schema: "serving", object: "serving_publication_event", kind: "TABLE", privilege: "INSERT", statement: "INSERT INTO serving.serving_publication_event(probe_id) VALUES ('forbidden')" },
    { id: "publisher.publication-update", role: publisher, schema: "serving", object: "serving_publication_event", kind: "TABLE", privilege: "UPDATE", statement: "UPDATE serving.serving_publication_event SET probe_id='forbidden'" },
    { id: "publisher.publication-delete", role: publisher, schema: "serving", object: "serving_publication_event", kind: "TABLE", privilege: "DELETE", statement: "DELETE FROM serving.serving_publication_event" },
    { id: "publisher.publication-truncate", role: publisher, schema: "serving", object: "serving_publication_event", kind: "TABLE", privilege: "TRUNCATE", statement: "TRUNCATE TABLE serving.serving_publication_event" },
    { id: "publisher.control-usage", role: publisher, schema: "serving_control", object: "serving_control", kind: "SCHEMA", privilege: "USAGE", statement: "SELECT probe_id FROM serving_control.migration_ledger" },
    { id: "publisher.control-create", role: publisher, schema: "serving_control", object: "serving_control", kind: "SCHEMA", privilege: "CREATE", statement: "CREATE TABLE serving_control.forbidden_probe(probe_id text)" },
    { id: "publisher.role-management", role: publisher, object: publisher, kind: "ROLE", privilege: "MANAGE_ROLE", statement: `ALTER ROLE ${quoteIdentifier(reader)} NOLOGIN` },
    { id: "reader.corpus-insert", role: reader, schema: "serving", object: "serving_corpus", kind: "TABLE", privilege: "INSERT", statement: "INSERT INTO serving.serving_corpus(probe_id) VALUES ('forbidden')" },
    { id: "reader.corpus-update", role: reader, schema: "serving", object: "serving_corpus", kind: "TABLE", privilege: "UPDATE", statement: "UPDATE serving.serving_corpus SET probe_id='forbidden'" },
    { id: "reader.corpus-delete", role: reader, schema: "serving", object: "serving_corpus", kind: "TABLE", privilege: "DELETE", statement: "DELETE FROM serving.serving_corpus" },
    { id: "reader.corpus-truncate", role: reader, schema: "serving", object: "serving_corpus", kind: "TABLE", privilege: "TRUNCATE", statement: "TRUNCATE TABLE serving.serving_corpus" },
    { id: "reader.cutover-insert", role: reader, schema: "serving_control", object: "cutover_event", kind: "TABLE", privilege: "INSERT", statement: "INSERT INTO serving_control.cutover_event(probe_id) VALUES ('forbidden')" },
    { id: "reader.cutover-update", role: reader, schema: "serving_control", object: "cutover_event", kind: "TABLE", privilege: "UPDATE", statement: "UPDATE serving_control.cutover_event SET probe_id='forbidden'" },
    { id: "reader.cutover-delete", role: reader, schema: "serving_control", object: "cutover_event", kind: "TABLE", privilege: "DELETE", statement: "DELETE FROM serving_control.cutover_event" },
    { id: "reader.cutover-truncate", role: reader, schema: "serving_control", object: "cutover_event", kind: "TABLE", privilege: "TRUNCATE", statement: "TRUNCATE TABLE serving_control.cutover_event" },
    { id: "reader.role-management", role: reader, object: reader, kind: "ROLE", privilege: "MANAGE_ROLE", statement: `ALTER ROLE ${quoteIdentifier(publisher)} NOLOGIN` },
  ]
  for (const item of denied) {
    operations.push(operation(database, item.role, {
      id: item.id,
      schema: item.schema,
      object: item.object,
      kind: item.kind,
      privilege: item.privilege,
      expected: "DENY",
    }))
  }
  const matrix: GreenCleanPrivilegeMatrixLike = Object.freeze({
    roles: Object.freeze([roles.OWNER, roles.PUBLISHER, roles.READER]),
    ownerships: Object.freeze([
      Object.freeze({ databaseName: database, objectKind: "DATABASE" as const, ownerRole: owner }),
      Object.freeze({ databaseName: database, objectKind: "SCHEMA" as const, schema: "serving", ownerRole: owner }),
      Object.freeze({ databaseName: database, objectKind: "SCHEMA" as const, schema: "serving_control", ownerRole: owner }),
      ...[
        ["serving", "serving_corpus"],
        ["serving", "serving_candidate_manifest"],
        ["serving", "serving_exposure"],
        ["serving", "serving_publication_event"],
        ["serving_control", "migration_ledger"],
        ["serving_control", "cutover_approval"],
        ["serving_control", "cutover_authorization"],
        ["serving_control", "cutover_event"],
        ["serving_control", "cutover_authorization_consumption"],
      ].map(([schema, object]) => Object.freeze({
        databaseName: database,
        objectKind: "TABLE" as const,
        schema,
        object,
        ownerRole: owner,
      })),
    ]),
    operations: Object.freeze(operations),
  })
  return Object.freeze({
    databaseName: database,
    ownerRole: owner,
    publisherRole: publisher,
    readerRole: reader,
    setupStatements: setupStatements(database, owner, publisher, reader),
    matrix,
    denialProbes: Object.freeze(denied.map((item) =>
      denial(`role-probe.${item.id}`, database, item.role, item.statement))),
  })
}

function sanitizedError(error: unknown): string {
  if (error instanceof Error && /^GREEN_CLEAN_[A-Z0-9_:.-]+$/.test(error.message)) return error.message
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[0-9A-Z]{5,}$/.test(error.code)) {
    return `GREEN_CLEAN_ROLE_PROBE_POSTGRES_FAILED:${error.code}`
  }
  return "GREEN_CLEAN_ROLE_PROBE_FAILED"
}

export async function executeGreenCleanRoleProbeWithPort(
  configuration: GreenCleanRoleProbeConfiguration,
  canonicalMatrix: GreenCleanPrivilegeMatrix,
  port: GreenCleanRoleProbePort,
): Promise<GreenCleanRoleProbeReport> {
  const identity = inspectGreenCleanRoleProbeSafety(configuration)
  const plan = createGreenCleanRoleProbePlan(configuration, canonicalMatrix)
  let created = false
  let released = false
  try {
    const admin = await port.verifyAdmin()
    if (
      admin.database !== "postgres"
      || admin.role !== "qt_d2_owner"
      || !admin.postgresMajor16
      || !admin.readWrite
      || !admin.canCreateDatabase
    ) throw new Error("GREEN_CLEAN_ROLE_PROBE_ADMIN_IDENTITY_UNPROVEN")
    if (await port.databaseExists(plan.databaseName)) throw new Error("GREEN_CLEAN_ROLE_PROBE_DATABASE_COLLISION")
    await port.createDatabase(plan.databaseName, plan.ownerRole)
    created = true
    await port.initializeProbe(plan.databaseName, plan.setupStatements)
    const queryPort = port.queryPort(plan.databaseName)
    const transactionPort = port.transactionPort(plan.databaseName)
    const closure = await inspectGreenCleanPrivilegeClosure(
      plan.matrix,
      { [plan.databaseName]: queryPort },
      {
        roleCatalogDatabase: plan.databaseName,
        denialProbes: plan.denialProbes,
        denialPorts: { [plan.databaseName]: transactionPort },
        requireDenialProbeForEachDeniedOperation: true,
      },
    )
    await port.releaseProbeConnection(plan.databaseName)
    released = true
    if (closure.status !== "PASS") {
      return Object.freeze({
        version: GREEN_CLEAN_ROLE_PROBE_VERSION,
        status: "FAIL",
        identity,
        closure,
        created,
        dropped: false,
        retainedForDiagnosis: true,
        failure: "GREEN_CLEAN_ROLE_PROBE_CLOSURE_FAILED",
      })
    }
    await port.dropDatabase(plan.databaseName)
    return Object.freeze({
      version: GREEN_CLEAN_ROLE_PROBE_VERSION,
      status: "PASS",
      identity,
      closure,
      created,
      dropped: true,
      retainedForDiagnosis: false,
      failure: null,
    })
  } catch (error) {
    if (created && !released) await port.releaseProbeConnection(plan.databaseName).catch(() => undefined)
    return Object.freeze({
      version: GREEN_CLEAN_ROLE_PROBE_VERSION,
      status: "FAIL",
      identity,
      closure: null,
      created,
      dropped: false,
      retainedForDiagnosis: created,
      failure: sanitizedError(error),
    })
  } finally {
    await port.shutdown().catch(() => undefined)
  }
}

class PostgresRoleProbePort implements GreenCleanRoleProbePort {
  private readonly admin: postgres.Sql
  private readonly probes = new Map<string, postgres.Sql>()

  constructor(private readonly source: URL) {
    this.admin = postgres(source.toString(), {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 30,
      connection: {
        application_name: "mvp-green-clean-role-probe-admin",
        statement_timeout: 30_000,
        lock_timeout: 5_000,
        idle_in_transaction_session_timeout: 30_000,
      },
    })
  }

  async verifyAdmin(): Promise<GreenCleanRoleProbeAdminVerification> {
    const rows = await this.admin.unsafe<Array<{
      database_name: string
      role_name: string
      version: number
      read_only: string
      can_create_database: boolean
    }>>(
      "SELECT current_database() database_name,current_user role_name,current_setting('server_version_num')::int version,current_setting('transaction_read_only') read_only,(r.rolsuper OR r.rolcreatedb) can_create_database FROM pg_roles r WHERE r.rolname=current_user",
    )
    const row = rows[0]
    return Object.freeze({
      database: row?.database_name ?? "UNAVAILABLE",
      role: row?.role_name ?? "UNAVAILABLE",
      postgresMajor16: Boolean(row && row.version >= 160_000 && row.version < 170_000),
      readWrite: row?.read_only === "off",
      canCreateDatabase: row?.can_create_database === true,
    })
  }

  async databaseExists(databaseName: string): Promise<boolean> {
    const rows = await this.admin.unsafe<Array<{ present: boolean }>>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname=$1) present",
      [databaseName],
    )
    return rows[0]?.present === true
  }

  async createDatabase(databaseName: string, ownerRole: string): Promise<void> {
    await this.admin.unsafe(`CREATE DATABASE ${quoteIdentifier(databaseName)} OWNER ${quoteIdentifier(ownerRole)}`)
  }

  async initializeProbe(databaseName: string, statements: readonly string[]): Promise<void> {
    const sql = this.probe(databaseName)
    for (const statement of statements) await sql.unsafe(statement)
  }

  queryPort(databaseName: string): GreenCleanPrivilegeQueryPort {
    const sql = this.probe(databaseName)
    return {
      query: <T extends Record<string, unknown>>(statement: string, parameters: readonly unknown[] = []) =>
        sql.unsafe<T[]>(statement, [...parameters] as never[]),
    }
  }

  transactionPort(databaseName: string): GreenCleanPrivilegeTransactionPort {
    const sql = this.probe(databaseName)
    const query = <T extends Record<string, unknown>>(statement: string, parameters: readonly unknown[] = []) =>
      sql.unsafe<T[]>(statement, [...parameters] as never[])
    return {
      query,
      transaction: <T>(work: (transaction: GreenCleanPrivilegeTransactionContext) => Promise<T>) =>
        sql.begin((transaction) => work({
          query: <R extends Record<string, unknown>>(statement: string, parameters: readonly unknown[] = []) =>
            transaction.unsafe<R[]>(statement, [...parameters] as never[]),
          savepoint: <R>(savepointWork: (savepoint: GreenCleanPrivilegeQueryPort) => Promise<R>) =>
            transaction.savepoint((savepoint) => savepointWork({
              query: <Q extends Record<string, unknown>>(statement: string, parameters: readonly unknown[] = []) =>
                savepoint.unsafe<Q[]>(statement, [...parameters] as never[]),
            })) as Promise<R>,
        })) as Promise<T>,
    }
  }

  async releaseProbeConnection(databaseName: string): Promise<void> {
    const sql = this.probes.get(databaseName)
    if (!sql) return
    this.probes.delete(databaseName)
    await sql.end({ timeout: 5 })
  }

  async dropDatabase(databaseName: string): Promise<void> {
    if (this.probes.has(databaseName)) throw new Error("GREEN_CLEAN_ROLE_PROBE_CONNECTION_STILL_OPEN")
    await this.admin.unsafe(`DROP DATABASE ${quoteIdentifier(databaseName)}`)
  }

  async shutdown(): Promise<void> {
    await Promise.all([...this.probes.values()].map((sql) => sql.end({ timeout: 5 }).catch(() => undefined)))
    this.probes.clear()
    await this.admin.end({ timeout: 5 })
  }

  private probe(databaseName: string): postgres.Sql {
    const existing = this.probes.get(databaseName)
    if (existing) return existing
    const target = new URL(this.source.toString())
    target.pathname = `/${databaseName}`
    const sql = postgres(target.toString(), {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 30,
      connection: {
        application_name: "mvp-green-clean-role-probe",
        statement_timeout: 30_000,
        lock_timeout: 5_000,
        idle_in_transaction_session_timeout: 30_000,
      },
    })
    this.probes.set(databaseName, sql)
    return sql
  }
}

export async function runGreenCleanRoleProbe(
  configuration: GreenCleanRoleProbeConfiguration,
  canonicalMatrix: GreenCleanPrivilegeMatrix,
): Promise<GreenCleanRoleProbeReport> {
  const parsed = parseConfiguration(configuration)
  return executeGreenCleanRoleProbeWithPort(
    configuration,
    canonicalMatrix,
    new PostgresRoleProbePort(parsed.source),
  )
}
