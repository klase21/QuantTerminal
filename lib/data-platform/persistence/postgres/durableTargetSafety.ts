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

export function inspectDurableCanonicalTarget(connectionString: string | undefined, purpose: DurableCanonicalTargetPurpose = "D2_DEDICATED"): DurableCanonicalTargetInspection {
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
    if (purpose !== "D2_DEDICATED" && purpose !== "INTEGRATED_BACKFILL") reasons.push("TARGET_PURPOSE_UNSUPPORTED")
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") reasons.push("UNSUPPORTED_PROTOCOL")
    if (!database) reasons.push("DATABASE_NAME_MISSING")
    if (DENIED_DATABASES.has(database)) reasons.push("CERTIFICATION_OR_SYSTEM_DATABASE_REJECTED")
    if (purpose === "INTEGRATED_BACKFILL") {
      if (database !== INTEGRATED_DATABASE) reasons.push("INTEGRATED_DATABASE_REQUIRED")
      if (role !== "qt_d2_backfill_owner") reasons.push("INTEGRATED_D2_ROLE_REQUIRED")
    } else if (purpose === "D2_DEDICATED" && !ALLOWED_DATABASES.has(database)) reasons.push("DATABASE_NOT_ALLOWLISTED")
    if (/prod(?:uction)?|primary|main/i.test(`${host}/${database}`)) reasons.push("PRODUCTION_LIKE_TARGET_REJECTED")
    return Object.freeze({ safe: reasons.length === 0, redactedTarget: `${host}:${port}/${database || "<missing>"}`, host, port, database: database || null, role, reasons: Object.freeze(reasons) })
  } catch {
    return Object.freeze({ safe: false, redactedTarget: "INVALID", host: null, port: null, database: null, role: null, reasons: Object.freeze(["INVALID_CONNECTION_STRING"]) })
  }
}

export function requireDurableCanonicalTarget(connectionString: string | undefined, purpose: DurableCanonicalTargetPurpose = "D2_DEDICATED"): DurableCanonicalTargetInspection {
  const inspection = inspectDurableCanonicalTarget(connectionString, purpose)
  if (!inspection.safe) throw new Error(`Unsafe durable D2 PostgreSQL target ${inspection.redactedTarget}: ${inspection.reasons.join(",")}`)
  return inspection
}
