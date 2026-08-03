import postgres from "postgres"
import { requireDurableCanonicalTarget, type DurableCanonicalTargetPurpose } from "./durableTargetSafety"
import { requireIsolatedTarget } from "./testSafety"

export type PostgresRoleIntent = "MIGRATION_OWNER" | "CANONICAL_WRITER" | "BOUNDED_WRITER" | "READ_ONLY"

export interface IsolatedPostgresConfig {
  readonly connectionString: string
  readonly roleIntent: PostgresRoleIntent
  readonly sessionRole?: string
  readonly maxConnections: number
  readonly connectTimeoutSeconds: number
  readonly idleTimeoutSeconds: number
  readonly applicationName: string
  readonly safetyEnvironment?: Readonly<Record<string, string | undefined>>
}

export interface IsolatedPostgresClient {
  readonly roleIntent: PostgresRoleIntent
  readonly sql: postgres.Sql
  transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T>
  shutdown(): Promise<void>
}

export type DurableCanonicalPostgresConfig = IsolatedPostgresConfig

export function validatePostgresConfig(config: IsolatedPostgresConfig): readonly string[] {
  const errors: string[] = []
  if (!config.connectionString.trim()) errors.push("CONNECTION_STRING_MISSING")
  if (!Number.isInteger(config.maxConnections) || config.maxConnections < 1 || config.maxConnections > 4) errors.push("MAX_CONNECTIONS_OUT_OF_BOUNDS")
  if (!Number.isInteger(config.connectTimeoutSeconds) || config.connectTimeoutSeconds < 1 || config.connectTimeoutSeconds > 30) errors.push("CONNECT_TIMEOUT_OUT_OF_BOUNDS")
  if (!Number.isInteger(config.idleTimeoutSeconds) || config.idleTimeoutSeconds < 1 || config.idleTimeoutSeconds > 120) errors.push("IDLE_TIMEOUT_OUT_OF_BOUNDS")
  if (!config.applicationName.trim()) errors.push("APPLICATION_NAME_MISSING")
  return Object.freeze(errors)
}

function createPostgresClient(config: IsolatedPostgresConfig): IsolatedPostgresClient {
  const errors = validatePostgresConfig(config)
  if (errors.length) throw new Error(`Invalid D2 PostgreSQL configuration: ${errors.join(",")}`)
  const expectedSessionRole = config.roleIntent === "CANONICAL_WRITER"
    ? "qt_d2_canonical_writer"
    : config.roleIntent === "BOUNDED_WRITER"
      ? "qt_d2_bounded_writer"
      : config.roleIntent === "READ_ONLY"
        ? "qt_d2_read_only"
        : undefined
  if (config.sessionRole && config.sessionRole !== expectedSessionRole) throw new Error("D2_SESSION_ROLE_INTENT_MISMATCH")
  const sql = postgres(config.connectionString, {
    max: config.maxConnections,
    connect_timeout: config.connectTimeoutSeconds,
    idle_timeout: config.idleTimeoutSeconds,
    prepare: false,
    connection: {
      application_name: config.applicationName,
      ...(config.sessionRole ? { options: `-c role=${config.sessionRole}` } : {}),
    },
  })
  return Object.freeze({
    roleIntent: config.roleIntent,
    sql,
    async transaction<T>(work: (transaction: postgres.TransactionSql) => Promise<T>): Promise<T> {
      return sql.begin("ISOLATION LEVEL READ COMMITTED", work) as Promise<T>
    },
    async shutdown() { await sql.end({ timeout: 5 }) },
  })
}

export function createIsolatedPostgresClient(config: IsolatedPostgresConfig): IsolatedPostgresClient {
  requireIsolatedTarget(config.connectionString)
  return createPostgresClient(config)
}

export function createDurableCanonicalPostgresClient(config: DurableCanonicalPostgresConfig, purpose: DurableCanonicalTargetPurpose = "D2_DEDICATED"): IsolatedPostgresClient {
  requireDurableCanonicalTarget(config.connectionString, purpose, config.safetyEnvironment)
  return createPostgresClient(config)
}
