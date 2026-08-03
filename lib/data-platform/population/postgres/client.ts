import postgres from "postgres"
import { requireD3Target, requireDurableD3Target, type DurableD3TargetPurpose } from "./safety"

export type D3RoleIntent = "MIGRATION_OWNER" | "SCHEDULER" | "COORDINATOR" | "WORKER" | "READ_ONLY"
export interface D3PostgresClient { readonly sql: postgres.Sql; readonly roleIntent: D3RoleIntent; transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T>; shutdown(): Promise<void> }
export interface D3PostgresConfig { readonly connectionString: string; readonly roleIntent: D3RoleIntent; readonly sessionRole?: string; readonly maxConnections: number; readonly applicationName: string; readonly applicationUrl?: string | null; readonly d2Url?: string | null }
export interface DurableD3PostgresConfig extends Omit<D3PostgresConfig, "applicationUrl" | "d2Url"> { readonly safetyEnvironment?: Readonly<Record<string, string | undefined>> }

function createClient(config: D3PostgresConfig): D3PostgresClient {
  if (!Number.isInteger(config.maxConnections) || config.maxConnections < 1 || config.maxConnections > 6) throw new Error("D3 maxConnections must be between 1 and 6")
  if (!config.applicationName.trim()) throw new Error("D3 applicationName is required")
  const expectedSessionRole = config.roleIntent === "SCHEDULER"
    ? "qt_d3_scheduler"
    : config.roleIntent === "COORDINATOR"
      ? "qt_d3_coordinator"
      : config.roleIntent === "WORKER"
        ? "qt_d3_worker"
        : config.roleIntent === "READ_ONLY"
          ? "qt_d3_read_only"
          : undefined
  if (config.sessionRole && config.sessionRole !== expectedSessionRole) throw new Error("D3_SESSION_ROLE_INTENT_MISMATCH")
  const sql = postgres(config.connectionString, { max: config.maxConnections, connect_timeout: 10, idle_timeout: 30, prepare: false, connection: { application_name: config.applicationName, ...(config.sessionRole ? { options: `-c role=${config.sessionRole}` } : {}) } })
  return Object.freeze({ roleIntent: config.roleIntent, sql, transaction<T>(work: (transaction: postgres.TransactionSql) => Promise<T>) { return sql.begin("ISOLATION LEVEL READ COMMITTED", work) as Promise<T> }, async shutdown() { await sql.end({ timeout: 5 }) } })
}

export function createD3PostgresClient(config: D3PostgresConfig): D3PostgresClient {
  requireD3Target(config.connectionString, config.applicationUrl, config.d2Url)
  return createClient(config)
}

export function createDurableD3PostgresClient(config: DurableD3PostgresConfig, purpose: DurableD3TargetPurpose = "D3_DEDICATED"): D3PostgresClient {
  requireDurableD3Target(config.connectionString, purpose, config.safetyEnvironment)
  return createClient(config)
}
