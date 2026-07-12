import postgres from "postgres"
import { requireD3Target } from "./safety"

export type D3RoleIntent = "MIGRATION_OWNER" | "SCHEDULER" | "COORDINATOR" | "WORKER" | "READ_ONLY"
export interface D3PostgresClient { readonly sql: postgres.Sql; readonly roleIntent: D3RoleIntent; transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T>; shutdown(): Promise<void> }
export interface D3PostgresConfig { readonly connectionString: string; readonly roleIntent: D3RoleIntent; readonly maxConnections: number; readonly applicationName: string; readonly applicationUrl?: string | null; readonly d2Url?: string | null }

export function createD3PostgresClient(config: D3PostgresConfig): D3PostgresClient {
  if (!Number.isInteger(config.maxConnections) || config.maxConnections < 1 || config.maxConnections > 6) throw new Error("D3 maxConnections must be between 1 and 6")
  if (!config.applicationName.trim()) throw new Error("D3 applicationName is required")
  requireD3Target(config.connectionString, config.applicationUrl, config.d2Url)
  const sql = postgres(config.connectionString, { max: config.maxConnections, connect_timeout: 10, idle_timeout: 30, prepare: false, connection: { application_name: config.applicationName } })
  return Object.freeze({ roleIntent: config.roleIntent, sql, transaction<T>(work: (transaction: postgres.TransactionSql) => Promise<T>) { return sql.begin("ISOLATION LEVEL READ COMMITTED", work) as Promise<T> }, async shutdown() { await sql.end({ timeout: 5 }) } })
}
