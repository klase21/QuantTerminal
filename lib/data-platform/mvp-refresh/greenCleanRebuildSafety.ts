import { MVP_GREEN_MIGRATION_OWNER_ROLE } from "@/lib/data-platform/mvp-release"

export const MVP_GREEN_CLEAN_REBUILD_MODE = "MVP_GREEN_CLEAN_REBUILD_MODE" as const
export const MVP_GREEN_CLEAN_REBUILD_MODE_VALUE = "INACTIVE_LOCAL_DATABASE_SET" as const
export const MVP_GREEN_CLEAN_REBUILD_MANAGED_MODE_VALUE = "INACTIVE_MANAGED_POSTGRES_SET" as const
const MANAGED_GREEN_REQUIRED_ENVIRONMENT_NAMES = Object.freeze([
  "MVP_GREEN_MANAGED_PROJECT_ID", "MVP_GREEN_MANAGED_PRODUCTION_BRANCH_ID",
  "MVP_GREEN_MANAGED_ACTIVE_APPLICATION_BRANCH_ID", "MVP_GREEN_MANAGED_BRANCH_ID",
  "MVP_GREEN_MANAGED_ENDPOINT_ID", "MVP_GREEN_MANAGED_HOST",
  "MVP_GREEN_MANAGED_TARGET_FINGERPRINT", "MVP_GREEN_CLEAN_RETAINED_SOURCE_POSTGRES_URL",
] as const)
const MANAGED_PRODUCTION_BINDING_NAMES = Object.freeze([
  "DATABASE_URL", "MVP_SERVING_POSTGRES_URL", "MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL",
  "MVP_GREEN_MANAGED_PRODUCTION_POSTGRES_URL", "MVP_GREEN_MANAGED_ACTIVE_APPLICATION_POSTGRES_URL",
] as const)
export const GREEN_CLEAN_RUN_ONE_DAY_REQUIRED_ENVIRONMENT_NAMES = Object.freeze([
  MVP_GREEN_CLEAN_REBUILD_MODE,
  "MVP_GREEN_CLEAN_REBUILD_ID",
  "MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE",
  "MVP_GREEN_CLEAN_REBUILD_D4_DATABASE",
  "MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE",
  "MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE",
  "D2_CANONICAL_POSTGRES_URL",
  "D3_POPULATION_POSTGRES_URL",
  "D4_ISOLATED_POSTGRES_URL",
  "MVP_REFRESH_ISOLATED_POSTGRES_URL",
  "MVP_SERVING_ISOLATED_POSTGRES_URL",
  "D3_BACKFILL_OBJECT_ROOT",
  "LOCALAPPDATA",
] as const)

export type GreenCleanRunOneDayRequiredEnvironmentName = typeof GREEN_CLEAN_RUN_ONE_DAY_REQUIRED_ENVIRONMENT_NAMES[number] | typeof MANAGED_GREEN_REQUIRED_ENVIRONMENT_NAMES[number]

export interface GreenCleanRunOneDayEnvironmentInspection {
  readonly passed: boolean
  readonly missingVariables: readonly GreenCleanRunOneDayRequiredEnvironmentName[]
  readonly reasons: readonly string[]
  readonly bindings: readonly {
    readonly variable: "D2_CANONICAL_POSTGRES_URL" | "D3_POPULATION_POSTGRES_URL" | "D4_ISOLATED_POSTGRES_URL" | "MVP_REFRESH_ISOLATED_POSTGRES_URL" | "MVP_SERVING_ISOLATED_POSTGRES_URL" | "MVP_GREEN_CLEAN_RETAINED_SOURCE_POSTGRES_URL"
    readonly database: string
    readonly role: string
    readonly passed: boolean
  }[]
}

export interface GreenCleanRebuildDatabaseSet {
  readonly id: string
  readonly backfillDatabase: string
  readonly d4Database: string
  readonly refreshDatabase: string
  readonly servingDatabase: string
  readonly d2Role: string
  readonly d3Role: string
  readonly d4OwnerRole: string
  readonly d4ConsistencyRole: string
  readonly d4EvidenceRole: string
  readonly d4ProjectionRole: string
  readonly d4ReadOnlyRole: string
  readonly refreshRole: string
  readonly servingPublisherRole: string
  readonly servingReaderRole: string
  readonly servingMigrationOwnerRole: typeof MVP_GREEN_MIGRATION_OWNER_ROLE
}

export interface GreenCleanRebuildSafetyInspection {
  readonly enabled: boolean
  readonly databaseSet: GreenCleanRebuildDatabaseSet | null
  readonly reasons: readonly string[]
}

const ID = /^[a-z0-9]{3,24}$/
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"])
const GREEN_CLEAN_LOCAL_POSTGRES_PORT = "55432"
const GREEN_CLEAN_OBJECT_ROOT = "D:\\QuantTerminalData\\raw-artifacts"
const MANAGED_ID = /^[a-z0-9-]+$/

function value(environment: Readonly<Record<string, string | undefined>>, key: string): string {
  return environment[key]?.trim() ?? ""
}

function expected(id: string): GreenCleanRebuildDatabaseSet {
  const prefix = `quantterminal_green_clean_${id}`
  return Object.freeze({
    id,
    backfillDatabase: `${prefix}_backfill`,
    d4Database: `${prefix}_d4`,
    refreshDatabase: `${prefix}_refresh`,
    servingDatabase: `${prefix}_serving`,
    d2Role: "qt_d2_backfill_owner",
    d3Role: "qt_d3_backfill_owner",
    d4OwnerRole: "qt_d2_owner",
    d4ConsistencyRole: "qt_d4_consistency_worker",
    d4EvidenceRole: "qt_d4_evidence_assembler",
    d4ProjectionRole: "qt_d4_projection_builder",
    d4ReadOnlyRole: "qt_d4_read_only",
    refreshRole: "qt_d2_owner",
    servingPublisherRole: "mvp_serving_publisher",
    servingReaderRole: "mvp_serving_reader",
    servingMigrationOwnerRole: MVP_GREEN_MIGRATION_OWNER_ROLE,
  })
}

export function inspectGreenCleanRebuildSafety(environment: Readonly<Record<string, string | undefined>> = process.env): GreenCleanRebuildSafetyInspection {
  const mode = value(environment, MVP_GREEN_CLEAN_REBUILD_MODE)
  if (!mode) return Object.freeze({ enabled: false, databaseSet: null, reasons: Object.freeze([]) })
  if (mode !== MVP_GREEN_CLEAN_REBUILD_MODE_VALUE && mode !== MVP_GREEN_CLEAN_REBUILD_MANAGED_MODE_VALUE) return Object.freeze({ enabled: true, databaseSet: null, reasons: Object.freeze(["MVP_GREEN_CLEAN_REBUILD_MODE_INVALID"]) })
  const id = value(environment, "MVP_GREEN_CLEAN_REBUILD_ID")
  if (!ID.test(id)) return Object.freeze({ enabled: true, databaseSet: null, reasons: Object.freeze(["MVP_GREEN_CLEAN_REBUILD_ID_INVALID"]) })
  const databaseSet = expected(id)
  const configured = {
    backfillDatabase: value(environment, "MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE"),
    d4Database: value(environment, "MVP_GREEN_CLEAN_REBUILD_D4_DATABASE"),
    refreshDatabase: value(environment, "MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE"),
    servingDatabase: value(environment, "MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE"),
  }
  const reasons = (Object.keys(configured) as (keyof typeof configured)[]).flatMap((key) => configured[key] === databaseSet[key] ? [] : [`MVP_GREEN_CLEAN_REBUILD_${key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()}_MISMATCH`])
  if (mode === MVP_GREEN_CLEAN_REBUILD_MANAGED_MODE_VALUE) {
    const projectId = value(environment, "MVP_GREEN_MANAGED_PROJECT_ID")
    const productionBranchId = value(environment, "MVP_GREEN_MANAGED_PRODUCTION_BRANCH_ID")
    const activeApplicationBranchId = value(environment, "MVP_GREEN_MANAGED_ACTIVE_APPLICATION_BRANCH_ID")
    const greenBranchId = value(environment, "MVP_GREEN_MANAGED_BRANCH_ID")
    const endpointId = value(environment, "MVP_GREEN_MANAGED_ENDPOINT_ID")
    const host = value(environment, "MVP_GREEN_MANAGED_HOST").toLowerCase()
    const fingerprint = value(environment, "MVP_GREEN_MANAGED_TARGET_FINGERPRINT")
    for (const name of MANAGED_GREEN_REQUIRED_ENVIRONMENT_NAMES) if (!value(environment, name)) reasons.push(`${name}_REQUIRED`)
    if (projectId && !MANAGED_ID.test(projectId)) reasons.push("MVP_GREEN_MANAGED_PROJECT_ID_INVALID")
    if (productionBranchId && !MANAGED_ID.test(productionBranchId)) reasons.push("MVP_GREEN_MANAGED_PRODUCTION_BRANCH_ID_INVALID")
    if (activeApplicationBranchId && !MANAGED_ID.test(activeApplicationBranchId)) reasons.push("MVP_GREEN_MANAGED_ACTIVE_APPLICATION_BRANCH_ID_INVALID")
    if (greenBranchId && !MANAGED_ID.test(greenBranchId)) reasons.push("MVP_GREEN_MANAGED_BRANCH_ID_INVALID")
    if (endpointId && !MANAGED_ID.test(endpointId)) reasons.push("MVP_GREEN_MANAGED_ENDPOINT_ID_INVALID")
    if (!host || LOOPBACK_HOSTS.has(host) || host === "::1" || /[/:@?#]/.test(host)) reasons.push("MVP_GREEN_MANAGED_HOST_INVALID")
    if (host.includes("-pooler.")) reasons.push("MVP_GREEN_MANAGED_HOST_POOLER_UNSUPPORTED")
    if (greenBranchId && (greenBranchId === productionBranchId || greenBranchId === activeApplicationBranchId)) reasons.push("MVP_GREEN_MANAGED_BRANCH_ID_COLLISION")
    if (fingerprint !== `neon:${projectId}/${greenBranchId}/${endpointId}`) reasons.push("MVP_GREEN_MANAGED_TARGET_FINGERPRINT_MISMATCH")
  }
  return Object.freeze({ enabled: true, databaseSet: reasons.length ? null : databaseSet, reasons: Object.freeze(reasons) })
}

export function requireGreenCleanRebuildDatabaseSet(environment: Readonly<Record<string, string | undefined>> = process.env): GreenCleanRebuildDatabaseSet | null {
  const inspection = inspectGreenCleanRebuildSafety(environment)
  if (inspection.enabled && (!inspection.databaseSet || inspection.reasons.length)) throw new Error(`UNSAFE_MVP_GREEN_CLEAN_REBUILD:${inspection.reasons.join(",")}`)
  return inspection.databaseSet
}

function inspectRunOneDayBinding(
  environment: Readonly<Record<string, string | undefined>>,
  variable: GreenCleanRunOneDayEnvironmentInspection["bindings"][number]["variable"],
  expectedDatabase: string,
  expectedRole: string,
  managedHost: string | null,
): GreenCleanRunOneDayEnvironmentInspection["bindings"][number] & { readonly reasons: readonly string[] } {
  const raw = value(environment, variable)
  const reasons: string[] = []
  if (raw) {
    try {
      const url = new URL(raw)
      let database = "", role = ""
      try {
        database = decodeURIComponent(url.pathname.replace(/^\/+/, ""))
        role = decodeURIComponent(url.username)
      } catch {
        reasons.push(`${variable}_IDENTITY_ENCODING_INVALID`)
      }
      if (!/^postgres(?:ql)?:$/.test(url.protocol)) reasons.push(`${variable}_PROTOCOL_INVALID`)
      if (managedHost) {
        if (LOOPBACK_HOSTS.has(url.hostname.toLowerCase()) || url.hostname === "::1") reasons.push(`${variable}_LOOPBACK_TARGET`)
        if (url.hostname.toLowerCase() !== managedHost) reasons.push(`${variable}_GREEN_HOST_MISMATCH`)
      } else {
        if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) reasons.push(`${variable}_NON_LOCAL_TARGET`)
        if (url.port !== GREEN_CLEAN_LOCAL_POSTGRES_PORT) reasons.push(`${variable}_PORT_MISMATCH`)
      }
      if (database !== expectedDatabase) reasons.push(`${variable}_DATABASE_MISMATCH`)
      if (role !== expectedRole) reasons.push(`${variable}_ROLE_MISMATCH`)
      if (!url.password) reasons.push(`${variable}_PASSWORD_MISSING`)
    } catch {
      reasons.push(`${variable}_URL_INVALID`)
    }
  }
  return Object.freeze({ variable, database: expectedDatabase, role: expectedRole, passed: raw.length > 0 && reasons.length === 0, reasons: Object.freeze(reasons) })
}

export function inspectGreenCleanRunOneDayEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): GreenCleanRunOneDayEnvironmentInspection {
  const mode = value(environment, MVP_GREEN_CLEAN_REBUILD_MODE)
  const requiredNames = mode === MVP_GREEN_CLEAN_REBUILD_MANAGED_MODE_VALUE
    ? [...GREEN_CLEAN_RUN_ONE_DAY_REQUIRED_ENVIRONMENT_NAMES, ...MANAGED_GREEN_REQUIRED_ENVIRONMENT_NAMES]
    : GREEN_CLEAN_RUN_ONE_DAY_REQUIRED_ENVIRONMENT_NAMES
  const missingVariables = requiredNames.filter((name) => !value(environment, name))
  const reasons: string[] = []
  const safety = inspectGreenCleanRebuildSafety(environment)
  if (safety.reasons.length) reasons.push(...safety.reasons)
  if (!safety.enabled && !missingVariables.includes(MVP_GREEN_CLEAN_REBUILD_MODE)) reasons.push("MVP_GREEN_CLEAN_REBUILD_MODE_REQUIRED")
  const databaseSet = safety.databaseSet
  const managedHost = mode === MVP_GREEN_CLEAN_REBUILD_MANAGED_MODE_VALUE ? value(environment, "MVP_GREEN_MANAGED_HOST").toLowerCase() : null
  const bindings = databaseSet ? Object.freeze([
    inspectRunOneDayBinding(environment, "D2_CANONICAL_POSTGRES_URL", databaseSet.backfillDatabase, databaseSet.d2Role, managedHost),
    inspectRunOneDayBinding(environment, "D3_POPULATION_POSTGRES_URL", databaseSet.backfillDatabase, databaseSet.d3Role, managedHost),
    inspectRunOneDayBinding(environment, "D4_ISOLATED_POSTGRES_URL", databaseSet.d4Database, databaseSet.d4OwnerRole, managedHost),
    inspectRunOneDayBinding(environment, "MVP_REFRESH_ISOLATED_POSTGRES_URL", databaseSet.refreshDatabase, databaseSet.refreshRole, managedHost),
    inspectRunOneDayBinding(environment, "MVP_SERVING_ISOLATED_POSTGRES_URL", databaseSet.servingDatabase, databaseSet.servingPublisherRole, managedHost),
  ]) : Object.freeze([])
  for (const binding of bindings) reasons.push(...binding.reasons)
  if (mode === MVP_GREEN_CLEAN_REBUILD_MANAGED_MODE_VALUE) {
    const retainedSource = inspectRunOneDayBinding(environment, "MVP_GREEN_CLEAN_RETAINED_SOURCE_POSTGRES_URL", "quantterminal_backfill", "qt_d2_backfill_owner", null)
    reasons.push(...retainedSource.reasons)
  }
  if (managedHost && bindings.length) {
    for (const productionBinding of MANAGED_PRODUCTION_BINDING_NAMES) {
      const raw = value(environment, productionBinding)
      if (!raw) continue
      try {
        const production = new URL(raw)
        if (bindings.some((binding) => {
          const writable = new URL(value(environment, binding.variable))
          return writable.hostname.toLowerCase() === production.hostname.toLowerCase() && writable.port === production.port
        })) reasons.push(`${productionBinding}_GREEN_TARGET_COLLISION`)
      } catch { reasons.push(`${productionBinding}_URL_INVALID`) }
    }
  }
  const objectRoot = value(environment, "D3_BACKFILL_OBJECT_ROOT")
  if (objectRoot && objectRoot.toLowerCase() !== GREEN_CLEAN_OBJECT_ROOT.toLowerCase()) reasons.push("D3_BACKFILL_OBJECT_ROOT_MISMATCH")
  const publicBindings = bindings.map(({ reasons: _reasons, ...binding }) => Object.freeze(binding))
  return Object.freeze({
    passed: missingVariables.length === 0 && reasons.length === 0 && publicBindings.length === 5 && publicBindings.every((binding) => binding.passed),
    missingVariables: Object.freeze([...missingVariables]),
    reasons: Object.freeze(reasons),
    bindings: Object.freeze(publicBindings),
  })
}

export function requireGreenCleanRunOneDayEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): GreenCleanRunOneDayEnvironmentInspection {
  const inspection = inspectGreenCleanRunOneDayEnvironment(environment)
  if (!inspection.passed) {
    const missing = inspection.missingVariables.length ? inspection.missingVariables.join(",") : "NONE"
    const reasons = inspection.reasons.length ? inspection.reasons.join(",") : "NONE"
    throw new Error(`GREEN_CLEAN_RUN_ONE_DAY_ENVIRONMENT_INVALID:MISSING=${missing}:REASONS=${reasons}`)
  }
  return inspection
}
