import postgres from "postgres"
import { inspectD4RuntimeTarget, type D4Environment, verifyEnvironment } from "./safety"

export type D4RuntimeLifecycle = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "SHUTTING_DOWN" | "SHUTDOWN"
export type D4RoleIntent = "MIGRATION_OWNER" | "CONSISTENCY_WORKER" | "EVIDENCE_ASSEMBLER" | "PROJECTION_BUILDER" | "PROJECTION_PUBLISHER" | "READ_ONLY"
export interface D4PostgresConfig {
  readonly connectionString: string
  readonly roleIntent: D4RoleIntent
  readonly maxConnections: number
  readonly connectTimeoutSeconds: number
  readonly idleTimeoutSeconds: number
  readonly statementTimeoutMs?: number
  readonly lockTimeoutMs?: number
  readonly idleTransactionTimeoutMs?: number
  readonly applicationName: string
  readonly environment: D4Environment
}
export interface D4DatabaseVerification {
  readonly database: string
  readonly serverVersion: string
  readonly d2DependencyPresent: boolean
  readonly d3PopulationSchemaPresent: boolean
}

const ROLE_IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/
const D4_RUNTIME_ROLES = Object.freeze({
  CONSISTENCY_WORKER: "qt_d4_consistency_worker",
  EVIDENCE_ASSEMBLER: "qt_d4_evidence_assembler",
  PROJECTION_BUILDER: "qt_d4_projection_builder",
  PROJECTION_PUBLISHER: "qt_d4_projection_publisher",
  READ_ONLY: "qt_d4_read_only",
} satisfies Record<Exclude<D4RoleIntent, "MIGRATION_OWNER">, string>)

function runtimeRole(intent: D4RoleIntent): string | undefined {
  if (intent === "MIGRATION_OWNER") return undefined
  const role = D4_RUNTIME_ROLES[intent]
  if (!role || !ROLE_IDENTIFIER.test(role)) throw new Error("D4_ROLE_INTENT_INVALID")
  return role
}

export class ConsistencyPostgresRuntime {
  private client: postgres.Sql | null = null
  private lifecycleState: D4RuntimeLifecycle = "DISCONNECTED"
  constructor(private readonly config: D4PostgresConfig) {
    if (!Number.isInteger(config.maxConnections) || config.maxConnections < 1 || config.maxConnections > 4) throw new Error("D4_MAX_CONNECTIONS_OUT_OF_BOUNDS")
    if (!Number.isInteger(config.connectTimeoutSeconds) || config.connectTimeoutSeconds < 1 || config.connectTimeoutSeconds > 30) throw new Error("D4_CONNECT_TIMEOUT_OUT_OF_BOUNDS")
    if (!Number.isInteger(config.idleTimeoutSeconds) || config.idleTimeoutSeconds < 1 || config.idleTimeoutSeconds > 120) throw new Error("D4_IDLE_TIMEOUT_OUT_OF_BOUNDS")
    validateTimeout(config.statementTimeoutMs ?? 15_000, 1_000, 30_000, "D4_STATEMENT_TIMEOUT_OUT_OF_BOUNDS")
    validateTimeout(config.lockTimeoutMs ?? 5_000, 100, 10_000, "D4_LOCK_TIMEOUT_OUT_OF_BOUNDS")
    validateTimeout(config.idleTransactionTimeoutMs ?? 15_000, 1_000, 30_000, "D4_IDLE_TRANSACTION_TIMEOUT_OUT_OF_BOUNDS")
    if (!config.applicationName.trim()) throw new Error("D4_APPLICATION_NAME_REQUIRED")
    if (config.environment.D4_ISOLATED_POSTGRES_URL !== config.connectionString) throw new Error("D4_CONNECTION_MUST_USE_D4_ENVIRONMENT")
    verifyEnvironment(config.environment)
    runtimeRole(config.roleIntent)
  }
  get state(): D4RuntimeLifecycle { return this.lifecycleState }
  get roleIntent(): D4RoleIntent { return this.config.roleIntent }
  get expectedDatabase(): string { return this.config.environment.D4_EXPECTED_DATABASE_NAME ?? "quantterminal_d4_isolated" }
  get sql(): postgres.Sql {
    if (this.lifecycleState !== "CONNECTED" || !this.client) throw new Error("D4_RUNTIME_NOT_CONNECTED")
    return this.client
  }
  async connect(): Promise<D4DatabaseVerification> {
    if (this.lifecycleState !== "DISCONNECTED") throw new Error("D4_RUNTIME_CONNECT_STATE_INVALID")
    this.lifecycleState = "CONNECTING"
    const role = runtimeRole(this.config.roleIntent)
    const sql = postgres(this.config.connectionString, {
      max: this.config.maxConnections, connect_timeout: this.config.connectTimeoutSeconds, idle_timeout: this.config.idleTimeoutSeconds,
      prepare: false, connection: {
        application_name: this.config.applicationName,
        statement_timeout: this.config.statementTimeoutMs ?? 15_000,
        lock_timeout: this.config.lockTimeoutMs ?? 5_000,
        idle_in_transaction_session_timeout: this.config.idleTransactionTimeoutMs ?? 15_000,
        ...(role ? { options: `-c role=${role}` } : {}),
      },
    })
    this.client = sql
    try {
      const verification = await verifyDatabase(sql, this.config.environment.D4_EXPECTED_DATABASE_NAME)
      if (role) {
        const session = await sql.unsafe<{ role: string }[]>("SELECT current_user role")
        if (session[0]?.role !== role) throw new Error("D4_DATABASE_ROLE_MISSING")
      }
      this.lifecycleState = "CONNECTED"
      return verification
    } catch (error) {
      await sql.end({ timeout: 5 }).catch(() => undefined)
      this.client = null
      this.lifecycleState = "DISCONNECTED"
      throw error
    }
  }
  transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T> {
    return this.sql.begin("ISOLATION LEVEL READ COMMITTED", work) as Promise<T>
  }
  async disconnect(): Promise<void> {
    if (this.lifecycleState === "DISCONNECTED" || this.lifecycleState === "SHUTDOWN") return
    if (!this.client) throw new Error("D4_RUNTIME_CLIENT_MISSING")
    this.lifecycleState = "SHUTTING_DOWN"
    await this.client.end({ timeout: 5 })
    this.client = null
    this.lifecycleState = "DISCONNECTED"
  }
  async shutdown(): Promise<void> {
    if (this.lifecycleState === "SHUTDOWN") return
    await this.disconnect()
    this.lifecycleState = "SHUTDOWN"
  }
}

function validateTimeout(value: number, minimum: number, maximum: number, error: string): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(error)
}

export async function verifyDatabase(sql: postgres.Sql, expectedDatabase = "quantterminal_d4_isolated"): Promise<D4DatabaseVerification> {
  const rows = await sql.unsafe("SELECT current_database() database, current_setting('server_version') server_version, EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='control' AND c.relname='canonical_commits') d2_dependency_present, EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname='population') d3_population_schema_present")
  const row = rows[0] as { database?: string; server_version?: string; d2_dependency_present?: boolean; d3_population_schema_present?: boolean } | undefined
  if (!row || row.database !== expectedDatabase) throw new Error("D4_DATABASE_VERIFICATION_FAILED")
  if (row.d3_population_schema_present) throw new Error("D3_SCHEMA_PRESENT_IN_D4_TARGET")
  return Object.freeze({ database: row.database, serverVersion: row.server_version || "UNKNOWN", d2DependencyPresent: Boolean(row.d2_dependency_present), d3PopulationSchemaPresent: false })
}

export function verifyIsolation(config: D4PostgresConfig): void {
  const inspection = inspectD4RuntimeTarget(config.connectionString, config.environment)
  if (!inspection.safe) throw new Error("D4_ISOLATION_VERIFICATION_FAILED")
}
