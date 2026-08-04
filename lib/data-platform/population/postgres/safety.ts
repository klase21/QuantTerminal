export interface D3TargetInspection { readonly safe: boolean; readonly redactedTarget: string; readonly reasons: readonly string[] }
export type DurableD3TargetPurpose = "D3_DEDICATED" | "INTEGRATED_BACKFILL"
const SAFE = ["test", "isolated", "preview", "sandbox", "dev"]
const PROD = ["prod", "production", "primary", "main"]

export function inspectD3Target(connectionString: string, applicationUrl?: string | null, d2Url?: string | null): D3TargetInspection {
  try {
    const url = new URL(connectionString)
    const database = url.pathname.replace(/^\//, "").toLowerCase()
    const host = url.hostname.toLowerCase()
    const identity = `${host}/${database}`
    const reasons: string[] = []
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    if (!SAFE.some((marker) => identity.includes(marker))) reasons.push("ISOLATION_MARKER_MISSING")
    if (PROD.some((marker) => identity.includes(marker))) reasons.push("PRODUCTION_MARKER_DETECTED")
    if (!database) reasons.push("DATABASE_NAME_MISSING")
    if (applicationUrl && connectionString === applicationUrl) reasons.push("MATCHES_APPLICATION_TARGET")
    if (d2Url && connectionString === d2Url) reasons.push("MATCHES_D2_ISOLATED_TARGET")
    return { safe: reasons.length === 0, redactedTarget: `${host}/${database || "<missing>"}`, reasons }
  } catch { return { safe: false, redactedTarget: "<invalid-postgres-target>", reasons: ["INVALID_CONNECTION_STRING"] } }
}

export function requireD3Target(connectionString: string, applicationUrl?: string | null, d2Url?: string | null): D3TargetInspection {
  const result = inspectD3Target(connectionString, applicationUrl, d2Url)
  if (!result.safe) throw new Error(`Unsafe D3 PostgreSQL target ${result.redactedTarget}: ${result.reasons.join(",")}`)
  return result
}

const DURABLE_D3_DATABASES = new Set(["quantterminal_d3_backfill", "quantterminal_d3_nonprod", "quantterminal_d3_development"])
const DENIED_DURABLE_DATABASES = new Set(["postgres", "template0", "template1", "quantterminal_d2_isolated", "quantterminal_d3_isolated", "quantterminal_d4_isolated"])

export function inspectDurableD3Target(connectionString: string | undefined, purpose: DurableD3TargetPurpose = "D3_DEDICATED", environment: Readonly<Record<string, string | undefined>> = process.env): D3TargetInspection {
  if (!connectionString?.trim()) return { safe: false, redactedTarget: "UNAVAILABLE", reasons: ["D3_POPULATION_POSTGRES_URL_MISSING"] }
  try {
    const url = new URL(connectionString)
    const database = decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase()
    const host = url.hostname.toLowerCase()
    const role = decodeURIComponent(url.username || "")
    const reasons: string[] = []
    const cleanRebuild = requireGreenCleanRebuildDatabaseSet(environment)
    const managedCleanRebuild = environment.MVP_GREEN_CLEAN_REBUILD_MODE === "INACTIVE_MANAGED_POSTGRES_SET"
    if (purpose !== "D3_DEDICATED" && purpose !== "INTEGRATED_BACKFILL") reasons.push("TARGET_PURPOSE_UNSUPPORTED")
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    if (!database) reasons.push("DATABASE_NAME_MISSING")
    if (DENIED_DURABLE_DATABASES.has(database)) reasons.push("CERTIFICATION_OR_SYSTEM_DATABASE_REJECTED")
    if (purpose === "INTEGRATED_BACKFILL") {
      const expectedDatabase = cleanRebuild?.backfillDatabase ?? "quantterminal_backfill"
      const expectedRole = cleanRebuild?.d3Role ?? "qt_d3_backfill_owner"
      if (database !== expectedDatabase) reasons.push("INTEGRATED_DATABASE_REQUIRED")
      if (role !== expectedRole) reasons.push("INTEGRATED_D3_ROLE_REQUIRED")
      if (cleanRebuild && !managedCleanRebuild && !["localhost", "127.0.0.1", "::1"].includes(host)) reasons.push("MVP_GREEN_CLEAN_REBUILD_LOOPBACK_REQUIRED")
      if (cleanRebuild && managedCleanRebuild) {
        if (["localhost", "127.0.0.1", "::1"].includes(host) || host !== environment.MVP_GREEN_MANAGED_HOST?.toLowerCase()) reasons.push("MVP_GREEN_MANAGED_HOST_REQUIRED")
        for (const key of ["DATABASE_URL", "MVP_SERVING_POSTGRES_URL", "MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL", "MVP_GREEN_PARENT_POSTGRES_URL", "MVP_GREEN_MANAGED_PRODUCTION_POSTGRES_URL", "MVP_GREEN_MANAGED_ACTIVE_APPLICATION_POSTGRES_URL"]) {
          if (environment[key] && environment[key] === connectionString) reasons.push(`MATCHES_${key}`)
        }
      }
    } else if (purpose === "D3_DEDICATED" && !DURABLE_D3_DATABASES.has(database)) reasons.push("DATABASE_NOT_ALLOWLISTED")
    if (/prod(?:uction)?|primary|main/i.test(`${host}/${database}`)) reasons.push("PRODUCTION_LIKE_TARGET_REJECTED")
    return { safe: reasons.length === 0, redactedTarget: `${host}:${url.port || "5432"}/${database || "<missing>"}`, reasons }
  } catch { return { safe: false, redactedTarget: "INVALID", reasons: ["INVALID_CONNECTION_STRING"] } }
}

export function requireDurableD3Target(connectionString: string | undefined, purpose: DurableD3TargetPurpose = "D3_DEDICATED", environment: Readonly<Record<string, string | undefined>> = process.env): D3TargetInspection {
  const result = inspectDurableD3Target(connectionString, purpose, environment)
  if (!result.safe) throw new Error(`Unsafe durable D3 PostgreSQL target ${result.redactedTarget}: ${result.reasons.join(",")}`)
  return result
}
import { requireGreenCleanRebuildDatabaseSet } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"
