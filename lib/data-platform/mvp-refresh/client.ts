import postgres from "postgres"
import { inspectMvpRefreshConnectionContract, requireMvpRefreshTarget, type MvpRefreshConnectionContractInspection } from "./safety"

export interface MvpRefreshConnectionPreflight {
  readonly connectionSucceeded: boolean
  readonly expectedDatabase: boolean
  readonly expectedRole: boolean
  readonly postgresMajor16: boolean
  readonly sanitizedErrorCode: string | null
  readonly sanitizedErrorClass: "NONE" | "AUTHENTICATION_REJECTED" | "CONNECTION_REJECTED" | "TARGET_MISMATCH" | "CONFIGURATION_INVALID" | "POSTGRES_ERROR"
}

function sanitizedPostgresError(error: unknown): Pick<MvpRefreshConnectionPreflight, "sanitizedErrorCode" | "sanitizedErrorClass"> {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null
  const sanitizedErrorCode = code && /^[0-9A-Z]{5,}$/.test(code) ? code : null
  const sanitizedErrorClass = code === "28P01" ? "AUTHENTICATION_REJECTED" : code === "ECONNREFUSED" || code === "ETIMEDOUT" ? "CONNECTION_REJECTED" : "POSTGRES_ERROR"
  return Object.freeze({ sanitizedErrorCode, sanitizedErrorClass })
}

export class MvpRefreshPostgresClient {
  readonly sql: postgres.Sql
  constructor(readonly connectionString: string, environment: Readonly<Record<string, string | undefined>> = process.env) {
    requireMvpRefreshTarget(connectionString, environment)
    this.sql = postgres(connectionString, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 30, connection: { application_name: "mvp-refresh-control-plane", statement_timeout: 30_000, lock_timeout: 5_000, idle_in_transaction_session_timeout: 30_000 } })
  }
  async verify(): Promise<void> {
    const result = await this.preflight()
    if (!result.connectionSucceeded || !result.expectedDatabase || !result.expectedRole || !result.postgresMajor16) throw new Error(`MVP_REFRESH_PREFLIGHT_FAILED:${result.sanitizedErrorCode ?? "NO_CODE"}:${result.sanitizedErrorClass}`)
  }
  async preflight(): Promise<MvpRefreshConnectionPreflight> {
    try {
      const rows = await this.sql.unsafe<Array<{ database: string; role: string; version: number }>>("SELECT current_database() database,current_user role,current_setting('server_version_num')::int version")
      const expectedDatabase = rows[0]?.database === "quantterminal_mvp_refresh_isolated"
      const expectedRole = rows[0]?.role === "qt_d2_owner"
      const postgresMajor16 = rows[0]?.version >= 160000 && rows[0]?.version < 170000
      return Object.freeze({ connectionSucceeded: true, expectedDatabase, expectedRole, postgresMajor16, sanitizedErrorCode: null, sanitizedErrorClass: expectedDatabase && expectedRole && postgresMajor16 ? "NONE" : "TARGET_MISMATCH" })
    } catch (error) {
      return Object.freeze({ connectionSucceeded: false, expectedDatabase: false, expectedRole: false, postgresMajor16: false, ...sanitizedPostgresError(error) })
    }
  }
  transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T> { return this.sql.begin("ISOLATION LEVEL SERIALIZABLE", work) as Promise<T> }
  shutdown(): Promise<void> { return this.sql.end({ timeout: 5 }) }
}

export function createMvpRefreshClientFromEnvironment(): MvpRefreshPostgresClient {
  const url = process.env.MVP_REFRESH_ISOLATED_POSTGRES_URL
  if (!url) throw new Error("MVP_REFRESH_ISOLATED_POSTGRES_URL_REQUIRED")
  return new MvpRefreshPostgresClient(url)
}

export function inspectMvpRefreshConnectionFromEnvironment(): MvpRefreshConnectionContractInspection {
  return inspectMvpRefreshConnectionContract(process.env.MVP_REFRESH_ISOLATED_POSTGRES_URL)
}

export async function preflightMvpRefreshClientFromEnvironment(): Promise<MvpRefreshConnectionPreflight> {
  try {
    const client = createMvpRefreshClientFromEnvironment()
    try { return await client.preflight() } finally { await client.shutdown() }
  } catch {
    return Object.freeze({ connectionSucceeded: false, expectedDatabase: false, expectedRole: false, postgresMajor16: false, sanitizedErrorCode: null, sanitizedErrorClass: "CONFIGURATION_INVALID" })
  }
}
