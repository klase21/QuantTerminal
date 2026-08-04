import { D4_ISOLATED_DATABASE_NAME } from "@/lib/data-platform/evidence-platform"
import { requireGreenCleanRebuildDatabaseSet } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"

export interface D4Environment {
  readonly [key: string]: string | undefined
  readonly MVP_BLUE_GREEN_RELEASE_MODE?: string
  readonly D4_ISOLATED_POSTGRES_URL?: string
  readonly D4_EXPECTED_DATABASE_NAME?: string
  readonly D2_CANONICAL_POSTGRES_URL?: string
  readonly D3_POPULATION_POSTGRES_URL?: string
  readonly D2_ISOLATED_POSTGRES_URL?: string
  readonly D3_ISOLATED_POSTGRES_URL?: string
  readonly MVP_REFRESH_ISOLATED_POSTGRES_URL?: string
  readonly MVP_SERVING_ISOLATED_POSTGRES_URL?: string
  readonly DATABASE_URL?: string
}
export interface D4TargetInspection {
  readonly safe: boolean
  readonly host: string
  readonly port: string
  readonly database: string
  readonly sslMode: string | null
  readonly redactedTarget: string
  readonly reasons: readonly string[]
}
const PRODUCTION_MARKERS = ["prod", "production", "primary", "main"]

export function inspectD4RuntimeTarget(connectionString: string, environment: D4Environment = {}): D4TargetInspection {
  try {
    const url = new URL(connectionString)
    const host = url.hostname.toLowerCase()
    const database = url.pathname.replace(/^\//, "").toLowerCase()
    const port = url.port || "5432"
    const identity = host + "/" + database
    const reasons: string[] = []
    const cleanRebuild = requireGreenCleanRebuildDatabaseSet(environment)
    const managedCleanRebuild = environment.MVP_GREEN_CLEAN_REBUILD_MODE === "INACTIVE_MANAGED_POSTGRES_SET"
    if (!["postgres:", "postgresql:"].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    const expectedDatabase = environment.D4_EXPECTED_DATABASE_NAME?.toLowerCase() ?? D4_ISOLATED_DATABASE_NAME
    const blueGreen = environment.MVP_BLUE_GREEN_RELEASE_MODE === "IMMUTABLE_CANDIDATE_DATABASE" && /^quantterminal_mvp8z5_d4_[a-z0-9]+$/.test(expectedDatabase)
    if (expectedDatabase !== D4_ISOLATED_DATABASE_NAME && !/^quantterminal_mvp8[c-e]_(?:canary_)?d4_/.test(expectedDatabase) && !blueGreen && expectedDatabase !== cleanRebuild?.d4Database) reasons.push("D4_EXPECTED_DATABASE_NAME_UNSAFE")
    if (database !== expectedDatabase) reasons.push("D4_DATABASE_NAME_MISMATCH")
    if (cleanRebuild && (database !== cleanRebuild.d4Database || decodeURIComponent(url.username) !== cleanRebuild.d4OwnerRole || (managedCleanRebuild ? (["localhost", "127.0.0.1", "::1"].includes(host) || host !== environment.MVP_GREEN_MANAGED_HOST?.toLowerCase()) : !["localhost", "127.0.0.1", "::1"].includes(host)))) reasons.push("MVP_GREEN_CLEAN_REBUILD_D4_TARGET_MISMATCH")
    if (PRODUCTION_MARKERS.some((marker) => identity.includes(marker))) reasons.push("PRODUCTION_MARKER_DETECTED")
    if (environment.DATABASE_URL && connectionString === environment.DATABASE_URL) reasons.push("MATCHES_APPLICATION_DATABASE")
    if (environment.D2_CANONICAL_POSTGRES_URL && connectionString === environment.D2_CANONICAL_POSTGRES_URL) reasons.push("MATCHES_D2_CANONICAL_DATABASE")
    if (environment.D3_POPULATION_POSTGRES_URL && connectionString === environment.D3_POPULATION_POSTGRES_URL) reasons.push("MATCHES_D3_POPULATION_DATABASE")
    if (environment.D2_ISOLATED_POSTGRES_URL && connectionString === environment.D2_ISOLATED_POSTGRES_URL) reasons.push("MATCHES_D2_ISOLATED_DATABASE")
    if (environment.D3_ISOLATED_POSTGRES_URL && connectionString === environment.D3_ISOLATED_POSTGRES_URL) reasons.push("MATCHES_D3_ISOLATED_DATABASE")
    if (environment.MVP_REFRESH_ISOLATED_POSTGRES_URL && connectionString === environment.MVP_REFRESH_ISOLATED_POSTGRES_URL) reasons.push("MATCHES_MVP_REFRESH_DATABASE")
    if (environment.MVP_SERVING_ISOLATED_POSTGRES_URL && connectionString === environment.MVP_SERVING_ISOLATED_POSTGRES_URL) reasons.push("MATCHES_MVP_SERVING_DATABASE")
    for (const key of ["MVP_SERVING_POSTGRES_URL", "MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL", "MVP_GREEN_PARENT_POSTGRES_URL", "MVP_GREEN_MANAGED_PRODUCTION_POSTGRES_URL", "MVP_GREEN_MANAGED_ACTIVE_APPLICATION_POSTGRES_URL"]) if (environment[key] && connectionString === environment[key]) reasons.push(`MATCHES_${key}`)
    return Object.freeze({ safe: reasons.length === 0, host, port, database, sslMode: url.searchParams.get("sslmode"), redactedTarget: host + ":" + port + "/" + (database || "<missing>"), reasons: Object.freeze(reasons) })
  } catch {
    return Object.freeze({ safe: false, host: "<invalid>", port: "<invalid>", database: "<invalid>", sslMode: null, redactedTarget: "<invalid-postgres-target>", reasons: Object.freeze(["INVALID_CONNECTION_STRING"]) })
  }
}

export function verifyEnvironment(environment: D4Environment): D4TargetInspection {
  const target = environment.D4_ISOLATED_POSTGRES_URL?.trim()
  if (!target) throw new Error("D4_ISOLATED_POSTGRES_URL_REQUIRED")
  const inspection = inspectD4RuntimeTarget(target, environment)
  if (!inspection.safe) throw new Error("UNSAFE_D4_TARGET " + inspection.redactedTarget + ": " + inspection.reasons.join(","))
  return inspection
}

export function redactPostgresUrl(connectionString: string): string {
  return inspectD4RuntimeTarget(connectionString).redactedTarget
}
