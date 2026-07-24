import postgres from "postgres"

import {
  createMvpRefreshClientFromEnvironment,
  type MvpRefreshConnectionPreflight,
  type MvpRefreshPostgresClient,
} from "@/lib/data-platform/mvp-refresh"

export const MVP_REFRESH_CERTIFICATION_DATABASE_NAME = "MVP_REFRESH_CERTIFICATION_DATABASE_NAME" as const
export const MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE = "MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE" as const
export const MVP_REFRESH_DISPOSABLE_DATABASE_PREFIX = "quantterminal_mvp_refresh_dbprovider_cert_" as const

const FIXED_DATABASE = "quantterminal_mvp_refresh_isolated"
const EXPECTED_ROLE = "qt_d2_owner"
const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/
const DISPOSABLE_NAME = /^quantterminal_mvp_refresh_dbprovider_cert_[a-z0-9_]+$/
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

export interface MvpRefreshCertificationDatabaseInspection {
  readonly mode: "FIXED_FIXTURE" | "DISPOSABLE_CERTIFICATION"
  readonly safe: boolean
  readonly databaseName: string
  readonly hostClassification: "LOCAL_DOCKER" | "REMOTE_OR_AMBIGUOUS"
  readonly port: number | null
  readonly roleName: string
  readonly reasons: readonly string[]
}

function configurationError(reasons: readonly string[]): Error {
  return new Error(`MVP_REFRESH_DISPOSABLE_CERTIFICATION_CONFIGURATION_INVALID:${reasons.join(",")}`)
}

export function inspectMvpRefreshCertificationDatabase(
  environment: Readonly<Record<string, string | undefined>>,
): MvpRefreshCertificationDatabaseInspection {
  const approvedName = environment[MVP_REFRESH_CERTIFICATION_DATABASE_NAME]?.trim()
  const allowDisposable = environment[MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE]?.trim()
  if (!approvedName && !allowDisposable) {
    return Object.freeze({
      mode: "FIXED_FIXTURE" as const,
      safe: true,
      databaseName: FIXED_DATABASE,
      hostClassification: "LOCAL_DOCKER" as const,
      port: null,
      roleName: EXPECTED_ROLE,
      reasons: Object.freeze([]),
    })
  }

  const reasons: string[] = []
  if (allowDisposable !== "true") reasons.push("DISPOSABLE_OPT_IN_REQUIRED")
  if (!approvedName) reasons.push("DISPOSABLE_DATABASE_NAME_REQUIRED")
  if (
    approvedName
    && (
      !IDENTIFIER.test(approvedName)
      || !DISPOSABLE_NAME.test(approvedName)
      || approvedName === FIXED_DATABASE
    )
  ) reasons.push("DISPOSABLE_DATABASE_NAME_REJECTED")

  const connectionString = environment.MVP_REFRESH_ISOLATED_POSTGRES_URL
  let databaseName = approvedName ?? "UNAVAILABLE"
  let hostClassification: MvpRefreshCertificationDatabaseInspection["hostClassification"] = "REMOTE_OR_AMBIGUOUS"
  let port: number | null = null
  let roleName = "UNAVAILABLE"
  try {
    if (!connectionString) throw new Error("MISSING")
    const url = new URL(connectionString)
    databaseName = decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase()
    hostClassification = LOCAL_HOSTS.has(url.hostname.toLowerCase()) ? "LOCAL_DOCKER" : "REMOTE_OR_AMBIGUOUS"
    port = url.port ? Number(url.port) : null
    roleName = decodeURIComponent(url.username)
    if (!["postgres:", "postgresql:"].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    if (hostClassification !== "LOCAL_DOCKER") reasons.push("LOCAL_DOCKER_HOST_REQUIRED")
    if (!port || !Number.isInteger(port) || port < 1 || port > 65_535) reasons.push("EXPLICIT_LOCAL_PORT_REQUIRED")
    if (roleName !== EXPECTED_ROLE) reasons.push("EXPECTED_LOCAL_ROLE_REQUIRED")
    if (!url.password) reasons.push("PASSWORD_REQUIRED")
    if (databaseName !== approvedName) reasons.push("CONNECTION_DATABASE_NAME_MISMATCH")
  } catch {
    reasons.push("CONNECTION_STRING_INVALID")
  }

  return Object.freeze({
    mode: "DISPOSABLE_CERTIFICATION" as const,
    safe: reasons.length === 0,
    databaseName,
    hostClassification,
    port,
    roleName,
    reasons: Object.freeze([...new Set(reasons)]),
  })
}

export function assertMvpRefreshDisposableConnectedIdentity(
  expectedDatabase: string,
  row: { readonly database: string; readonly role: string; readonly version: number } | undefined,
): void {
  if (
    !row
    || row.database !== expectedDatabase
    || row.role !== EXPECTED_ROLE
    || row.version < 160_000
    || row.version >= 170_000
  ) {
    throw new Error("MVP_REFRESH_DISPOSABLE_CONNECTED_IDENTITY_MISMATCH")
  }
}

function sanitizedPostgresError(error: unknown): Pick<MvpRefreshConnectionPreflight, "sanitizedErrorCode" | "sanitizedErrorClass"> {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : null
  const sanitizedErrorCode = code && /^[0-9A-Z]{5,}$/.test(code) ? code : null
  const sanitizedErrorClass = code === "28P01"
    ? "AUTHENTICATION_REJECTED"
    : code === "ECONNREFUSED" || code === "ETIMEDOUT"
      ? "CONNECTION_REJECTED"
      : "POSTGRES_ERROR"
  return Object.freeze({ sanitizedErrorCode, sanitizedErrorClass })
}

function createDisposableClient(
  connectionString: string,
  expectedDatabase: string,
): MvpRefreshPostgresClient {
  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 30,
    connection: {
      application_name: "mvp-refresh-disposable-certification",
      statement_timeout: 30_000,
      lock_timeout: 5_000,
      idle_in_transaction_session_timeout: 30_000,
    },
  })
  const client = {
    connectionString: "[REDACTED]",
    sql,
    async preflight(): Promise<MvpRefreshConnectionPreflight> {
      try {
        const rows = await sql.unsafe<Array<{ database: string; role: string; version: number }>>(
          "SELECT current_database() database,current_user role,current_setting('server_version_num')::int version",
        )
        assertMvpRefreshDisposableConnectedIdentity(expectedDatabase, rows[0])
        return Object.freeze({
          connectionSucceeded: true,
          expectedDatabase: true,
          expectedRole: true,
          postgresMajor16: true,
          sanitizedErrorCode: null,
          sanitizedErrorClass: "NONE" as const,
        })
      } catch (error) {
        return Object.freeze({
          connectionSucceeded: false,
          expectedDatabase: false,
          expectedRole: false,
          postgresMajor16: false,
          ...sanitizedPostgresError(error),
        })
      }
    },
    async verify(): Promise<void> {
      const result = await this.preflight()
      if (!result.connectionSucceeded || !result.expectedDatabase || !result.expectedRole || !result.postgresMajor16) {
        throw new Error(`MVP_REFRESH_DISPOSABLE_PREFLIGHT_FAILED:${result.sanitizedErrorCode ?? "NO_CODE"}:${result.sanitizedErrorClass}`)
      }
    },
    transaction<T>(work: (transactionSql: postgres.TransactionSql) => Promise<T>): Promise<T> {
      return sql.begin("ISOLATION LEVEL SERIALIZABLE", work) as Promise<T>
    },
    shutdown(): Promise<void> {
      return sql.end({ timeout: 5 })
    },
  }
  return client as unknown as MvpRefreshPostgresClient
}

export function createMvpRefreshCertificationClientFromEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): MvpRefreshPostgresClient {
  const inspection = inspectMvpRefreshCertificationDatabase(environment)
  if (inspection.mode === "FIXED_FIXTURE") return createMvpRefreshClientFromEnvironment()
  if (!inspection.safe) throw configurationError(inspection.reasons)
  return createDisposableClient(environment.MVP_REFRESH_ISOLATED_POSTGRES_URL!, inspection.databaseName)
}
