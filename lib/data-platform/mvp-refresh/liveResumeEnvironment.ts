import postgres from "postgres"

import { inspectFilesystemObjectRoot } from "@/lib/data-platform/population/backfill/filesystemObjectStorage"
import { inspectIntegratedBackfillTarget } from "@/lib/data-platform/population/backfill/integratedTargetSafety"
import { inspectMvpServingIsolatedTarget } from "@/lib/data-platform/mvp-serving/safety"
import { requireGreenCleanRebuildDatabaseSet } from "./greenCleanRebuildSafety"
import type { LiveResumeCoordinatorPorts } from "./liveResumeCoordinator"

export const LIVE_RESUME_ENVIRONMENT_VERSION = "mvp-live-resume-environment/1.0.0" as const

export type LiveResumeDiagnostic =
  | "VARIABLE_MISSING"
  | "AUTHENTICATION_FAILED"
  | "WRONG_DATABASE"
  | "WRONG_ROLE"
  | "NON_LOCAL_TARGET"
  | "CONNECTION_FAILED"
  | "BINDING_INCOMPLETE"
  | "READY"

export type LiveResumeBindingMode = "READ_ONLY" | "READ_WRITE" | "APPEND_ONLY"

export interface LiveResumeBindingCapability {
  readonly bindingName: string
  readonly configured: boolean
  readonly localOnly: boolean
  readonly expectedDatabase: boolean
  readonly expectedRole: boolean
  readonly callable: boolean
  readonly mode: LiveResumeBindingMode
  readonly supportedDatasets: readonly string[]
  readonly supportedInstruments: readonly string[]
  readonly exactIntervalLimitHours: number | null
  readonly legacyWorkerDependency: false
  readonly activationCapable: false
  readonly diagnostic: LiveResumeDiagnostic
  readonly limitationReason: string | null
  readonly sanitizedErrorCode: string | null
}

export interface LiveResumeEnvironmentPreflight {
  readonly version: typeof LIVE_RESUME_ENVIRONMENT_VERSION
  readonly passed: boolean
  readonly capabilities: readonly LiveResumeBindingCapability[]
  readonly productionOrNeonWriteTarget: false
}

export type LiveResumeEnvironmentMode = "INSPECT" | "PREFLIGHT" | "CERTIFICATION" | "LIVE"

export interface LocalLiveResumeEnvironment {
  readonly mode: LiveResumeEnvironmentMode
  readonly capabilities: readonly LiveResumeBindingCapability[]
  readonly diagnostics: readonly { readonly bindingName: string; readonly diagnostic: LiveResumeDiagnostic; readonly sanitizedErrorCode: string | null }[]
  readonly ports: LiveResumeCoordinatorPorts | null
  readonly passed: boolean
  close(): Promise<void>
}

export interface LiveResumeEnvironmentFactoryInput {
  readonly mode: LiveResumeEnvironmentMode
  readonly environment?: NodeJS.ProcessEnv
  readonly intervalStart?: string
  readonly intervalEnd?: string
  readonly plannerIdentity?: string
  readonly plannerChecksum?: string
  /** Test-only seam for authenticated local-client certification. Workers do not supply it. */
  readonly preflight?: (environment: NodeJS.ProcessEnv) => Promise<LiveResumeEnvironmentPreflight>
  readonly createBindings?: (input: {
    readonly mode: Exclude<LiveResumeEnvironmentMode, "INSPECT">
    readonly environment: NodeJS.ProcessEnv
    readonly capabilities: readonly LiveResumeBindingCapability[]
    readonly intervalStart?: string
    readonly intervalEnd?: string
    readonly plannerIdentity?: string
    readonly plannerChecksum?: string
  }) => Promise<LiveResumeLocalBindingSet>
}

const instruments = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"])
const datasetBindings = Object.freeze([
  ["ohlcv-executor", ["ohlcv"], instruments.filter((value) => value !== "BTCUSDT")],
  ["open-interest-executor", ["open-interest"], instruments],
  ["funding-executor", ["funding"], instruments],
  ["agg-trades-executor", ["agg-trade"], instruments],
] as const)

type DatabaseRequirement = readonly [variable: string, database: string, role: string | null, binding: string, mode: LiveResumeBindingMode]

const databaseRequirements = Object.freeze([
  ["D2_CANONICAL_POSTGRES_URL", "quantterminal_backfill", "qt_d2_backfill_owner", "d2-canonical-persistence", "READ_WRITE"],
  ["D3_POPULATION_POSTGRES_URL", "quantterminal_backfill", "qt_d3_backfill_owner", "d3-candidate-persistence", "READ_WRITE"],
  ["D4_ISOLATED_POSTGRES_URL", "quantterminal_d4_isolated", null, "d4-downstream-persistence", "READ_WRITE"],
  ["MVP_REFRESH_ISOLATED_POSTGRES_URL", "quantterminal_mvp_refresh_isolated", "qt_d2_owner", "refresh-control-plane", "APPEND_ONLY"],
  ["MVP_SERVING_ISOLATED_POSTGRES_URL", "quantterminal_mvp_serving_isolated", "mvp_serving_publisher", "inactive-candidate-serving", "APPEND_ONLY"],
] as const satisfies readonly DatabaseRequirement[])

function runtimeDatabaseRequirements(environment: NodeJS.ProcessEnv): readonly DatabaseRequirement[] {
  const cleanRebuild = requireGreenCleanRebuildDatabaseSet(environment)
  if (!cleanRebuild) return databaseRequirements
  return Object.freeze([
    ["D2_CANONICAL_POSTGRES_URL", cleanRebuild.backfillDatabase, cleanRebuild.d2Role, "d2-canonical-persistence", "READ_WRITE"],
    ["D3_POPULATION_POSTGRES_URL", cleanRebuild.backfillDatabase, cleanRebuild.d3Role, "d3-candidate-persistence", "READ_WRITE"],
    ["D4_ISOLATED_POSTGRES_URL", cleanRebuild.d4Database, cleanRebuild.d4OwnerRole, "d4-downstream-persistence", "READ_WRITE"],
    ["MVP_REFRESH_ISOLATED_POSTGRES_URL", cleanRebuild.refreshDatabase, cleanRebuild.refreshRole, "refresh-control-plane", "APPEND_ONLY"],
    ["MVP_SERVING_ISOLATED_POSTGRES_URL", cleanRebuild.servingDatabase, cleanRebuild.servingPublisherRole, "inactive-candidate-serving", "APPEND_ONLY"],
  ] as const)
}

const downstreamBindings = Object.freeze([
  "reconciliation-planner-reader", "authoritative-recovery-reader", "refresh-run-unit-store",
  "refresh-lease-store", "refresh-checkpoint-store", "source-contract-store", "dataset-watermark-store",
  "common-watermark-store", "bounded-coverage", "affected-consistency", "affected-evidence",
  "affected-projections", "bounded-replay-materializer", "candidate-manifest", "active-candidate-comparison",
] as const)

export const LIVE_RESUME_REQUIRED_BINDING_NAMES = Object.freeze([
  ...databaseRequirements.map((value) => value[3]),
  "bounded-object-storage",
  ...datasetBindings.map((value) => value[0]),
  ...downstreamBindings,
  "local-candidate-assembler",
] as const)

export function inspectLocalLiveResumeEnvironment(environment: NodeJS.ProcessEnv = process.env): readonly LiveResumeBindingCapability[] {
  const configured = (bindingName: string, variable: string, mode: LiveResumeBindingMode): LiveResumeBindingCapability => {
    const present = Boolean(environment[variable])
    return Object.freeze({ bindingName, configured: present, localOnly: false, expectedDatabase: false, expectedRole: false, callable: false, mode, supportedDatasets: Object.freeze([]), supportedInstruments: Object.freeze([]), exactIntervalLimitHours: null, legacyWorkerDependency: false, activationCapable: false, diagnostic: present ? "BINDING_INCOMPLETE" : "VARIABLE_MISSING", limitationReason: present ? "PREFLIGHT_REQUIRED" : `${variable}_VARIABLE_MISSING`, sanitizedErrorCode: null })
  }
  const databases = databaseRequirements.map(([variable, , , bindingName, mode]) => configured(bindingName, variable, mode as LiveResumeBindingMode))
  const byName = new Map(databases.map((value) => [value.bindingName, value]))
  const objectStorage = configured("bounded-object-storage", "D3_BACKFILL_OBJECT_ROOT", "READ_WRITE")
  const d2 = byName.get("d2-canonical-persistence")!, refresh = byName.get("refresh-control-plane")!, d4 = byName.get("d4-downstream-persistence")!, serving = byName.get("inactive-candidate-serving")!
  const capabilities: LiveResumeBindingCapability[] = [...databases, objectStorage]
  capabilities.push(...datasetBindings.map(([name, datasets, supported]) => derivedCapability(name, d2, "READ_WRITE", datasets, supported)))
  capabilities.push(...downstreamBindings.map((name) => derivedCapability(name, name.includes("refresh") || name.includes("watermark") || name.includes("reconciliation") || name.includes("authoritative") || name.includes("source-contract") ? refresh : d4, name.includes("reader") ? "READ_ONLY" : "APPEND_ONLY")))
  capabilities.push(derivedCapability("local-candidate-assembler", serving, "APPEND_ONLY"))
  capabilities.push(derivedCapability("candidate-activation", { ...serving, callable: false, activationCapable: false, diagnostic: "READY", limitationReason: "ACTIVATION_INTENTIONALLY_UNAVAILABLE" }, "READ_ONLY"))
  return Object.freeze(capabilities)
}

function isLocal(value: string | undefined): boolean {
  if (!value) return false
  try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname.toLowerCase()) } catch { return false }
}

function errorCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null
}

function diagnostic(input: { configured: boolean; localOnly: boolean; connected: boolean; database: boolean; role: boolean; code: string | null }): LiveResumeDiagnostic {
  if (!input.configured) return "VARIABLE_MISSING"
  if (!input.localOnly) return "NON_LOCAL_TARGET"
  if (!input.connected) return input.code === "28P01" ? "AUTHENTICATION_FAILED" : "CONNECTION_FAILED"
  if (!input.database) return "WRONG_DATABASE"
  if (!input.role) return "WRONG_ROLE"
  return "READY"
}

async function databaseCapability(environment: NodeJS.ProcessEnv, requirement: DatabaseRequirement): Promise<LiveResumeBindingCapability> {
  const [variable, expectedDatabase, expectedRole, bindingName, mode] = requirement
  const value = environment[variable], configured = Boolean(value), localOnly = isLocal(value)
  let connected = false, database = false, role = false, code: string | null = null
  if (configured && localOnly) {
    const sql = postgres(value!, { max: 1, prepare: false, connect_timeout: 10 })
    try {
      const rows = await sql.unsafe<Array<{ database_ok: boolean; role_ok: boolean; version_ok: boolean }>>(
        "SELECT current_database()=$1 database_ok,current_user=$2 role_ok,current_setting('server_version_num')::int BETWEEN 160000 AND 169999 version_ok",
        [expectedDatabase, expectedRole],
      )
      connected = Boolean(rows[0]?.version_ok); database = Boolean(rows[0]?.database_ok); role = expectedRole === null ? connected : Boolean(rows[0]?.role_ok)
    } catch (error) { code = errorCode(error) } finally { await sql.end({ timeout: 2 }) }
  }
  const state = diagnostic({ configured, localOnly, connected, database, role, code })
  return Object.freeze({ bindingName, configured, localOnly, expectedDatabase: database, expectedRole: role, callable: state === "READY", mode: mode as LiveResumeBindingMode, supportedDatasets: Object.freeze([]), supportedInstruments: Object.freeze([]), exactIntervalLimitHours: null, legacyWorkerDependency: false, activationCapable: false, diagnostic: state, limitationReason: state === "READY" ? null : `${variable}_${state}`, sanitizedErrorCode: code })
}

function derivedCapability(bindingName: string, source: LiveResumeBindingCapability, mode: LiveResumeBindingMode, datasets: readonly string[] = [], supported: readonly string[] = []): LiveResumeBindingCapability {
  return Object.freeze({ ...source, bindingName, mode, supportedDatasets: Object.freeze([...datasets]), supportedInstruments: Object.freeze([...supported]), exactIntervalLimitHours: datasets.length ? 24 : null, activationCapable: false, legacyWorkerDependency: false })
}

function combineCapabilities(bindingName: string, sources: readonly LiveResumeBindingCapability[], mode: LiveResumeBindingMode, datasets: readonly string[] = [], supported: readonly string[] = []): LiveResumeBindingCapability {
  const failed = sources.find((value) => value.diagnostic !== "READY")
  const base = failed ?? sources[0]!
  return derivedCapability(bindingName, failed ? { ...base, callable: false, limitationReason: `REQUIRED_BINDING_UNAVAILABLE:${base.bindingName}` } : base, mode, datasets, supported)
}

export async function preflightLocalLiveResumeEnvironment(environment: NodeJS.ProcessEnv = process.env): Promise<LiveResumeEnvironmentPreflight> {
  const requirements = runtimeDatabaseRequirements(environment)
  const [databaseResults, integratedInspection] = await Promise.all([
    Promise.all(requirements.map((value) => databaseCapability(environment, value))),
    inspectIntegratedBackfillTarget({ d2Url: environment.D2_CANONICAL_POSTGRES_URL, d3Url: environment.D3_POPULATION_POSTGRES_URL, objectRoot: environment.D3_BACKFILL_OBJECT_ROOT, repositoryRoot: process.cwd(), environment }),
  ])
  const integratedTopologyReasons = integratedInspection.reasons.filter((reason) => !reason.startsWith("D3_BACKFILL_OBJECT_ROOT") && !reason.startsWith("OBJECT_ROOT"))
  const databases = databaseResults.map((value) => {
    if (!integratedTopologyReasons.length || !["d2-canonical-persistence", "d3-candidate-persistence"].includes(value.bindingName)) return value
    const topologyDiagnostic: LiveResumeDiagnostic = integratedTopologyReasons.some((reason) => reason.includes("ROLE")) ? "WRONG_ROLE" : integratedTopologyReasons.some((reason) => reason.includes("DATABASE")) ? "WRONG_DATABASE" : "NON_LOCAL_TARGET"
    return Object.freeze({ ...value, callable: false, expectedDatabase: topologyDiagnostic !== "WRONG_DATABASE" && value.expectedDatabase, expectedRole: topologyDiagnostic !== "WRONG_ROLE" && value.expectedRole, diagnostic: topologyDiagnostic, limitationReason: `INTEGRATED_D2_D3_${topologyDiagnostic}` })
  })
  const byName = new Map(databases.map((value) => [value.bindingName, value]))
  const refresh = byName.get("refresh-control-plane")!, d2 = byName.get("d2-canonical-persistence")!, d3 = byName.get("d3-candidate-persistence")!, d4 = byName.get("d4-downstream-persistence")!, serving = byName.get("inactive-candidate-serving")!
  const objectConfigured = Boolean(environment.D3_BACKFILL_OBJECT_ROOT)
  const objectInspection = objectConfigured ? await inspectFilesystemObjectRoot({ root: environment.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false }) : { safe: false }
  const objectState: LiveResumeDiagnostic = !objectConfigured ? "VARIABLE_MISSING" : objectInspection.safe ? "READY" : "NON_LOCAL_TARGET"
  const objectStorage: LiveResumeBindingCapability = Object.freeze({ bindingName: "bounded-object-storage", configured: objectConfigured, localOnly: objectInspection.safe, expectedDatabase: true, expectedRole: true, callable: objectState === "READY", mode: "READ_WRITE", supportedDatasets: Object.freeze(["ohlcv", "open-interest", "funding", "agg-trade"]), supportedInstruments: instruments, exactIntervalLimitHours: 24, legacyWorkerDependency: false, activationCapable: false, diagnostic: objectState, limitationReason: objectState === "READY" ? null : `D3_BACKFILL_OBJECT_ROOT_${objectState}`, sanitizedErrorCode: null })
  const servingRequirement = requirements.find((value) => value[3] === "inactive-candidate-serving")
  if (!servingRequirement || !servingRequirement[2]) throw new Error("LIVE_RESUME_SERVING_REQUIREMENT_MISSING")
  const servingInspection = inspectMvpServingIsolatedTarget(environment.MVP_SERVING_ISOLATED_POSTGRES_URL, environment, {
    database: servingRequirement[1],
    role: servingRequirement[2],
  })
  const safeServing = servingInspection.safe && serving.localOnly
  const capabilities: LiveResumeBindingCapability[] = [...databases, objectStorage]
  capabilities.push(...datasetBindings.map(([name, datasets, supported]) => combineCapabilities(name, [d2, d3, objectStorage], "READ_WRITE", datasets, supported)))
  capabilities.push(...downstreamBindings.map((name) => derivedCapability(name, name.includes("refresh") || name.includes("watermark") || name.includes("reconciliation") || name.includes("authoritative") || name.includes("source-contract") ? refresh : d4, name.includes("reader") ? "READ_ONLY" : "APPEND_ONLY")))
  capabilities.push(derivedCapability("local-candidate-assembler", safeServing ? serving : { ...serving, callable: false, diagnostic: serving.diagnostic === "READY" ? "NON_LOCAL_TARGET" : serving.diagnostic, limitationReason: "SERVING_TARGET_REJECTED" }, "APPEND_ONLY"))
  capabilities.push(derivedCapability("candidate-activation", { ...serving, callable: false, diagnostic: "READY", limitationReason: "ACTIVATION_INTENTIONALLY_UNAVAILABLE" }, "READ_ONLY"))
  const mandatory = capabilities.filter((value) => value.bindingName !== "candidate-activation")
  return Object.freeze({ version: LIVE_RESUME_ENVIRONMENT_VERSION, passed: mandatory.every((value) => value.configured && value.localOnly && value.expectedDatabase && value.expectedRole && value.callable), capabilities: Object.freeze(capabilities), productionOrNeonWriteTarget: false })
}

export interface LiveResumeLocalBindingSet {
  readonly ports: LiveResumeCoordinatorPorts
  readonly capabilities: readonly LiveResumeBindingCapability[]
  readonly close?: () => Promise<void>
}

export function composeLocalLiveResumeEnvironment(input: LiveResumeLocalBindingSet): LiveResumeCoordinatorPorts {
  const mandatory = input.capabilities.filter((value) => value.bindingName !== "candidate-activation")
  if (!mandatory.length || mandatory.some((value) => !value.configured || !value.localOnly || !value.expectedDatabase || !value.expectedRole || !value.callable || value.legacyWorkerDependency || value.activationCapable)) throw new Error("LIVE_RESUME_ENVIRONMENT_BINDING_INCOMPLETE")
  if (input.capabilities.some((value) => value.bindingName === "candidate-activation" && value.callable)) throw new Error("LIVE_RESUME_ACTIVATION_BINDING_FORBIDDEN")
  return Object.freeze(input.ports)
}

export async function createLocalLiveResumeEnvironment(input: { readonly mode: LiveResumeEnvironmentMode; readonly environment?: NodeJS.ProcessEnv; readonly bindings?: LiveResumeLocalBindingSet }): Promise<LocalLiveResumeEnvironment> {
  const environment = input.environment ?? process.env
  if (input.mode === "INSPECT") {
    const capabilities = inspectLocalLiveResumeEnvironment(environment)
    return Object.freeze({ mode: input.mode, capabilities, diagnostics: Object.freeze(capabilities.map((value) => Object.freeze({ bindingName: value.bindingName, diagnostic: value.diagnostic, sanitizedErrorCode: value.sanitizedErrorCode }))), ports: null, passed: true, close: async () => undefined })
  }
  if (input.mode === "CERTIFICATION") {
    if (!input.bindings) throw new Error("LIVE_RESUME_CERTIFICATION_BINDINGS_REQUIRED")
    const ports = composeLocalLiveResumeEnvironment(input.bindings)
    const capabilities = Object.freeze([...input.bindings.capabilities])
    return Object.freeze({ mode: input.mode, capabilities, diagnostics: Object.freeze(capabilities.map((value) => Object.freeze({ bindingName: value.bindingName, diagnostic: value.diagnostic, sanitizedErrorCode: value.sanitizedErrorCode }))), ports, passed: true, close: input.bindings.close ?? (async () => undefined) })
  }
  const preflight = await preflightLocalLiveResumeEnvironment(environment)
  if (input.mode === "PREFLIGHT") return Object.freeze({ mode: input.mode, capabilities: preflight.capabilities, diagnostics: Object.freeze(preflight.capabilities.map((value) => Object.freeze({ bindingName: value.bindingName, diagnostic: value.diagnostic, sanitizedErrorCode: value.sanitizedErrorCode }))), ports: null, passed: preflight.passed, close: async () => undefined })
  if (!preflight.passed) throw new Error("LIVE_RESUME_LOCAL_PREFLIGHT_FAILED")
  if (!input.bindings) throw new Error("LIVE_RESUME_LIVE_BINDINGS_REQUIRED")
  const ports = composeLocalLiveResumeEnvironment({ ...input.bindings, capabilities: preflight.capabilities })
  return Object.freeze({ mode: input.mode, capabilities: preflight.capabilities, diagnostics: Object.freeze(preflight.capabilities.map((value) => Object.freeze({ bindingName: value.bindingName, diagnostic: value.diagnostic, sanitizedErrorCode: value.sanitizedErrorCode }))), ports, passed: true, close: input.bindings.close ?? (async () => undefined) })
}

/**
 * Process-environment entry point used by the worker. The binding constructor is
 * resolved inside the environment layer so callers never inject individual
 * adapters or partially composed ports.
 */
export async function createLiveResumeEnvironmentFromProcessEnv(input: LiveResumeEnvironmentFactoryInput): Promise<LocalLiveResumeEnvironment> {
  const environment = input.environment ?? process.env
  if (input.mode === "INSPECT") return createLocalLiveResumeEnvironment({ mode: "INSPECT", environment })

  const preflight = await (input.preflight ?? preflightLocalLiveResumeEnvironment)(environment)
  const diagnostics = Object.freeze(preflight.capabilities.map((value) => Object.freeze({ bindingName: value.bindingName, diagnostic: value.diagnostic, sanitizedErrorCode: value.sanitizedErrorCode })))
  if (!preflight.passed) return Object.freeze({ mode: input.mode, capabilities: preflight.capabilities, diagnostics, ports: null, passed: false, close: async () => undefined })

  const createBindings = input.createBindings ?? (await import("./liveResumeLocalBootstrap")).createProcessLiveResumeBindings
  let bindings: LiveResumeLocalBindingSet | null = null
  try {
    bindings = await createBindings({ mode: input.mode, environment, capabilities: preflight.capabilities, intervalStart: input.intervalStart, intervalEnd: input.intervalEnd, plannerIdentity: input.plannerIdentity, plannerChecksum: input.plannerChecksum })
    const ports = composeLocalLiveResumeEnvironment({ ...bindings, capabilities: preflight.capabilities })
    return Object.freeze({ mode: input.mode, capabilities: preflight.capabilities, diagnostics, ports, passed: true, close: bindings.close ?? (async () => undefined) })
  } catch (error) {
    await bindings?.close?.().catch(() => undefined)
    throw error
  }
}
