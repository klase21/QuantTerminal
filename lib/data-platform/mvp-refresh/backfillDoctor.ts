export const BACKFILL_DOCTOR_VERSION = "mvp-refresh-backfill-doctor/1.0.0" as const
export const BACKFILL_DOCTOR_BASELINE_RUN_ID = "mrlr_ae9f614fb0dc8aa8f09d1413d9bd2f2e28dc27db153905d11724e93e5b3efa90" as const

export const BACKFILL_DOCTOR_REQUIRED_ENVIRONMENT_NAMES = Object.freeze([
  "D2_CANONICAL_POSTGRES_URL",
  "D3_POPULATION_POSTGRES_URL",
  "D4_ISOLATED_POSTGRES_URL",
  "MVP_REFRESH_ISOLATED_POSTGRES_URL",
  "MVP_SERVING_ISOLATED_POSTGRES_URL",
  "D3_BACKFILL_OBJECT_ROOT",
] as const)

export type BackfillDoctorStatus = "READY" | "BLOCKED" | "FAILED"

export interface BackfillDoctorOptions {
  readonly start: string
  readonly through: string
}

export interface BackfillDoctorEnvironmentPreflight {
  readonly passed: boolean
  readonly missingEnvironmentNames: readonly string[]
  readonly diagnostics: readonly string[]
}

export interface BackfillDoctorD3SchemaInspection {
  readonly passedThroughMigration: number
  readonly diagnostic: string | null
}

export interface BackfillDoctorRunInspection {
  readonly runId: string | null
  /** Execution-generation disposition, not the refresh-run lifecycle state. */
  readonly executionGenerationState: "ACTIVE" | "QUARANTINED" | "SUPERSEDED" | null
  readonly resumeEligible: boolean
  readonly leaseState: "ACTIVE" | "RELEASED" | "EXPIRED" | "ABSENT"
  readonly persistedUnitCount: number
  readonly recoverableSlots: number
  readonly blockedSlots: number
  readonly unitCountsByState: Readonly<Record<string, number>>
  readonly terminalUnitCount: number
  readonly retainedArtifacts: {
    readonly count: number
    readonly allAttributedToRun: boolean
  }
  readonly candidateCount: number
  readonly commonWatermark: string | null
}

export interface BackfillDoctorProviderAvailability {
  readonly available: boolean
  readonly diagnostic: string | null
}

/** All doctor ports are observational. Implementations must not mutate a provider or database. */
export interface BackfillDoctorPorts {
  preflightEnvironment(input: { readonly requiredEnvironmentNames: readonly string[] }): Promise<BackfillDoctorEnvironmentPreflight>
  inspectD3Schema(): Promise<BackfillDoctorD3SchemaInspection>
  inspectRun(input: { readonly runId: typeof BACKFILL_DOCTOR_BASELINE_RUN_ID; readonly start: string; readonly through: string }): Promise<BackfillDoctorRunInspection>
  inspectProviderAvailability(input: { readonly start: string; readonly through: string }): Promise<BackfillDoctorProviderAvailability>
}

export interface BackfillDoctorResult {
  readonly version: typeof BACKFILL_DOCTOR_VERSION
  readonly status: BackfillDoctorStatus
  readonly start: string
  readonly through: string
  readonly runId: typeof BACKFILL_DOCTOR_BASELINE_RUN_ID
  readonly checks: Readonly<{
    readonly environment: "READY" | "BLOCKED" | "FAILED"
    readonly d3Schema: "READY" | "BLOCKED" | "FAILED"
    readonly run: "READY" | "BLOCKED" | "FAILED"
    readonly retainedArtifacts: "READY" | "BLOCKED" | "FAILED"
    readonly candidateAndWatermark: "READY" | "BLOCKED" | "FAILED"
    readonly providers: "READY" | "BLOCKED" | "FAILED"
  }>
  readonly blockers: readonly string[]
  readonly facts: Readonly<{
    readonly retainedArtifactCount: number | null
    readonly candidateCount: number | null
    readonly commonWatermark: string | null
  }>
}

function exactUtcDay(start: string, through: string): { readonly start: string; readonly through: string } {
  const startMs = Date.parse(start), throughMs = Date.parse(through)
  if (!Number.isFinite(startMs) || !Number.isFinite(throughMs)) throw new Error("BACKFILL_DOCTOR_TIMESTAMP_INVALID")
  const canonicalStart = new Date(startMs).toISOString(), canonicalThrough = new Date(throughMs).toISOString()
  if (canonicalStart !== start || canonicalThrough !== through || startMs % 86_400_000 !== 0 || throughMs - startMs !== 86_400_000) throw new Error("BACKFILL_DOCTOR_EXACT_UTC_DAY_REQUIRED")
  return Object.freeze({ start: canonicalStart, through: canonicalThrough })
}

export function parseBackfillDoctorOptions(argv: readonly string[]): BackfillDoctorOptions {
  const values = new Map<string, string>()
  for (const argument of argv) {
    if (!argument.startsWith("--")) throw new Error("BACKFILL_DOCTOR_OPTION_INVALID")
    const match = /^--(start|through)=(.+)$/.exec(argument)
    if (!match) throw new Error("BACKFILL_DOCTOR_OPTION_INVALID")
    if (values.has(match[1]!)) throw new Error("BACKFILL_DOCTOR_OPTION_DUPLICATE")
    values.set(match[1]!, match[2]!)
  }
  const start = values.get("start"), through = values.get("through")
  if (!start || !through) throw new Error("BACKFILL_DOCTOR_OPTIONS_REQUIRED")
  const day = exactUtcDay(start, through)
  return Object.freeze(day)
}

function failure(error: unknown): string {
  return error instanceof Error && /^[A-Z0-9_:.-]+$/.test(error.message) ? error.message : "DOCTOR_PORT_INSPECTION_FAILED"
}

function sanitizedDiagnostic(value: string | null, fallback: string): string {
  return value && /^[A-Z0-9_:.-]+$/.test(value) ? value : fallback
}

export async function runBackfillDoctor(options: BackfillDoctorOptions, ports: BackfillDoctorPorts): Promise<BackfillDoctorResult> {
  const day = exactUtcDay(options.start, options.through)
  const blockers: string[] = []
  let environment: BackfillDoctorEnvironmentPreflight | null = null
  let schema: BackfillDoctorD3SchemaInspection | null = null
  let run: BackfillDoctorRunInspection | null = null
  let providers: BackfillDoctorProviderAvailability | null = null
  const inspect = async <T>(name: string, operation: () => Promise<T>): Promise<T | null> => {
    try { return await operation() } catch (error) { blockers.push(`${name}:${failure(error)}`); return null }
  }
  ;[environment, schema, run, providers] = await Promise.all([
    inspect("ENVIRONMENT", () => ports.preflightEnvironment({ requiredEnvironmentNames: BACKFILL_DOCTOR_REQUIRED_ENVIRONMENT_NAMES })),
    inspect("D3_SCHEMA", () => ports.inspectD3Schema()),
    inspect("RUN", () => ports.inspectRun({ runId: BACKFILL_DOCTOR_BASELINE_RUN_ID, ...day })),
    inspect("PROVIDERS", () => ports.inspectProviderAvailability(day)),
  ])

  const environmentReady = Boolean(environment?.passed) && environment.missingEnvironmentNames.length === 0
  if (environment && !environmentReady) blockers.push(
    ...environment.missingEnvironmentNames.map((name) => BACKFILL_DOCTOR_REQUIRED_ENVIRONMENT_NAMES.includes(name as typeof BACKFILL_DOCTOR_REQUIRED_ENVIRONMENT_NAMES[number]) ? `ENVIRONMENT:${name}_MISSING` : "ENVIRONMENT:REQUIRED_BINDING_MISSING"),
    ...environment.diagnostics.map((value) => `ENVIRONMENT:${sanitizedDiagnostic(value, "PREFLIGHT_FAILED")}`),
  )
  const schemaReady = Boolean(schema && schema.passedThroughMigration >= 5)
  if (schema && !schemaReady) blockers.push(sanitizedDiagnostic(schema.diagnostic, "D3_SCHEMA:THROUGH_005_REQUIRED"))
  const exactRun = Boolean(run && run.runId === BACKFILL_DOCTOR_BASELINE_RUN_ID)
  const unitBaseline = Boolean(run && run.persistedUnitCount === 24 && run.recoverableSlots === 24 && run.blockedSlots === 0 && run.unitCountsByState.PENDING === 24)
  const resumableRun = Boolean(exactRun && unitBaseline && run!.executionGenerationState === "ACTIVE" && run!.resumeEligible && run!.leaseState !== "ACTIVE" && run!.terminalUnitCount === 0)
  if (run && !exactRun) blockers.push("RUN:EXACT_RUN_ID_NOT_FOUND")
  if (run && exactRun && run.executionGenerationState !== "ACTIVE") blockers.push("RUN:EXECUTION_GENERATION_NOT_ACTIVE")
  if (run && exactRun && !run.resumeEligible) blockers.push("RUN:NOT_RESUME_ELIGIBLE")
  if (run?.leaseState === "ACTIVE") blockers.push("RUN:ACTIVE_LEASE_PRESENT")
  if (run && !unitBaseline) blockers.push("RUN:PERSISTED_UNIT_BASELINE_MISMATCH")
  if (run && run.terminalUnitCount > 0) blockers.push("RUN:TERMINAL_UNITS_PRESENT")
  const artifactsReady = Boolean(run && run.retainedArtifacts.count === 2 && run.retainedArtifacts.allAttributedToRun)
  if (run && !run.retainedArtifacts.allAttributedToRun) blockers.push("RETAINED_ARTIFACTS:UNATTRIBUTED")
  if (run && run.retainedArtifacts.count !== 2) blockers.push("RETAINED_ARTIFACTS:COUNT_MISMATCH")
  const candidateAndWatermarkReady = Boolean(run && run.candidateCount === 0 && run.commonWatermark === null)
  if (run?.candidateCount) blockers.push("CANDIDATES:ALREADY_PRESENT")
  if (run?.commonWatermark) blockers.push("COMMON_WATERMARK:ALREADY_PRESENT")
  const providersReady = Boolean(providers?.available)
  if (providers && !providersReady) blockers.push(sanitizedDiagnostic(providers.diagnostic, "PROVIDERS:ONE_DAY_WINDOW_UNAVAILABLE"))

  const checks = Object.freeze({
    environment: environment ? environmentReady ? "READY" as const : "BLOCKED" as const : "FAILED" as const,
    d3Schema: schema ? schemaReady ? "READY" as const : "BLOCKED" as const : "FAILED" as const,
    run: run ? resumableRun ? "READY" as const : "BLOCKED" as const : "FAILED" as const,
    retainedArtifacts: run ? artifactsReady ? "READY" as const : "BLOCKED" as const : "FAILED" as const,
    candidateAndWatermark: run ? candidateAndWatermarkReady ? "READY" as const : "BLOCKED" as const : "FAILED" as const,
    providers: providers ? providersReady ? "READY" as const : "BLOCKED" as const : "FAILED" as const,
  })
  const status: BackfillDoctorStatus = Object.values(checks).includes("FAILED") ? "FAILED" : blockers.length ? "BLOCKED" : "READY"
  return Object.freeze({ version: BACKFILL_DOCTOR_VERSION, status, ...day, runId: BACKFILL_DOCTOR_BASELINE_RUN_ID, checks, blockers: Object.freeze([...new Set(blockers)].sort()), facts: Object.freeze({ retainedArtifactCount: run?.retainedArtifacts.count ?? null, candidateCount: run?.candidateCount ?? null, commonWatermark: run?.commonWatermark ?? null }) })
}
