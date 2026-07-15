import postgres from "postgres"
import { requireMvpServingIsolatedTarget, type MvpServingRoleIntent } from "./safety"

export class MvpServingPostgresClient {
  readonly sql: postgres.Sql
  constructor(readonly connectionString: string, readonly roleIntent: MvpServingRoleIntent, environment: Readonly<Record<string, string | undefined>> = process.env) {
    requireMvpServingIsolatedTarget(connectionString, roleIntent, environment)
    this.sql = postgres(connectionString, { max: roleIntent === "READER" ? 2 : 1, prepare: false, connect_timeout: 10, idle_timeout: 30, connection: { application_name: `mvp-serving-${roleIntent.toLowerCase()}`, statement_timeout: 30_000, lock_timeout: 5_000, idle_in_transaction_session_timeout: 30_000, ...(roleIntent === "READER" ? { default_transaction_read_only: true } : {}) } })
  }
  async verify(): Promise<void> {
    const rows = await this.sql.unsafe<Array<{ database: string; role: string; version: number }>>("SELECT current_database() database,current_user role,current_setting('server_version_num')::int version")
    const expectedRole = this.roleIntent === "READER" ? "mvp_serving_reader" : "mvp_serving_publisher"
    if (rows[0]?.database !== "quantterminal_mvp_serving_isolated" || rows[0]?.role !== expectedRole || rows[0].version < 160000 || rows[0].version >= 170000) throw new Error("MVP_SERVING_DATABASE_VERIFICATION_FAILED")
  }
  transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T> { return this.sql.begin("ISOLATION LEVEL SERIALIZABLE", work) as Promise<T> }
  shutdown(): Promise<void> { return this.sql.end({ timeout: 5 }) }
}

export function createMvpServingClientFromEnvironment(intent: MvpServingRoleIntent): MvpServingPostgresClient {
  const url = process.env.MVP_SERVING_ISOLATED_POSTGRES_URL
  if (!url) throw new Error("MVP_SERVING_ISOLATED_POSTGRES_URL_REQUIRED")
  return new MvpServingPostgresClient(url, intent)
}
