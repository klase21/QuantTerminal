export interface MvpRefreshTargetInspection {
  readonly safe: boolean
  readonly database: string | null
  readonly reasons: readonly string[]
}

export interface MvpRefreshConnectionContractInspection {
  readonly present: boolean
  readonly noSurroundingQuotes: boolean
  readonly schemePostgresql: boolean
  readonly usernamePresent: boolean
  readonly passwordPresent: boolean
  readonly expectedDatabase: boolean
  readonly localHost: boolean
  readonly portPresent: boolean
  readonly sslNotForced: boolean
  readonly reservedCharactersEncodedSafely: boolean
  readonly noWhitespaceOrNewline: boolean
  readonly originalPassedWithoutReconstruction: true
}

const FORBIDDEN_ALIASES = [
  "D2_CANONICAL_POSTGRES_URL",
  "D2_ISOLATED_POSTGRES_URL",
  "D3_POPULATION_POSTGRES_URL",
  "D3_ISOLATED_POSTGRES_URL",
  "D4_ISOLATED_POSTGRES_URL",
  "D5_ISOLATED_POSTGRES_URL",
  "MVP_SERVING_ISOLATED_POSTGRES_URL",
  "MVP_SERVING_POSTGRES_URL",
  "MVP_SERVING_PUBLISHER_POSTGRES_URL",
  "DATABASE_URL",
] as const

export function inspectMvpRefreshTarget(connectionString: string | undefined, environment: Readonly<Record<string, string | undefined>> = process.env, expectedDatabase = "quantterminal_mvp_refresh_isolated"): MvpRefreshTargetInspection {
  if (!connectionString?.trim()) return Object.freeze({ safe: false, database: null, reasons: Object.freeze(["MVP_REFRESH_ISOLATED_POSTGRES_URL_REQUIRED"]) })
  try {
    const url = new URL(connectionString)
    const database = decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase()
    const reasons: string[] = []
    const cleanRebuild = requireGreenCleanRebuildDatabaseSet(environment)
    const managedCleanRebuild = environment.MVP_GREEN_CLEAN_REBUILD_MODE === "INACTIVE_MANAGED_POSTGRES_SET"
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    const blueGreen = environment.MVP_BLUE_GREEN_RELEASE_MODE === "IMMUTABLE_CANDIDATE_DATABASE" && /^quantterminal_mvp8z5_refresh_[a-z0-9]+$/.test(expectedDatabase) && environment.MVP_BLUE_GREEN_TARGET_ID?.endsWith(`/${expectedDatabase}`)
    if (expectedDatabase !== "quantterminal_mvp_refresh_isolated" && !/^quantterminal_mvp8[c-e]_(?:canary_)?refresh_/.test(expectedDatabase) && !blueGreen && expectedDatabase !== cleanRebuild?.refreshDatabase) reasons.push("REFRESH_EXPECTED_DATABASE_NAME_UNSAFE")
    if (database !== expectedDatabase) reasons.push("REFRESH_ISOLATED_DATABASE_NAME_MISMATCH")
    if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase()) && !blueGreen && !managedCleanRebuild) reasons.push("REFRESH_LOCAL_HOST_REQUIRED")
    if (cleanRebuild && (database !== cleanRebuild.refreshDatabase || decodeURIComponent(url.username) !== cleanRebuild.refreshRole || (managedCleanRebuild ? (["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase()) || url.hostname.toLowerCase() !== environment.MVP_GREEN_MANAGED_HOST?.toLowerCase()) : !["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())))) reasons.push("MVP_GREEN_CLEAN_REBUILD_REFRESH_TARGET_MISMATCH")
    for (const key of FORBIDDEN_ALIASES) if (environment[key] && environment[key] === connectionString) reasons.push(`MATCHES_${key}`)
    return Object.freeze({ safe: reasons.length === 0, database, reasons: Object.freeze(reasons) })
  } catch {
    return Object.freeze({ safe: false, database: null, reasons: Object.freeze(["INVALID_CONNECTION_STRING"]) })
  }
}

export function requireMvpRefreshTarget(connectionString: string | undefined, environment: Readonly<Record<string, string | undefined>> = process.env, expectedDatabase?: string): MvpRefreshTargetInspection {
  const result = inspectMvpRefreshTarget(connectionString, environment, expectedDatabase)
  if (!result.safe) throw new Error(`UNSAFE_MVP_REFRESH_TARGET:${result.reasons.join(",")}`)
  return result
}

export function inspectMvpRefreshConnectionContract(connectionString: string | undefined): MvpRefreshConnectionContractInspection {
  const unavailable = Object.freeze({ present: false, noSurroundingQuotes: false, schemePostgresql: false, usernamePresent: false, passwordPresent: false, expectedDatabase: false, localHost: false, portPresent: false, sslNotForced: false, reservedCharactersEncodedSafely: false, noWhitespaceOrNewline: false, originalPassedWithoutReconstruction: true as const })
  if (!connectionString) return unavailable
  try {
    const url = new URL(connectionString)
    const rawAuthority = connectionString.slice(connectionString.indexOf("://") + 3).split(/[/?#]/, 1)[0] ?? ""
    const credentials = rawAuthority.includes("@") ? rawAuthority.slice(0, rawAuthority.lastIndexOf("@")) : ""
    const separator = credentials.indexOf(":")
    const encodedPassword = separator >= 0 ? credentials.slice(separator + 1) : ""
    let encodingValid = true
    try { decodeURIComponent(encodedPassword) } catch { encodingValid = false }
    const sslMode = url.searchParams.get("sslmode")
    return Object.freeze({
      present: true,
      noSurroundingQuotes: !((connectionString.startsWith('"') && connectionString.endsWith('"')) || (connectionString.startsWith("'") && connectionString.endsWith("'"))),
      schemePostgresql: url.protocol === "postgresql:",
      usernamePresent: url.username.length > 0,
      passwordPresent: url.password.length > 0,
      expectedDatabase: decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase() === "quantterminal_mvp_refresh_isolated",
      localHost: ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase()),
      portPresent: url.port.length > 0,
      sslNotForced: sslMode === null || sslMode === "disable",
      reservedCharactersEncodedSafely: encodingValid,
      noWhitespaceOrNewline: connectionString === connectionString.trim() && !/[\r\n]/.test(connectionString),
      originalPassedWithoutReconstruction: true,
    })
  } catch { return unavailable }
}
import { requireGreenCleanRebuildDatabaseSet } from "./greenCleanRebuildSafety"
