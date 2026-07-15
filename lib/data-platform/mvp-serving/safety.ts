export type MvpServingRoleIntent = "MIGRATION_OWNER" | "PUBLISHER" | "READER"

export interface MvpServingTargetInspection {
  readonly safe: boolean
  readonly redactedTarget: string
  readonly database: string | null
  readonly role: string | null
  readonly reasons: readonly string[]
}

export function inspectMvpServingIsolatedTarget(connectionString: string | undefined, environment: Readonly<Record<string, string | undefined>> = process.env): MvpServingTargetInspection {
  if (!connectionString?.trim()) return Object.freeze({ safe: false, redactedTarget: "UNAVAILABLE", database: null, role: null, reasons: Object.freeze(["MVP_SERVING_ISOLATED_POSTGRES_URL_REQUIRED"]) })
  try {
    const url = new URL(connectionString), database = decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase(), role = decodeURIComponent(url.username || "") || null
    const reasons: string[] = []
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    if (database !== "quantterminal_mvp_serving_isolated") reasons.push("SERVING_ISOLATED_DATABASE_NAME_MISMATCH")
    if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase())) reasons.push("MVP7A_LOCAL_HOST_REQUIRED")
    if (role !== "mvp_serving_publisher" && role !== "mvp_serving_reader") reasons.push("SERVING_ROLE_INVALID")
    for (const key of ["D2_CANONICAL_POSTGRES_URL", "D2_ISOLATED_POSTGRES_URL", "D3_POPULATION_POSTGRES_URL", "D3_ISOLATED_POSTGRES_URL", "D4_ISOLATED_POSTGRES_URL", "DATABASE_URL"]) if (environment[key] && environment[key] === connectionString) reasons.push(`MATCHES_${key}`)
    return Object.freeze({ safe: reasons.length === 0, redactedTarget: `${url.hostname}:${url.port || "5432"}/${database}`, database, role, reasons: Object.freeze(reasons) })
  } catch { return Object.freeze({ safe: false, redactedTarget: "INVALID", database: null, role: null, reasons: Object.freeze(["INVALID_CONNECTION_STRING"]) }) }
}

export function requireMvpServingIsolatedTarget(connectionString: string | undefined, intent: MvpServingRoleIntent, environment: Readonly<Record<string, string | undefined>> = process.env): MvpServingTargetInspection {
  const result = inspectMvpServingIsolatedTarget(connectionString, environment)
  const expectedRole = intent === "READER" ? "mvp_serving_reader" : "mvp_serving_publisher"
  const reasons = [...result.reasons]
  if (result.role !== expectedRole) reasons.push(`SERVING_${intent}_ROLE_REQUIRED`)
  if (!result.safe || reasons.length) throw new Error(`UNSAFE_MVP_SERVING_TARGET ${result.redactedTarget}: ${[...new Set(reasons)].join(",")}`)
  return result
}

