export interface D3TargetInspection { readonly safe: boolean; readonly redactedTarget: string; readonly reasons: readonly string[] }
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
