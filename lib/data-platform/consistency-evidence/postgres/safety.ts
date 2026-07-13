import { D4_ISOLATED_DATABASE_NAME } from "@/lib/data-platform/evidence-platform"

export interface D4Environment {
  readonly D4_ISOLATED_POSTGRES_URL?: string
  readonly D2_ISOLATED_POSTGRES_URL?: string
  readonly D3_ISOLATED_POSTGRES_URL?: string
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
    if (!["postgres:", "postgresql:"].includes(url.protocol)) reasons.push("UNSUPPORTED_PROTOCOL")
    if (database !== D4_ISOLATED_DATABASE_NAME) reasons.push("D4_DATABASE_NAME_MISMATCH")
    if (PRODUCTION_MARKERS.some((marker) => identity.includes(marker))) reasons.push("PRODUCTION_MARKER_DETECTED")
    if (environment.DATABASE_URL && connectionString === environment.DATABASE_URL) reasons.push("MATCHES_APPLICATION_DATABASE")
    if (environment.D2_ISOLATED_POSTGRES_URL && connectionString === environment.D2_ISOLATED_POSTGRES_URL) reasons.push("MATCHES_D2_ISOLATED_DATABASE")
    if (environment.D3_ISOLATED_POSTGRES_URL && connectionString === environment.D3_ISOLATED_POSTGRES_URL) reasons.push("MATCHES_D3_ISOLATED_DATABASE")
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
