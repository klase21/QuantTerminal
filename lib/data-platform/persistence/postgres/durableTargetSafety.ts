export interface DurableCanonicalTargetInspection {
  readonly safe: boolean
  readonly redactedTarget: string
  readonly host: string | null
  readonly port: string | null
  readonly database: string | null
  readonly role: string | null
  readonly reasons: readonly string[]
}

export type DurableCanonicalTargetPurpose = "D2_DEDICATED" | "INTEGRATED_BACKFILL"

const ALLOWED_DATABASES = new Set([
  "quantterminal_d2_backfill",
  "quantterminal_d2_nonprod",
  "quantterminal_d2_development",
])
const INTEGRATED_DATABASE = "quantterminal_backfill"

const DENIED_DATABASES = new Set([
  "postgres",
  "template0",
  "template1",
  "quantterminal_d2_isolated",
  "quantterminal_d3_isolated",
  "quantterminal_d4_isolated",
])

export function inspectDurableCanonicalTarget(connectionString: string | undefined, purpose: DurableCanonicalTargetPurpose = "D2_DEDICATED", environment: Readonly<Record<string, string | undefined>> = process.env): DurableCanonicalTargetInspection {
  if (!connectionString?.trim()) {
    return Object.freeze({ safe: false, redactedTarget: "UNAVAILABLE", host: null, port: null, database: null, role: null, reasons: Object.freeze(["D2_CANONICAL_POSTGRES_URL_MISSING"]) })
  }
  try {
    const url = new URL(connectionString)
    const host = url.hostname.toLowerCase()
    const port = url.port || "5432"
    const database = decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase()
    const role = decodeURIComponent(url.username || "") || null
    const reasons: string[] = []
    const cleanRebuild = requireGreenCleanRebuildDatabaseSet(environment)
    const managedCleanRebuild = environment.MVP_GREEN_CLEAN_REBUILD_MODE === "INACTIVE_MANAGED_POSTGRES_SET"
    if (purpose !== "D2_DEDICATED" && purpose !== "INTEGRATED_BACKFILL") reasons.push("TARGET_PURPOSE_UNSUPPORTED")
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") reasons.push("UNSUPPORTED_PROTOCOL")
    if (!database) reasons.push("DATABASE_NAME_MISSING")
    if (DENIED_DATABASES.has(database)) reasons.push("CERTIFICATION_OR_SYSTEM_DATABASE_REJECTED")
    if (purpose === "INTEGRATED_BACKFILL") {
      const expectedDatabase = cleanRebuild?.backfillDatabase ?? INTEGRATED_DATABASE
      const expectedRole = cleanRebuild?.d2Role ?? "qt_d2_backfill_owner"
      if (database !== expectedDatabase) reasons.push("INTEGRATED_DATABASE_REQUIRED")
      if (role !== expectedRole) reasons.push("INTEGRATED_D2_ROLE_REQUIRED")
      if (cleanRebuild && !managedCleanRebuild && !["localhost", "127.0.0.1", "::1"].includes(host)) reasons.push("MVP_GREEN_CLEAN_REBUILD_LOOPBACK_REQUIRED")
      if (cleanRebuild && managedCleanRebuild) {
        if (["localhost", "127.0.0.1", "::1"].includes(host) || host !== environment.MVP_GREEN_MANAGED_HOST?.toLowerCase()) reasons.push("MVP_GREEN_MANAGED_HOST_REQUIRED")
        for (const key of ["DATABASE_URL", "MVP_SERVING_POSTGRES_URL", "MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL", "MVP_GREEN_PARENT_POSTGRES_URL", "MVP_GREEN_MANAGED_PRODUCTION_POSTGRES_URL", "MVP_GREEN_MANAGED_ACTIVE_APPLICATION_POSTGRES_URL"]) {
          if (environment[key] && environment[key] === connectionString) reasons.push(`MATCHES_${key}`)
        }
      }
    } else if (purpose === "D2_DEDICATED" && !ALLOWED_DATABASES.has(database)) reasons.push("DATABASE_NOT_ALLOWLISTED")
    if (/prod(?:uction)?|primary|main/i.test(`${host}/${database}`)) reasons.push("PRODUCTION_LIKE_TARGET_REJECTED")
    return Object.freeze({ safe: reasons.length === 0, redactedTarget: `${host}:${port}/${database || "<missing>"}`, host, port, database: database || null, role, reasons: Object.freeze(reasons) })
  } catch {
    return Object.freeze({ safe: false, redactedTarget: "INVALID", host: null, port: null, database: null, role: null, reasons: Object.freeze(["INVALID_CONNECTION_STRING"]) })
  }
}

export function requireDurableCanonicalTarget(connectionString: string | undefined, purpose: DurableCanonicalTargetPurpose = "D2_DEDICATED", environment: Readonly<Record<string, string | undefined>> = process.env): DurableCanonicalTargetInspection {
  const inspection = inspectDurableCanonicalTarget(connectionString, purpose, environment)
  if (!inspection.safe) throw new Error(`Unsafe durable D2 PostgreSQL target ${inspection.redactedTarget}: ${inspection.reasons.join(",")}`)
  return inspection
}
import { requireGreenCleanRebuildDatabaseSet } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"
