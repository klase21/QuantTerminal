export type MvpServingRoleIntent = "MIGRATION_OWNER" | "PUBLISHER" | "READER"
export type MvpServingTargetKind = "LOCAL_ISOLATED" | "MANAGED_POSTGRES"

export interface MvpServingTargetInspection {
  readonly safe: boolean
  readonly redactedTarget: string
  readonly database: string | null
  readonly role: string | null
  readonly reasons: readonly string[]
}

export function inspectMvpServingIsolatedTarget(connectionString: string | undefined, environment: Readonly<Record<string, string | undefined>> = process.env, expected?: { readonly database: string; readonly role: string }): MvpServingTargetInspection {
  if (!connectionString?.trim()) return Object.freeze({ safe: false, redactedTarget: "UNAVAILABLE", database: null, role: null, reasons: Object.freeze(["MVP_SERVING_ISOLATED_POSTGRES_URL_REQUIRED"]) })
  try {
    const url = new URL(connectionString), database = decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase(), role = decodeURIComponent(url.username || "") || null
    const reasons: string[] = []
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    const expectedDatabase = expected?.database ?? "quantterminal_mvp_serving_isolated", expectedRole = expected?.role
    if (expectedDatabase !== "quantterminal_mvp_serving_isolated" && !/^quantterminal_mvp8[c-e]_(?:canary_)?serving_/.test(expectedDatabase)) reasons.push("SERVING_EXPECTED_DATABASE_NAME_UNSAFE")
    if (database !== expectedDatabase) reasons.push("SERVING_ISOLATED_DATABASE_NAME_MISMATCH")
    if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase())) reasons.push("MVP7A_LOCAL_HOST_REQUIRED")
    if (expectedRole ? role !== expectedRole : role !== "mvp_serving_publisher" && role !== "mvp_serving_reader") reasons.push("SERVING_ROLE_INVALID")
    for (const key of ["D2_CANONICAL_POSTGRES_URL", "D2_ISOLATED_POSTGRES_URL", "D3_POPULATION_POSTGRES_URL", "D3_ISOLATED_POSTGRES_URL", "D4_ISOLATED_POSTGRES_URL", "DATABASE_URL"]) if (environment[key] && environment[key] === connectionString) reasons.push(`MATCHES_${key}`)
    return Object.freeze({ safe: reasons.length === 0, redactedTarget: `${url.hostname}:${url.port || "5432"}/${database}`, database, role, reasons: Object.freeze(reasons) })
  } catch { return Object.freeze({ safe: false, redactedTarget: "INVALID", database: null, role: null, reasons: Object.freeze(["INVALID_CONNECTION_STRING"]) }) }
}

export function requireMvpServingIsolatedTarget(connectionString: string | undefined, intent: MvpServingRoleIntent, environment: Readonly<Record<string, string | undefined>> = process.env, expected?: { readonly database: string; readonly role: string }): MvpServingTargetInspection {
  const result = inspectMvpServingIsolatedTarget(connectionString, environment, expected)
  const expectedRole = expected?.role ?? (intent === "READER" ? "mvp_serving_reader" : "mvp_serving_publisher")
  const reasons = [...result.reasons]
  if (result.role !== expectedRole) reasons.push(`SERVING_${intent}_ROLE_REQUIRED`)
  if (!result.safe || reasons.length) throw new Error(`UNSAFE_MVP_SERVING_TARGET ${result.redactedTarget}: ${[...new Set(reasons)].join(",")}`)
  return result
}

export function inspectMvpServingManagedTarget(connectionString: string | undefined, expectedRole: "mvp_serving_publisher" | "mvp_serving_reader", environment: Readonly<Record<string, string | undefined>> = process.env): MvpServingTargetInspection {
  if (!connectionString?.trim()) return Object.freeze({ safe: false, redactedTarget: "UNAVAILABLE", database: null, role: null, reasons: Object.freeze(["MVP_SERVING_MANAGED_POSTGRES_URL_REQUIRED"]) })
  try {
    const url = new URL(connectionString), database = decodeURIComponent(url.pathname.replace(/^\//, "")), role = decodeURIComponent(url.username || "") || null, reasons: string[] = []
    if (!["postgres:", "postgresql:"].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    if (!database) reasons.push("SERVING_DATABASE_REQUIRED")
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) reasons.push("MANAGED_POSTGRES_REMOTE_HOST_REQUIRED")
    if (role !== expectedRole) reasons.push("SERVING_MANAGED_ROLE_INVALID")
    if (!url.password) reasons.push("SERVING_MANAGED_PASSWORD_REQUIRED")
    for (const key of ["D2_CANONICAL_POSTGRES_URL", "D2_ISOLATED_POSTGRES_URL", "D3_POPULATION_POSTGRES_URL", "D3_ISOLATED_POSTGRES_URL", "D4_ISOLATED_POSTGRES_URL", "DATABASE_URL", "MVP_SERVING_ISOLATED_POSTGRES_URL", "MVP_SERVING_PUBLISHER_POSTGRES_URL"]) if (environment[key] && environment[key] === connectionString) reasons.push(`MATCHES_${key}`)
    return Object.freeze({ safe: reasons.length === 0, redactedTarget: "MANAGED_POSTGRES_REDACTED", database, role, reasons: Object.freeze(reasons) })
  } catch { return Object.freeze({ safe: false, redactedTarget: "INVALID", database: null, role: null, reasons: Object.freeze(["INVALID_CONNECTION_STRING"]) }) }
}

export function requireMvpServingManagedTarget(connectionString: string | undefined, intent: MvpServingRoleIntent, environment: Readonly<Record<string, string | undefined>> = process.env): MvpServingTargetInspection {
  const expectedRole = intent === "READER" ? "mvp_serving_reader" : "mvp_serving_publisher", result = inspectMvpServingManagedTarget(connectionString, expectedRole, environment)
  if (!result.safe) throw new Error(`UNSAFE_MVP_SERVING_MANAGED_TARGET:${result.reasons.join(",")}`)
  return result
}

export function requireMvpServingManagedAdminTarget(connectionString: string | undefined, environment: Readonly<Record<string, string | undefined>> = process.env): MvpServingTargetInspection {
  if (!connectionString || connectionString !== environment.MVP_SERVING_PUBLISHER_POSTGRES_URL) throw new Error("MVP_SERVING_PUBLISHER_POSTGRES_URL_REQUIRED")
  try {
    const url = new URL(connectionString), database = decodeURIComponent(url.pathname.replace(/^\//, "")), role = decodeURIComponent(url.username || "") || null, reasons: string[] = []
    if (!["postgres:", "postgresql:"].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    if (!database || !role || !url.password) reasons.push("MANAGED_ADMIN_CONNECTION_INCOMPLETE")
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) reasons.push("MANAGED_POSTGRES_REMOTE_HOST_REQUIRED")
    for (const key of ["D2_CANONICAL_POSTGRES_URL", "D2_ISOLATED_POSTGRES_URL", "D3_POPULATION_POSTGRES_URL", "D3_ISOLATED_POSTGRES_URL", "D4_ISOLATED_POSTGRES_URL", "DATABASE_URL", "MVP_SERVING_ISOLATED_POSTGRES_URL"]) if (environment[key] && environment[key] === connectionString) reasons.push(`MATCHES_${key}`)
    const result = Object.freeze({ safe: reasons.length === 0, redactedTarget: "MANAGED_POSTGRES_REDACTED", database, role, reasons: Object.freeze(reasons) })
    if (!result.safe) throw new Error(`UNSAFE_MVP_SERVING_MANAGED_ADMIN_TARGET:${reasons.join(",")}`)
    return result
  } catch (error) { if (error instanceof Error && error.message.startsWith("UNSAFE_")) throw error; throw new Error("INVALID_MVP_SERVING_MANAGED_ADMIN_TARGET") }
}
