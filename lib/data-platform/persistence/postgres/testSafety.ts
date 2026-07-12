export interface IsolatedTargetSafety {
  readonly safe: boolean
  readonly redactedTarget: string
  readonly reasons: readonly string[]
}

const SAFE_MARKERS = ["test", "isolated", "preview", "sandbox", "dev"]
const PRODUCTION_MARKERS = ["prod", "production", "primary", "main"]

export function inspectIsolatedTarget(connectionString: string): IsolatedTargetSafety {
  try {
    const url = new URL(connectionString)
    const database = url.pathname.replace(/^\//, "").toLowerCase()
    const host = url.hostname.toLowerCase()
    const identity = `${host}/${database}`
    const reasons: string[] = []
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") reasons.push("UNSUPPORTED_PROTOCOL")
    if (!SAFE_MARKERS.some((marker) => identity.includes(marker))) reasons.push("ISOLATION_MARKER_MISSING")
    if (PRODUCTION_MARKERS.some((marker) => identity.includes(marker))) reasons.push("PRODUCTION_MARKER_DETECTED")
    if (!database) reasons.push("DATABASE_NAME_MISSING")
    return Object.freeze({ safe: reasons.length === 0, redactedTarget: `${host}/${database || "<missing>"}`, reasons: Object.freeze(reasons) })
  } catch {
    return Object.freeze({ safe: false, redactedTarget: "<invalid-postgres-target>", reasons: Object.freeze(["INVALID_CONNECTION_STRING"]) })
  }
}

export function requireIsolatedTarget(connectionString: string): IsolatedTargetSafety {
  const inspection = inspectIsolatedTarget(connectionString)
  if (!inspection.safe) throw new Error(`Unsafe D2 PostgreSQL target ${inspection.redactedTarget}: ${inspection.reasons.join(",")}`)
  return inspection
}
