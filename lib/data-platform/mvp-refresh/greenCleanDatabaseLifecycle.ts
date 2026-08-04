import postgres from "postgres"
import { MVP_GREEN_MIGRATION_OWNER_ROLE } from "@/lib/data-platform/mvp-release"

import { createGreenCleanTopology, type GreenCleanDatabase } from "./greenCleanRebuild"
import type { GreenCleanRebuildDatabaseSet } from "./greenCleanRebuildSafety"

export type GreenCleanDatabaseBinding = "D2_D3_INTEGRATED" | "D4_ISOLATED" | "MVP_REFRESH_ISOLATED" | "MVP_SERVING_ISOLATED"
export type GreenCleanDatabaseExistingState = "ABSENT" | "EMPTY" | "RECONCILED" | "CONFLICT"
export type GreenCleanDatabaseLifecycleOutcome = "CREATED" | "EMPTY" | "RECONCILED"
export type GreenCleanAdminSourceBinding = "D4_ISOLATED_POSTGRES_URL" | "MVP_REFRESH_ISOLATED_POSTGRES_URL"

export interface GreenCleanDatabaseSpecification {
  readonly database: GreenCleanDatabase
  readonly binding: GreenCleanDatabaseBinding
  readonly databaseName: string
  readonly ownerRole: string
}

export interface GreenCleanAdminVerification {
  readonly database: string
  readonly role: string
  readonly postgresMajor16: boolean
  readonly readWrite: boolean
  readonly canCreateDatabase: boolean
  readonly managed?: boolean
}

export interface GreenCleanAdminTargetPolicy {
  readonly kind: "LOCAL" | "MANAGED"
  readonly expectedHost?: string
  readonly expectedRole?: string
}

export interface GreenCleanDatabaseInspection {
  readonly exists: boolean
  readonly ownerRole: string | null
  readonly state: GreenCleanDatabaseExistingState
}

export interface GreenCleanDatabaseLifecyclePort {
  verifyAdmin(): Promise<GreenCleanAdminVerification>
  verifyOwnerRoles(roles: readonly string[]): Promise<boolean>
  inspectDatabase(specification: GreenCleanDatabaseSpecification): Promise<GreenCleanDatabaseInspection>
  createDatabase(specification: GreenCleanDatabaseSpecification): Promise<void>
  redactedIdentity(specification: GreenCleanDatabaseSpecification): GreenCleanDatabaseLifecycleResult["identities"][number]
  shutdown(): Promise<void>
}

export interface GreenCleanExistingDatabaseStateInput {
  readonly specification: GreenCleanDatabaseSpecification
  readonly userSchemaCount: number
  readonly userRelationCount: number
  readonly userFunctionCount: number
  readonly userTypeCount: number
  readonly userExtensionCount: number
  readonly readOnlyQuery: <T extends Record<string, unknown>[]>(
    statement: string,
    parameters?: readonly unknown[],
  ) => Promise<T>
}

export type GreenCleanExistingDatabaseVerifier = (
  input: GreenCleanExistingDatabaseStateInput,
) => Promise<Extract<GreenCleanDatabaseExistingState, "RECONCILED" | "CONFLICT">>

export interface GreenCleanDatabaseLifecycleResult {
  readonly outcomes: Readonly<Record<GreenCleanDatabase, GreenCleanDatabaseLifecycleOutcome>>
  readonly identities: readonly {
    readonly database: GreenCleanDatabase
    readonly binding: GreenCleanDatabaseBinding
    readonly host: string
    readonly port: string
    readonly databaseName: string
    readonly ownerRole: string
  }[]
  readonly createdCount: number
}

const POSTGRES_IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

function assertIdentifier(value: string, code: string): void {
  if (!POSTGRES_IDENTIFIER.test(value)) throw new Error(code)
}

function assertExactSpecifications(specifications: readonly GreenCleanDatabaseSpecification[]): void {
  if (specifications.length !== 4 || new Set(specifications.map((value) => value.databaseName)).size !== 4) {
    throw new Error("GREEN_CLEAN_DATABASE_SPECIFICATIONS_INVALID")
  }
  const exact = Object.freeze({
    BACKFILL: ["D2_D3_INTEGRATED", "qt_d2_backfill_owner"],
    D4: ["D4_ISOLATED", "qt_d2_owner"],
    REFRESH: ["MVP_REFRESH_ISOLATED", "qt_d2_owner"],
    SERVING: ["MVP_SERVING_ISOLATED", MVP_GREEN_MIGRATION_OWNER_ROLE],
  } satisfies Record<GreenCleanDatabase, readonly [GreenCleanDatabaseBinding, string]>)
  for (const specification of specifications) {
    assertIdentifier(specification.databaseName, "GREEN_CLEAN_DATABASE_NAME_INVALID")
    assertIdentifier(specification.ownerRole, "GREEN_CLEAN_DATABASE_OWNER_INVALID")
    const expected = exact[specification.database]
    if (specification.binding !== expected[0] || specification.ownerRole !== expected[1]) {
      throw new Error("GREEN_CLEAN_DATABASE_SPECIFICATION_CONFLICT")
    }
  }
}

export function greenCleanDatabaseSpecifications(databaseSet: GreenCleanRebuildDatabaseSet): readonly GreenCleanDatabaseSpecification[] {
  createGreenCleanTopology(databaseSet)
  const specifications = Object.freeze([
    Object.freeze({ database: "BACKFILL", binding: "D2_D3_INTEGRATED", databaseName: databaseSet.backfillDatabase, ownerRole: databaseSet.d2Role }),
    Object.freeze({ database: "D4", binding: "D4_ISOLATED", databaseName: databaseSet.d4Database, ownerRole: databaseSet.d4OwnerRole }),
    Object.freeze({ database: "REFRESH", binding: "MVP_REFRESH_ISOLATED", databaseName: databaseSet.refreshDatabase, ownerRole: databaseSet.refreshRole }),
    Object.freeze({ database: "SERVING", binding: "MVP_SERVING_ISOLATED", databaseName: databaseSet.servingDatabase, ownerRole: databaseSet.servingMigrationOwnerRole }),
  ] satisfies readonly GreenCleanDatabaseSpecification[])
  assertExactSpecifications(specifications)
  return specifications
}

function parseAdminSource(sourceConnectionString: string, sourceBinding: GreenCleanAdminSourceBinding, policy: GreenCleanAdminTargetPolicy = { kind: "LOCAL" }): URL {
  if (sourceBinding !== "D4_ISOLATED_POSTGRES_URL" && sourceBinding !== "MVP_REFRESH_ISOLATED_POSTGRES_URL") {
    throw new Error("GREEN_CLEAN_ADMIN_SOURCE_BINDING_INVALID")
  }
  let source: URL
  try {
    source = new URL(sourceConnectionString)
  } catch {
    throw new Error("GREEN_CLEAN_ADMIN_SOURCE_URL_INVALID")
  }
  if (!/^postgres(?:ql)?:$/.test(source.protocol)) throw new Error("GREEN_CLEAN_ADMIN_SOURCE_PROTOCOL_INVALID")
  const host = source.hostname.toLowerCase()
  if (policy.kind === "LOCAL" && !LOOPBACK_HOSTS.has(host)) throw new Error("GREEN_CLEAN_ADMIN_SOURCE_NOT_LOOPBACK")
  if (policy.kind === "MANAGED" && (LOOPBACK_HOSTS.has(host) || !policy.expectedHost || host !== policy.expectedHost.toLowerCase())) {
    throw new Error("GREEN_CLEAN_MANAGED_ADMIN_HOST_MISMATCH")
  }
  let role: string
  try {
    role = decodeURIComponent(source.username)
  } catch {
    throw new Error("GREEN_CLEAN_ADMIN_SOURCE_ROLE_INVALID")
  }
  const expectedRole = policy.kind === "MANAGED" ? policy.expectedRole : "qt_d2_owner"
  if (!expectedRole || role !== expectedRole) throw new Error("GREEN_CLEAN_ADMIN_SOURCE_ROLE_INVALID")
  if (!source.password) throw new Error("GREEN_CLEAN_ADMIN_SOURCE_PASSWORD_REQUIRED")
  if (!source.pathname.replace(/^\/+/, "")) throw new Error("GREEN_CLEAN_ADMIN_SOURCE_DATABASE_REQUIRED")
  if (source.port && (!/^[0-9]+$/.test(source.port) || Number(source.port) < 1 || Number(source.port) > 65_535)) {
    throw new Error("GREEN_CLEAN_ADMIN_SOURCE_PORT_INVALID")
  }
  return source
}

export function deriveGreenCleanAdminConnectionString(
  sourceConnectionString: string,
  sourceBinding: GreenCleanAdminSourceBinding,
  policy: GreenCleanAdminTargetPolicy = { kind: "LOCAL" },
): string {
  const admin = new URL(parseAdminSource(sourceConnectionString, sourceBinding, policy).toString())
  if (policy.kind === "LOCAL") admin.pathname = "/postgres"
  return admin.toString()
}

function targetConnectionString(adminConnectionString: string, databaseName: string): string {
  assertIdentifier(databaseName, "GREEN_CLEAN_DATABASE_NAME_INVALID")
  const target = new URL(adminConnectionString)
  target.pathname = `/${databaseName}`
  return target.toString()
}

function redactedIdentity(
  source: URL,
  specification: GreenCleanDatabaseSpecification,
): GreenCleanDatabaseLifecycleResult["identities"][number] {
  return Object.freeze({
    database: specification.database,
    binding: specification.binding,
    host: source.hostname,
    port: source.port || "5432",
    databaseName: specification.databaseName,
    ownerRole: specification.ownerRole,
  })
}

function quoteIdentifier(value: string): string {
  assertIdentifier(value, "GREEN_CLEAN_POSTGRES_IDENTIFIER_INVALID")
  return `"${value.replaceAll("\"", "\"\"")}"`
}

function sanitizedPostgresCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[0-9A-Z]{5,}$/.test(error.code)) {
    return error.code
  }
  return "NO_CODE"
}

export class GreenCleanPostgresDatabaseAdminPort implements GreenCleanDatabaseLifecyclePort {
  private readonly source: URL
  private readonly adminConnectionString: string
  private readonly sql: postgres.Sql
  private readonly expectedSpecifications: ReadonlyMap<GreenCleanDatabase, GreenCleanDatabaseSpecification>

  constructor(
    sourceConnectionString: string,
    sourceBinding: GreenCleanAdminSourceBinding,
    databaseSet: GreenCleanRebuildDatabaseSet,
    private readonly existingDatabaseVerifier?: GreenCleanExistingDatabaseVerifier,
    private readonly targetPolicy: GreenCleanAdminTargetPolicy = { kind: "LOCAL" },
  ) {
    this.source = parseAdminSource(sourceConnectionString, sourceBinding, targetPolicy)
    const specifications = greenCleanDatabaseSpecifications(databaseSet)
    this.expectedSpecifications = new Map(specifications.map((specification) => [specification.database, specification]))
    this.adminConnectionString = deriveGreenCleanAdminConnectionString(sourceConnectionString, sourceBinding, targetPolicy)
    this.sql = postgres(this.adminConnectionString, {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 30,
      connection: {
        application_name: "mvp-green-clean-database-lifecycle",
        statement_timeout: 30_000,
        lock_timeout: 5_000,
        idle_in_transaction_session_timeout: 30_000,
      },
    })
  }

  async verifyAdmin(): Promise<GreenCleanAdminVerification> {
    try {
      const rows = await this.sql.unsafe<Array<{
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
        managed: this.targetPolicy.kind === "MANAGED",
      })
    } catch (error) {
      throw new Error(`GREEN_CLEAN_ADMIN_VERIFICATION_FAILED:${sanitizedPostgresCode(error)}`)
    }
  }

  async verifyOwnerRoles(roles: readonly string[]): Promise<boolean> {
    const uniqueRoles = [...new Set(roles)]
    if (!uniqueRoles.length || uniqueRoles.some((role) => !POSTGRES_IDENTIFIER.test(role))) return false
    try {
      for (const role of uniqueRoles) {
        const rows = await this.sql.unsafe<Array<{ matches: boolean }>>(
          "SELECT count(*)=1 matches FROM pg_roles WHERE rolname=$1",
          [role],
        )
        if (rows[0]?.matches !== true) return false
      }
      return true
    } catch (error) {
      throw new Error(`GREEN_CLEAN_OWNER_ROLE_INSPECTION_FAILED:${sanitizedPostgresCode(error)}`)
    }
  }

  async inspectDatabase(specification: GreenCleanDatabaseSpecification): Promise<GreenCleanDatabaseInspection> {
    this.assertExpectedSpecification(specification)
    let databases: Array<{ owner_role: string }>
    try {
      databases = await this.sql.unsafe<Array<{ owner_role: string }>>(
        "SELECT pg_get_userbyid(datdba) owner_role FROM pg_database WHERE datname=$1",
        [specification.databaseName],
      )
    } catch (error) {
      throw new Error(`GREEN_CLEAN_DATABASE_INSPECTION_FAILED:${sanitizedPostgresCode(error)}`)
    }
    if (!databases.length) return Object.freeze({ exists: false, ownerRole: null, state: "ABSENT" })
    const ownerRole = databases[0]!.owner_role
    if (databases.length !== 1 || ownerRole !== specification.ownerRole) {
      return Object.freeze({ exists: true, ownerRole, state: "CONFLICT" })
    }
    const connectionString = targetConnectionString(this.adminConnectionString, specification.databaseName)
    const target = postgres(connectionString, {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 10,
      connection: {
        application_name: "mvp-green-clean-database-inspection",
        statement_timeout: 15_000,
        lock_timeout: 2_000,
        idle_in_transaction_session_timeout: 15_000,
        default_transaction_read_only: true,
      },
    })
    try {
      return await target.begin("READ ONLY", async (readOnly) => {
        const rows = await readOnly.unsafe<Array<{
          database_name: string
          version: number
          read_only: string
          user_schema_count: number
          user_relation_count: number
          user_function_count: number
          user_type_count: number
          user_extension_count: number
        }>>(
          `SELECT
            current_database() database_name,
            current_setting('server_version_num')::int version,
            current_setting('transaction_read_only') read_only,
            (SELECT count(*)::int FROM pg_namespace WHERE nspname NOT IN ('pg_catalog','information_schema','public') AND nspname !~ '^pg_toast') user_schema_count,
            (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')) user_relation_count,
            (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') user_function_count,
            (SELECT count(*)::int FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('c','d','e','r')) user_type_count,
            (SELECT count(*)::int FROM pg_extension WHERE extname<>'plpgsql') user_extension_count`,
        )
        const row = rows[0]
        if (
          !row
          || row.database_name !== specification.databaseName
          || row.version < 160_000
          || row.version >= 170_000
          || row.read_only !== "on"
        ) {
          return Object.freeze({ exists: true, ownerRole, state: "CONFLICT" as const })
        }
        const counts = [
          row.user_schema_count,
          row.user_relation_count,
          row.user_function_count,
          row.user_type_count,
          row.user_extension_count,
        ]
        if (counts.every((count) => count === 0)) {
          return Object.freeze({ exists: true, ownerRole, state: "EMPTY" as const })
        }
        if (!this.existingDatabaseVerifier) {
          return Object.freeze({ exists: true, ownerRole, state: "CONFLICT" as const })
        }
        const state = await this.existingDatabaseVerifier({
          specification,
          userSchemaCount: row.user_schema_count,
          userRelationCount: row.user_relation_count,
          userFunctionCount: row.user_function_count,
          userTypeCount: row.user_type_count,
          userExtensionCount: row.user_extension_count,
          readOnlyQuery: <T extends Record<string, unknown>[]>(
            statement: string,
            parameters: readonly unknown[] = [],
          ) => readOnly.unsafe<T>(statement, [...parameters] as never[]),
        })
        return Object.freeze({ exists: true, ownerRole, state })
      }) as GreenCleanDatabaseInspection
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("GREEN_CLEAN_")) throw error
      throw new Error(`GREEN_CLEAN_EXISTING_DATABASE_INSPECTION_FAILED:${sanitizedPostgresCode(error)}`)
    } finally {
      await target.end({ timeout: 5 }).catch(() => undefined)
    }
  }

  async createDatabase(specification: GreenCleanDatabaseSpecification): Promise<void> {
    this.assertExpectedSpecification(specification)
    assertIdentifier(specification.databaseName, "GREEN_CLEAN_DATABASE_NAME_INVALID")
    assertIdentifier(specification.ownerRole, "GREEN_CLEAN_DATABASE_OWNER_INVALID")
    const owner = quoteIdentifier(specification.ownerRole)
    try {
      if (this.targetPolicy.kind === "MANAGED") throw new Error("GREEN_CLEAN_MANAGED_DATABASE_PROVIDER_CREATION_REQUIRED")
      await this.sql.unsafe(`CREATE DATABASE ${quoteIdentifier(specification.databaseName)} OWNER ${owner}`)
    } catch (error) {
      if (error instanceof Error && error.message === "GREEN_CLEAN_MANAGED_DATABASE_PROVIDER_CREATION_REQUIRED") throw error
      throw new Error(`GREEN_CLEAN_DATABASE_CREATE_FAILED:${sanitizedPostgresCode(error)}`)
    }
  }

  shutdown(): Promise<void> {
    return this.sql.end({ timeout: 5 })
  }

  redactedIdentity(specification: GreenCleanDatabaseSpecification): GreenCleanDatabaseLifecycleResult["identities"][number] {
    this.assertExpectedSpecification(specification)
    return redactedIdentity(this.source, specification)
  }

  private assertExpectedSpecification(specification: GreenCleanDatabaseSpecification): void {
    const expected = this.expectedSpecifications.get(specification.database)
    if (
      !expected
      || expected.binding !== specification.binding
      || expected.databaseName !== specification.databaseName
      || expected.ownerRole !== specification.ownerRole
    ) {
      throw new Error("GREEN_CLEAN_DATABASE_SPECIFICATION_CONFLICT")
    }
  }
}

export async function reconcileGreenCleanDatabaseSet(
  port: GreenCleanDatabaseLifecyclePort,
  databaseSet: GreenCleanRebuildDatabaseSet,
): Promise<GreenCleanDatabaseLifecycleResult> {
  const specifications = greenCleanDatabaseSpecifications(databaseSet)
  const admin = await port.verifyAdmin()
  const localAdmin = !admin.managed && admin.database === "postgres" && admin.role === "qt_d2_owner"
  const managedAdmin = admin.managed && admin.database === "neondb" && admin.role === "neondb_owner"
  if (
    (!localAdmin && !managedAdmin)
    || !admin.postgresMajor16
    || !admin.readWrite
    || !admin.canCreateDatabase
  ) {
    throw new Error("GREEN_CLEAN_ADMIN_IDENTITY_UNPROVEN")
  }
  const ownerRoles = [...new Set(specifications.map((specification) => specification.ownerRole))]
  if (!await port.verifyOwnerRoles(ownerRoles)) throw new Error("GREEN_CLEAN_DATABASE_OWNER_ROLE_CLOSURE_FAILED")

  const initial = new Map<GreenCleanDatabase, GreenCleanDatabaseInspection>()
  for (const specification of specifications) {
    const inspection = await port.inspectDatabase(specification)
    initial.set(specification.database, inspection)
    if (
      inspection.state === "CONFLICT"
      || (inspection.exists && inspection.ownerRole !== specification.ownerRole)
      || (!inspection.exists && inspection.state !== "ABSENT")
      || (inspection.exists && inspection.state === "ABSENT")
    ) {
      throw new Error(`GREEN_CLEAN_DATABASE_CONFLICT:${specification.database}`)
    }
  }

  const outcomes = {} as Record<GreenCleanDatabase, GreenCleanDatabaseLifecycleOutcome>
  let createdCount = 0
  for (const specification of specifications) {
    const inspection = initial.get(specification.database)!
    if (inspection.state === "ABSENT") {
      await port.createDatabase(specification)
      const created = await port.inspectDatabase(specification)
      if (!created.exists || created.ownerRole !== specification.ownerRole || created.state !== "EMPTY") {
        throw new Error(`GREEN_CLEAN_DATABASE_CREATE_VERIFICATION_FAILED:${specification.database}`)
      }
      outcomes[specification.database] = "CREATED"
      createdCount += 1
    } else if (inspection.state === "EMPTY" || inspection.state === "RECONCILED") {
      outcomes[specification.database] = inspection.state
    } else {
      throw new Error(`GREEN_CLEAN_DATABASE_CONFLICT:${specification.database}`)
    }
  }

  return Object.freeze({
    outcomes: Object.freeze(outcomes),
    identities: Object.freeze(specifications.map((specification) => port.redactedIdentity(specification))),
    createdCount,
  })
}
