import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { MVP_REFRESH_INSTRUMENTS, MVP_REFRESH_MANDATORY_DATASETS } from "./contracts"
import { createRefreshLogicalSlot, type RefreshLogicalDataset, type RefreshLogicalInstrument, type RefreshSlotResumePlanEntry } from "./unitReconciliation"

export const LIVE_RESUME_COORDINATOR_VERSION = "mvp-live-resume-coordinator/1.0.0" as const
export const LIVE_RESUME_MAX_INTERVAL_MS = 86_400_000
export const LIVE_RESUME_MAX_CONCURRENCY = 2

export const LIVE_RESUME_STAGES = Object.freeze([
  "PLAN_VERIFIED",
  "UNITS_RESOLVED",
  "SOURCES_ACQUIRED",
  "RAW_ARTIFACTS_PERSISTED",
  "CANDIDATES_NORMALIZED",
  "CANONICAL_COMMITTED",
  "DATASET_WATERMARKS_VALIDATED",
  "COMMON_WATERMARK_VALIDATED",
  "COVERAGE_PERSISTED",
  "CONSISTENCY_PERSISTED",
  "EVIDENCE_PERSISTED",
  "PROJECTIONS_PERSISTED",
  "REPLAY_MATERIALIZED",
  "CANDIDATE_MEMBERSHIP_ASSEMBLED",
  "CANDIDATE_MANIFEST_PERSISTED",
  "CANDIDATE_COMPARISON_VERIFIED",
  "COMPLETE",
] as const)

export type LiveResumeStage = typeof LIVE_RESUME_STAGES[number]
export type LiveResumeExecutionMode = "DRY_RUN" | "CERTIFICATION" | "LIVE"
export type LiveResumeUnitAction = "CREATED_UNIT" | "REUSED_UNIT" | "RESUMED_UNIT" | "REUSED_AUTHORITATIVE_OUTPUT" | "BLOCKED"

export interface CertifiedLiveResumePlan {
  readonly planIdentity: string
  readonly planChecksum: string
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly slots: readonly RefreshSlotResumePlanEntry[]
  readonly executionProfile?: "CURRENT_CANDIDATE_CATCHUP"
  readonly currentCatchup?: CurrentCatchupPlanContext
  readonly executionGeneration?: CleanExecutionGenerationContext
}

export interface CurrentCatchupPlanContext {
  readonly version: "mvp-current-catchup-plan-context/1.0.0"
  readonly catchupId: string
  readonly dayOrdinal: number
  readonly baseline: {
    readonly candidateId: string
    readonly candidateChecksum: string
    readonly governedThrough: string
    readonly sourceLineageIdentity: string
  }
  readonly predecessor: {
    readonly planId: string
    readonly runId: string
    readonly governedThrough: string
  } | null
}

export interface CleanExecutionGenerationContext {
  readonly version: "mvp-clean-execution-generation/1.0.0"
  readonly executionGenerationId: string
  readonly ordinal: number
  readonly predecessorRunId: string
  readonly predecessorQuarantineReceiptId: string
  readonly inputManifestChecksum: string
  readonly sourceCommitSha: string
  readonly operatorConfirmationIdentity: string
}

export interface LiveResumeTargetClassification {
  readonly refreshLocal: boolean
  readonly truthPlaneLocal: boolean
  readonly servingLocal: boolean
  readonly objectStorageLocal: boolean
  readonly servingPublisher: boolean
  readonly managedOrProductionTarget: boolean
}

export interface LiveResumeUnitResolution {
  readonly logicalSlotId: string
  readonly dataset: RefreshLogicalDataset
  readonly instrument: RefreshLogicalInstrument
  readonly action: LiveResumeUnitAction
  readonly unitId: string | null
  readonly sourceContractId: string
  readonly checkpointStartStage: "PENDING" | "ACQUIRED" | "NORMALIZED" | "COMMITTED" | "VALIDATED" | "COMPLETE"
  readonly fencingToken: number | null
  readonly reason: string
}

export type LiveResumeExecutionIntent = "DRY_RUN" | "RUN" | "RESUME"
export interface LiveResumeExecutionSetup {
  readonly planStatus: "CREATED" | "DUPLICATE" | "DRY_RUN"
  readonly persistedPlanId: string
  readonly runStatus: "CREATED" | "DUPLICATE" | "DRY_RUN"
  readonly persistedRunId: string
  readonly unitOutcomes: readonly LiveResumeUnitResolution[]
  readonly transactionChecksum: string
  readonly resumeClassification: "NEW_EXECUTION" | "EXISTING_INCOMPLETE_EXECUTION" | "EXISTING_COMPLETE_EXECUTION" | "DRY_RUN"
}

export interface LiveResumeSlotResult {
  readonly logicalSlotId: string
  readonly dataset: RefreshLogicalDataset
  readonly instrument: RefreshLogicalInstrument
  readonly unitId: string | null
  readonly sourceContractId: string
  readonly sourceContractVersion: string
  readonly providerBinding: string
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly executionGenerationId: string
  readonly retrievalIdentity: string
  readonly rawArtifactIdentity: string
  readonly rawArtifactChecksum: string
  readonly candidateIdentity: string
  readonly candidateChecksum: string
  readonly canonicalCommitResult: "CREATED" | "DUPLICATE"
  readonly canonicalFactIdentities: readonly { readonly identity: string; readonly checksum: string }[]
  readonly validationStatus: "PASSED"
  readonly limitations: readonly string[]
  readonly durationMs: number
  readonly retainedBytes: number
}

export interface LiveResumeStageOutput {
  readonly identities: readonly string[]
  readonly checksum: string
  readonly details?: Readonly<Record<string, unknown>>
}

export interface LiveResumeStageCheckpoint {
  readonly coordinatorRunId: string
  readonly stage: LiveResumeStage
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly plannerIdentity: string
  readonly plannerChecksum: string
  readonly inputChecksum: string
  readonly output: LiveResumeStageOutput
  readonly previousStage: LiveResumeStage | null
  readonly previousStageChecksum: string | null
  readonly fencingToken: number
  readonly state: "COMPLETE" | "FAILED"
  readonly failureClassification: string | null
  readonly resumeEligible: boolean
  readonly checksum: string
}

export interface LiveResumeCoordinatorPorts {
  readonly targets: { classify(): Promise<LiveResumeTargetClassification> }
  readonly execution: {
    resolveOrCreate(input: { readonly plan: CertifiedLiveResumePlan; readonly mode: LiveResumeExecutionMode; readonly intent: LiveResumeExecutionIntent }): Promise<LiveResumeExecutionSetup>
  }
  readonly lease: {
    acquire(runId: string): Promise<{ readonly fencingToken: number }>
    assert(runId: string, fencingToken: number): Promise<void>
    release(runId: string, fencingToken: number): Promise<void>
  }
  readonly checkpoints: {
    read(runId: string, stage: LiveResumeStage): Promise<LiveResumeStageCheckpoint | null>
    append(checkpoint: LiveResumeStageCheckpoint): Promise<"CREATED" | "DUPLICATE">
    appendFailure(checkpoint: LiveResumeStageCheckpoint): Promise<"CREATED" | "DUPLICATE">
  }
  readonly authoritativeOhlcv: {
    reuse(slot: RefreshSlotResumePlanEntry): Promise<LiveResumeSlotResult>
  }
  readonly executors: Readonly<Record<RefreshLogicalDataset, { execute(slot: RefreshSlotResumePlanEntry, unit: LiveResumeUnitResolution, input: { readonly runId: string; readonly mode: LiveResumeExecutionMode; readonly fencingToken: number }): Promise<LiveResumeSlotResult> }>>
  readonly watermarks: {
    persistDataset(dataset: RefreshLogicalDataset, through: string, slots: readonly LiveResumeSlotResult[]): Promise<LiveResumeStageOutput>
    persistCommon(through: string, datasets: readonly LiveResumeStageOutput[]): Promise<LiveResumeStageOutput>
  }
  readonly downstream: Readonly<Record<"coverage" | "consistency" | "evidence" | "projections" | "replay", (input: { readonly intervalStart: string; readonly intervalEnd: string; readonly slots: readonly LiveResumeSlotResult[]; readonly prior: readonly LiveResumeStageCheckpoint[] }) => Promise<LiveResumeStageOutput>>>
  readonly candidate: {
    assemble(input: { readonly intervalStart: string; readonly intervalEnd: string; readonly slots: readonly LiveResumeSlotResult[]; readonly prior: readonly LiveResumeStageCheckpoint[] }): Promise<LiveResumeStageOutput>
    persistManifest(input: { readonly intervalStart: string; readonly intervalEnd: string; readonly prior: readonly LiveResumeStageCheckpoint[] }): Promise<LiveResumeStageOutput>
    compare(input: { readonly intervalStart: string; readonly intervalEnd: string; readonly prior: readonly LiveResumeStageCheckpoint[] }): Promise<LiveResumeStageOutput>
  }
}

export interface LiveResumeCoordinatorInput {
  readonly plan: CertifiedLiveResumePlan
  readonly allowedInstruments: readonly RefreshLogicalInstrument[]
  readonly allowedDatasets: readonly RefreshLogicalDataset[]
  readonly mode: LiveResumeExecutionMode
  readonly intent?: Exclude<LiveResumeExecutionIntent, "DRY_RUN">
  readonly maxConcurrency?: number
  readonly failAfterStage?: LiveResumeStage
}

export interface LiveResumeCoordinatorResult {
  readonly status: "DRY_RUN" | "COMPLETE"
  readonly coordinatorRunId: string
  readonly planIdentity: string
  readonly planChecksum: string
  readonly logicalOutcomes: number
  readonly unitIntents: number
  readonly resolutions: readonly LiveResumeUnitResolution[]
  readonly slotResults: readonly LiveResumeSlotResult[]
  readonly checkpoints: readonly LiveResumeStageCheckpoint[]
  readonly commonWatermark: string | null
  readonly candidateBaseline?: LiveResumeCandidateBaseline | null
  readonly candidateExposed: false
}

export interface LiveResumeCandidateBaseline {
  readonly candidateId: string
  readonly candidateChecksum: string
  readonly governedThrough: string
  readonly sourceLineageIdentity: string
  readonly commonWatermarkId: string
  readonly commonWatermarkValue: string
  readonly commonWatermarkChecksum: string
  readonly memberSetChecksum: string
}

export type LiveResumeWorkerCommand = "inspect" | "plan" | "preflight" | "dry-run" | "run" | "resume" | "status" | "verify" | "bootstrap-governance" | "quarantine-generation" | "reconcile-quarantine" | "create-clean-generation" | "clean-generation-status" | "clean-generation-preflight" | "execute-clean-generation"
export type LiveResumeWorkerOptions = {
  readonly command: Exclude<LiveResumeWorkerCommand, "quarantine-generation" | "reconcile-quarantine" | "create-clean-generation" | "clean-generation-status" | "clean-generation-preflight" | "execute-clean-generation">
  readonly start: string
  readonly end: string
  readonly executionMode: "dry-run" | "live"
  readonly confirmLocalInactiveCandidate: boolean
} | {
  readonly command: "quarantine-generation"
  readonly runId: string
  readonly reason: string
  readonly confirmQuarantine: boolean
  readonly incidentChecksum: string | null
  readonly operatorConfirmationIdentity: string
  readonly executionMode: "dry-run"
  readonly confirmLocalInactiveCandidate: false
} | {
  readonly command: "reconcile-quarantine"
  readonly runId: string
  readonly confirmReconcile: boolean
  readonly incidentChecksum: string | null
  readonly operatorConfirmationIdentity: string
  readonly executionMode: "dry-run"
  readonly confirmLocalInactiveCandidate: false
} | {
  readonly command: "create-clean-generation"
  readonly predecessorRunId: string
  readonly start: string
  readonly end: string
  readonly manifestChecksum: string
  readonly confirmCreate: boolean
  readonly operatorConfirmationIdentity: string
  readonly executionMode: "live"
  readonly confirmLocalInactiveCandidate: false
} | {
  readonly command: "clean-generation-status" | "clean-generation-preflight" | "execute-clean-generation"
  readonly executionGenerationId: string
  readonly executionMode: "dry-run" | "live"
  readonly confirmLocalInactiveCandidate: boolean
}

export function parseLiveResumeWorkerOptions(argv: readonly string[]): LiveResumeWorkerOptions {
  const command = argv[0] as LiveResumeWorkerCommand | undefined
  if (!command || !["inspect", "plan", "preflight", "dry-run", "run", "resume", "status", "verify", "bootstrap-governance", "quarantine-generation", "reconcile-quarantine", "create-clean-generation", "clean-generation-status", "clean-generation-preflight", "execute-clean-generation"].includes(command)) throw new Error("LIVE_RESUME_COMMAND_INVALID")
  const option = (name: string) => argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3)
  if (command === "quarantine-generation") {
    const runId = option("run-id"), reason = option("reason") ?? "LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT", confirmQuarantine = option("confirm-quarantine") === "true", incidentChecksum = option("incident-checksum") ?? null, operatorConfirmationIdentity = option("operator-confirmation-identity") ?? "preview-only"
    if (!runId || !/^mrlr_[0-9a-f]{64}$/.test(runId)) throw new Error("QUARANTINE_EXACT_RUN_ID_REQUIRED")
    if (confirmQuarantine && (!incidentChecksum || !/^[0-9a-f]{64}$/.test(incidentChecksum) || operatorConfirmationIdentity === "preview-only")) throw new Error("QUARANTINE_EXPLICIT_CONFIRMATION_REQUIRED")
    return Object.freeze({ command, runId, reason, confirmQuarantine, incidentChecksum, operatorConfirmationIdentity, executionMode: "dry-run", confirmLocalInactiveCandidate: false })
  }
  if (command === "reconcile-quarantine") {
    const runId = option("run-id"), confirmReconcile = option("confirm-reconcile") === "true", incidentChecksum = option("incident-checksum") ?? null, operatorConfirmationIdentity = option("operator-confirmation-identity") ?? "preview-only"
    if (!runId || !/^mrlr_[0-9a-f]{64}$/.test(runId)) throw new Error("QUARANTINE_EXACT_RUN_ID_REQUIRED")
    if (confirmReconcile && (!incidentChecksum || !/^[0-9a-f]{64}$/.test(incidentChecksum) || operatorConfirmationIdentity === "preview-only")) throw new Error("QUARANTINE_RECONCILE_EXPLICIT_CONFIRMATION_REQUIRED")
    return Object.freeze({ command, runId, confirmReconcile, incidentChecksum, operatorConfirmationIdentity, executionMode: "dry-run", confirmLocalInactiveCandidate: false })
  }
  if (command === "create-clean-generation") {
    const predecessorRunId = option("predecessor-run-id"), start = option("start"), end = option("end"), manifestChecksum = option("manifest-checksum"), confirmCreate = option("confirm-create") === "true", operatorConfirmationIdentity = option("operator-confirmation-identity")
    if (!predecessorRunId || !/^mrlr_[0-9a-f]{64}$/.test(predecessorRunId) || !start || !end || !manifestChecksum || !/^[0-9a-f]{64}$/.test(manifestChecksum) || !confirmCreate || !operatorConfirmationIdentity) throw new Error("CLEAN_GENERATION_EXPLICIT_CONFIRMATION_REQUIRED")
    exactIso(start); exactIso(end)
    if (Date.parse(end) - Date.parse(start) !== LIVE_RESUME_MAX_INTERVAL_MS) throw new Error("LIVE_RESUME_INTERVAL_NOT_ONE_DAY")
    return Object.freeze({ command, predecessorRunId, start, end, manifestChecksum, confirmCreate, operatorConfirmationIdentity, executionMode: "live", confirmLocalInactiveCandidate: false })
  }
  if (command === "clean-generation-status" || command === "clean-generation-preflight" || command === "execute-clean-generation") {
    const executionGenerationId = option("execution-generation-id"), executionMode = option("execution-mode") ?? "dry-run", confirmLocalInactiveCandidate = option("confirm-local-inactive-candidate") === "true"
    if (!executionGenerationId || !/^mceg_[0-9a-f]{64}$/.test(executionGenerationId)) throw new Error("CLEAN_GENERATION_ID_REQUIRED")
    if (executionMode !== "dry-run" && executionMode !== "live") throw new Error("LIVE_RESUME_EXECUTION_MODE_INVALID")
    if (command === "execute-clean-generation" && (executionMode !== "live" || !confirmLocalInactiveCandidate)) throw new Error("LIVE_RESUME_EXPLICIT_CONFIRMATION_REQUIRED")
    return Object.freeze({ command, executionGenerationId, executionMode, confirmLocalInactiveCandidate })
  }
  const start = option("start"), end = option("end")
  if (!start || !end) throw new Error("LIVE_RESUME_EXACT_INTERVAL_REQUIRED")
  exactIso(start); exactIso(end)
  if (Date.parse(end) - Date.parse(start) !== LIVE_RESUME_MAX_INTERVAL_MS) throw new Error("LIVE_RESUME_INTERVAL_NOT_ONE_DAY")
  const executionMode = option("execution-mode") ?? "dry-run"
  if (executionMode !== "dry-run" && executionMode !== "live") throw new Error("LIVE_RESUME_EXECUTION_MODE_INVALID")
  const confirmLocalInactiveCandidate = option("confirm-local-inactive-candidate") === "true"
  if ((command === "run" || command === "resume") && (executionMode !== "live" || !confirmLocalInactiveCandidate)) throw new Error("LIVE_RESUME_EXPLICIT_CONFIRMATION_REQUIRED")
  return Object.freeze({ command, start, end, executionMode, confirmLocalInactiveCandidate })
}

export function assertSanitizedLiveResumeOutput(value: unknown): void {
  const text = JSON.stringify(value)
  if (/postgres(?:ql)?:\/\//i.test(text) || /(?:password|token|connectionString|objectStorageRoot|hostname|host|port)\s*"?:/i.test(text) || /[A-Za-z]:\\/.test(text)) throw new Error("LIVE_RESUME_OUTPUT_NOT_SANITIZED")
}

const SOURCE_CONTRACT_BY_DATASET: Readonly<Record<RefreshLogicalDataset, string>> = Object.freeze({
  ohlcv: "mvp-bounded-ohlcv/1.0.0",
  "open-interest": "mvp-bounded-open-interest/1.0.0",
  funding: "binance-official-rest-funding-rate/1.0.0",
  "agg-trade": "mvp-bounded-agg-trade/1.0.0",
})
const PROVIDER_BY_DATASET: Readonly<Record<RefreshLogicalDataset, string>> = Object.freeze({ ohlcv: "binance-vision", "open-interest": "binance-vision", funding: "binance-official-rest", "agg-trade": "binance-vision" })

function exactIso(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) throw new Error("LIVE_RESUME_TIMESTAMP_INVALID")
  return value
}

function slotBasis(slot: RefreshSlotResumePlanEntry) {
  return {
    logicalSlotId: slot.logicalSlotId,
    dataset: slot.dataset,
    instrument: slot.instrument,
    intervalStart: slot.intervalStart,
    intervalEnd: slot.intervalEnd,
    action: slot.action,
    authoritativeUnitId: slot.authoritativeUnitId,
    reason: slot.reason,
    checkpointStartStage: slot.checkpointStartStage,
    blockers: [...slot.blockers],
    sourceFinalizationState: slot.sourceFinalizationState,
    ignoredAttemptIds: [...slot.ignoredAttemptIds],
  }
}

export function createCertifiedLiveResumePlan(input: Omit<CertifiedLiveResumePlan, "planIdentity" | "planChecksum">): CertifiedLiveResumePlan {
  const intervalStart = exactIso(input.intervalStart), intervalEnd = exactIso(input.intervalEnd)
  if (Date.parse(intervalEnd) - Date.parse(intervalStart) !== LIVE_RESUME_MAX_INTERVAL_MS) throw new Error("LIVE_RESUME_INTERVAL_NOT_ONE_DAY")
  const slots = Object.freeze([...input.slots].sort((left, right) => left.logicalSlotId.localeCompare(right.logicalSlotId)))
  if ((input.executionProfile === "CURRENT_CANDIDATE_CATCHUP") !== Boolean(input.currentCatchup)) throw new Error("LIVE_RESUME_EXECUTION_PROFILE_CONTEXT_INVALID")
  const basis = {
    version: LIVE_RESUME_COORDINATOR_VERSION,
    intervalStart,
    intervalEnd,
    slots: slots.map(slotBasis),
    ...(input.executionProfile ? { executionProfile: input.executionProfile, currentCatchup: input.currentCatchup } : {}),
    ...(input.executionGeneration ? { executionGeneration: input.executionGeneration } : {}),
  }
  const planChecksum = canonicalChecksum(basis)
  return Object.freeze({
    planIdentity: `mrlp_${planChecksum}`,
    planChecksum,
    intervalStart,
    intervalEnd,
    slots,
    ...(input.executionProfile ? { executionProfile: input.executionProfile, currentCatchup: Object.freeze({ ...input.currentCatchup!, baseline: Object.freeze({ ...input.currentCatchup!.baseline }) }) } : {}),
    ...(input.executionGeneration ? { executionGeneration: Object.freeze({ ...input.executionGeneration }) } : {}),
  })
}

export function liveResumePlanCounts(plan: CertifiedLiveResumePlan): Readonly<{ logicalSlots: number; reuseAuthoritative: number; createNew: number; conflicts: number; executableUnits: number }> {
  const reuseAuthoritative = plan.slots.filter((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT").length
  const createNew = plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME").length
  const conflicts = plan.slots.filter((slot) => slot.action === "BLOCKED_CONFLICT").length
  return Object.freeze({ logicalSlots: plan.slots.length, reuseAuthoritative, createNew, conflicts, executableUnits: createNew })
}

export function verifyCertifiedLiveResumePlan(plan: CertifiedLiveResumePlan): void {
  const rebuilt = createCertifiedLiveResumePlan({ intervalStart: plan.intervalStart, intervalEnd: plan.intervalEnd, slots: plan.slots, executionProfile: plan.executionProfile, currentCatchup: plan.currentCatchup, executionGeneration: plan.executionGeneration })
  if (rebuilt.planIdentity !== plan.planIdentity || rebuilt.planChecksum !== plan.planChecksum) throw new Error("LIVE_RESUME_PLAN_CHECKSUM_MISMATCH")
  if (plan.slots.length !== 24) throw new Error("LIVE_RESUME_PLAN_SLOT_COUNT_INVALID")
  const reuse = plan.slots.filter((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT")
  const create = plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME")
  const conflicts = plan.slots.filter((slot) => slot.action === "BLOCKED_CONFLICT")
  const currentCatchup = plan.executionProfile === "CURRENT_CANDIDATE_CATCHUP"
  if (currentCatchup) {
    const context = plan.currentCatchup!
    if (context.version !== "mvp-current-catchup-plan-context/1.0.0" || !/^mrcc_[0-9a-f]{64}$/.test(context.catchupId) || !Number.isInteger(context.dayOrdinal) || context.dayOrdinal < 0 || context.baseline.candidateId !== `mvp8i-candidate:${context.baseline.candidateChecksum}` || !/^[0-9a-f]{64}$/.test(context.baseline.candidateChecksum) || !context.baseline.sourceLineageIdentity || new Date(context.baseline.governedThrough).toISOString() !== context.baseline.governedThrough || (context.dayOrdinal === 0) !== (context.predecessor === null) || (context.predecessor !== null && (!/^mrlp_[0-9a-f]{64}$/.test(context.predecessor.planId) || !/^mrlr_[0-9a-f]{64}$/.test(context.predecessor.runId) || context.predecessor.governedThrough !== plan.intervalStart))) throw new Error("LIVE_RESUME_CURRENT_CATCHUP_CONTEXT_INVALID")
    if (reuse.length !== 0 || create.length !== 24 || conflicts.length !== 0) throw new Error("LIVE_RESUME_PLAN_ACTIONS_INVALID")
  } else if (reuse.length !== 1 || reuse[0]?.dataset !== "ohlcv" || reuse[0].instrument !== "BTCUSDT" || create.length !== 23 || conflicts.length !== 0) throw new Error("LIVE_RESUME_PLAN_ACTIONS_INVALID")
  const expected = new Set(MVP_REFRESH_MANDATORY_DATASETS.flatMap((dataset) => MVP_REFRESH_INSTRUMENTS.map((instrument) => `${dataset}:${instrument}`)))
  const actual = new Set(plan.slots.map((slot) => `${slot.dataset}:${slot.instrument}`))
  if (actual.size !== 24 || [...expected].some((key) => !actual.has(key))) throw new Error("LIVE_RESUME_PLAN_GRAPH_INVALID")
  if (plan.slots.some((slot) => slot.intervalStart !== plan.intervalStart || slot.intervalEnd !== plan.intervalEnd || slot.sourceFinalizationState !== "SOURCE_AVAILABLE" || slot.blockers.length)) throw new Error("LIVE_RESUME_PLAN_SLOT_INELIGIBLE")
}

export type LiveResumePlanValidationStage = "BEFORE_EXECUTION_SETUP" | "AFTER_EXECUTION_SETUP" | "DURING_EXECUTION" | "COMPLETE"

export interface PersistedLiveResumeUnitOutcome {
  readonly logicalSlotId: string
  readonly dataset: RefreshLogicalDataset
  readonly instrument: RefreshLogicalInstrument
  readonly state: string
}

export function verifyStageAwareLiveResumePlan(input: { readonly plan: CertifiedLiveResumePlan; readonly stage: LiveResumePlanValidationStage; readonly persistedUnits?: readonly PersistedLiveResumeUnitOutcome[] }): void {
  verifyCertifiedLiveResumePlan(input.plan)
  if (input.stage === "BEFORE_EXECUTION_SETUP") {
    if (input.persistedUnits?.length) throw new Error("LIVE_RESUME_PRE_SETUP_UNITS_PRESENT")
    return
  }
  const units = input.persistedUnits ?? []
  const createSlots = input.plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME")
  const expectedUnits = createSlots.length
  const unitKeys = new Set(units.map((unit) => unit.logicalSlotId))
  if (units.length > expectedUnits || unitKeys.size !== units.length || units.some((unit) => !createSlots.some((slot) => slot.logicalSlotId === unit.logicalSlotId && slot.dataset === unit.dataset && slot.instrument === unit.instrument))) throw new Error("LIVE_RESUME_PERSISTED_UNIT_GRAPH_INVALID")
  if (input.stage === "AFTER_EXECUTION_SETUP" && units.length !== expectedUnits) throw new Error("LIVE_RESUME_EXECUTION_SETUP_INCOMPLETE")
  if (input.stage === "COMPLETE" && (units.length !== expectedUnits || units.some((unit) => unit.state !== "COMPLETE"))) throw new Error("LIVE_RESUME_EXECUTION_NOT_COMPLETE")
}

function verifyAllowed(input: LiveResumeCoordinatorInput): void {
  if (input.allowedInstruments.length !== MVP_REFRESH_INSTRUMENTS.length || MVP_REFRESH_INSTRUMENTS.some((value) => !input.allowedInstruments.includes(value))) throw new Error("LIVE_RESUME_INSTRUMENT_ALLOWLIST_INVALID")
  if (input.allowedDatasets.length !== MVP_REFRESH_MANDATORY_DATASETS.length || MVP_REFRESH_MANDATORY_DATASETS.some((value) => !input.allowedDatasets.includes(value))) throw new Error("LIVE_RESUME_DATASET_ALLOWLIST_INVALID")
  const concurrency = input.maxConcurrency ?? LIVE_RESUME_MAX_CONCURRENCY
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > LIVE_RESUME_MAX_CONCURRENCY) throw new Error("LIVE_RESUME_CONCURRENCY_INVALID")
}

function checkpointChecksum(checkpoint: Omit<LiveResumeStageCheckpoint, "checksum">): string {
  return canonicalChecksum(checkpoint)
}

function failureClassification(error: unknown): string {
  const message = error instanceof Error ? error.message : "UNCLASSIFIED_FAILURE"
  const value = message.split(":", 1)[0]?.replace(/[^A-Z0-9_]/g, "_") ?? "UNCLASSIFIED_FAILURE"
  return value && /^[A-Z0-9_]+$/.test(value) ? value : "UNCLASSIFIED_FAILURE"
}

function makeOutput(details: Readonly<Record<string, unknown>>, identities: readonly string[]): LiveResumeStageOutput {
  const frozenIdentities = Object.freeze([...identities])
  return Object.freeze({ identities: frozenIdentities, checksum: canonicalChecksum({ identities: frozenIdentities, details }), details: Object.freeze({ ...details }) })
}

async function mapBounded<T, R>(values: readonly T[], concurrency: number, execute: (value: T) => Promise<R>): Promise<readonly R[]> {
  const output: R[] = new Array(values.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor++
      output[index] = await execute(values[index]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker))
  return Object.freeze(output)
}

export function validateLiveResumeSlotResultIdentity(result: LiveResumeSlotResult, slot: RefreshSlotResumePlanEntry): void {
  if (result.logicalSlotId !== slot.logicalSlotId || result.dataset !== slot.dataset || result.instrument !== slot.instrument || result.intervalStart !== slot.intervalStart || result.intervalEnd !== slot.intervalEnd || result.sourceContractVersion !== SOURCE_CONTRACT_BY_DATASET[slot.dataset] || result.providerBinding !== PROVIDER_BY_DATASET[slot.dataset] || !result.sourceContractId || !result.executionGenerationId) throw new Error("LIVE_RESUME_SLOT_RESULT_IDENTITY_MISMATCH")
}

export function certifyLiveResumeIdentityCompatibility(plan: CertifiedLiveResumePlan, authority: LiveResumeSlotResult): Readonly<{ passed: true; stableLogicalSlots: number; executionIdentitySeparated: true; higherFenceCompatible: true; crossSlotRejected: true }> {
  const authoritySlot = plan.slots.find((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT")
  if (!authoritySlot) throw new Error("LIVE_RESUME_AUTHORITY_SLOT_MISSING")
  validateLiveResumeSlotResultIdentity(authority, authoritySlot)
  for (const slot of plan.slots.filter((value) => value.action !== "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT")) {
    const rebuilt = createRefreshLogicalSlot({ provider: PROVIDER_BY_DATASET[slot.dataset], dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, contractVersion: SOURCE_CONTRACT_BY_DATASET[slot.dataset] })
    if (rebuilt.logicalSlotId !== slot.logicalSlotId) throw new Error("LIVE_RESUME_PREFLIGHT_LOGICAL_SLOT_UNSTABLE")
  }
  const other = plan.slots.find((slot) => slot.logicalSlotId !== authoritySlot.logicalSlotId)!
  let crossSlotRejected = false
  try { validateLiveResumeSlotResultIdentity(Object.freeze({ ...authority, logicalSlotId: other.logicalSlotId }), authoritySlot) } catch { crossSlotRejected = true }
  if (!crossSlotRejected) throw new Error("LIVE_RESUME_PREFLIGHT_CROSS_SLOT_ACCEPTED")
  return Object.freeze({ passed: true, stableLogicalSlots: plan.slots.length, executionIdentitySeparated: true, higherFenceCompatible: true, crossSlotRejected: true })
}

function validateSlotResult(result: LiveResumeSlotResult, slot: RefreshSlotResumePlanEntry): void {
  validateLiveResumeSlotResultIdentity(result, slot)
  if (!result.retrievalIdentity || !result.rawArtifactIdentity || !/^[0-9a-f]{64}$/.test(result.rawArtifactChecksum) || !result.candidateIdentity || !/^[0-9a-f]{64}$/.test(result.candidateChecksum) || !result.canonicalFactIdentities.length || result.canonicalFactIdentities.some((fact) => !fact.identity || !/^[0-9a-f]{64}$/.test(fact.checksum)) || result.validationStatus !== "PASSED" || result.durationMs < 0 || result.retainedBytes < 0) throw new Error("LIVE_RESUME_SLOT_RESULT_INCOMPLETE")
}

export function readLiveResumeCandidateBaseline(output: LiveResumeStageOutput): LiveResumeCandidateBaseline {
  const value = output.details?.candidateBaseline
  if (!value || typeof value !== "object") throw new Error("LIVE_RESUME_CANDIDATE_BASELINE_MISSING")
  const candidate = value as Partial<LiveResumeCandidateBaseline>
  if (!candidate.candidateId || !candidate.candidateChecksum || !candidate.governedThrough || !candidate.sourceLineageIdentity || !candidate.commonWatermarkId || !candidate.commonWatermarkValue || !candidate.commonWatermarkChecksum || !candidate.memberSetChecksum || !["mvp8i-candidate:", "mvp-serving-candidate:"].some((prefix) => candidate.candidateId === `${prefix}${candidate.candidateChecksum}`) || ![candidate.candidateChecksum, candidate.commonWatermarkChecksum, candidate.memberSetChecksum].every((checksum) => typeof checksum === "string" && /^[0-9a-f]{64}$/.test(checksum)) || new Date(candidate.governedThrough).toISOString() !== candidate.governedThrough || candidate.commonWatermarkValue !== candidate.governedThrough) throw new Error("LIVE_RESUME_CANDIDATE_BASELINE_INVALID")
  return Object.freeze(candidate as LiveResumeCandidateBaseline)
}

export class MvpLiveResumeCoordinator {
  constructor(private readonly ports: LiveResumeCoordinatorPorts) {}

  async execute(input: LiveResumeCoordinatorInput): Promise<LiveResumeCoordinatorResult> {
    verifyCertifiedLiveResumePlan(input.plan)
    verifyAllowed(input)
    const target = await this.ports.targets.classify()
    if (!target.refreshLocal || !target.truthPlaneLocal || !target.servingLocal || !target.objectStorageLocal || !target.servingPublisher || target.managedOrProductionTarget) throw new Error("LIVE_RESUME_TARGET_BOUNDARY_REJECTED")
    const execution = await this.ports.execution.resolveOrCreate({ plan: input.plan, mode: input.mode, intent: input.mode === "DRY_RUN" ? "DRY_RUN" : input.intent ?? "RUN" })
    const coordinatorRunId = execution.persistedRunId
    const lease = await this.ports.lease.acquire(coordinatorRunId)
    const checkpoints: LiveResumeStageCheckpoint[] = []
    const concurrency = input.maxConcurrency ?? LIVE_RESUME_MAX_CONCURRENCY

    const stage = async (stageName: LiveResumeStage, inputBasis: unknown, execute: () => Promise<LiveResumeStageOutput>): Promise<LiveResumeStageOutput> => {
      await this.ports.lease.assert(coordinatorRunId, lease.fencingToken)
      const previous = checkpoints.at(-1) ?? null
      const inputChecksum = canonicalChecksum({ stage: stageName, input: inputBasis })
      const stored = await this.ports.checkpoints.read(coordinatorRunId, stageName)
      if (stored) {
        if (stored.inputChecksum !== inputChecksum || stored.previousStage !== (previous?.stage ?? null) || stored.previousStageChecksum !== (previous?.checksum ?? null) || stored.plannerChecksum !== input.plan.planChecksum || stored.fencingToken > lease.fencingToken) throw new Error("LIVE_RESUME_STAGE_CHECKSUM_CONFLICT")
        checkpoints.push(stored)
        return stored.output
      }
      let output: LiveResumeStageOutput
      try { output = await execute() } catch (error) {
        const failedOutput = makeOutput({ failed: true }, [])
        const failedBasis: Omit<LiveResumeStageCheckpoint, "checksum"> = Object.freeze({ coordinatorRunId, stage: stageName, intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, plannerIdentity: input.plan.planIdentity, plannerChecksum: input.plan.planChecksum, inputChecksum, output: failedOutput, previousStage: previous?.stage ?? null, previousStageChecksum: previous?.checksum ?? null, fencingToken: lease.fencingToken, state: "FAILED", failureClassification: failureClassification(error), resumeEligible: true })
        await this.ports.checkpoints.appendFailure(Object.freeze({ ...failedBasis, checksum: checkpointChecksum(failedBasis) }))
        throw error
      }
      const basis: Omit<LiveResumeStageCheckpoint, "checksum"> = Object.freeze({ coordinatorRunId, stage: stageName, intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, plannerIdentity: input.plan.planIdentity, plannerChecksum: input.plan.planChecksum, inputChecksum, output, previousStage: previous?.stage ?? null, previousStageChecksum: previous?.checksum ?? null, fencingToken: lease.fencingToken, state: "COMPLETE", failureClassification: null, resumeEligible: true })
      const checkpoint = Object.freeze({ ...basis, checksum: checkpointChecksum(basis) })
      await this.ports.checkpoints.append(checkpoint)
      checkpoints.push(checkpoint)
      if (input.failAfterStage === stageName) {
        const error = new Error(`LIVE_RESUME_INJECTED_FAILURE:${stageName}`)
        const failedOutput = makeOutput({ failedAfterCompletedStage: true }, [])
        const failedBasis: Omit<LiveResumeStageCheckpoint, "checksum"> = Object.freeze({ ...basis, output: failedOutput, state: "FAILED", failureClassification: "LIVE_RESUME_INJECTED_FAILURE" })
        await this.ports.checkpoints.appendFailure(Object.freeze({ ...failedBasis, checksum: checkpointChecksum(failedBasis) }))
        throw error
      }
      return output
    }

    try {
      const planCounts = liveResumePlanCounts(input.plan)
      await stage("PLAN_VERIFIED", { planChecksum: input.plan.planChecksum, persistedPlanId: execution.persistedPlanId, persistedRunId: execution.persistedRunId, transactionChecksum: execution.transactionChecksum }, async () => makeOutput({ logicalSlots: planCounts.logicalSlots, reuse: planCounts.reuseAuthoritative, create: planCounts.createNew, conflicts: planCounts.conflicts, planStatus: execution.planStatus, runStatus: execution.runStatus, resumeClassification: execution.resumeClassification }, [execution.persistedPlanId, execution.persistedRunId]))
      const resolutionsBySlot = new Map<string, LiveResumeUnitResolution>()
      await stage("UNITS_RESOLVED", { slots: input.plan.slots.map(slotBasis), mode: input.mode }, async () => {
        const byLogicalSlot = new Map(execution.unitOutcomes.map((value) => [value.logicalSlotId, value]))
        const resolved = input.plan.slots.map((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT"
          ? Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, action: "REUSED_AUTHORITATIVE_OUTPUT", unitId: null, sourceContractId: SOURCE_CONTRACT_BY_DATASET.ohlcv, checkpointStartStage: "VALIDATED", fencingToken: null, reason: "CERTIFIED_AUTHORITATIVE_RECOVERY" }) satisfies LiveResumeUnitResolution
          : byLogicalSlot.get(slot.logicalSlotId)!)
        if (resolved.some((value) => !value)) throw new Error("LIVE_RESUME_EXECUTION_UNIT_OUTCOME_MISSING")
        if (resolved.length !== planCounts.logicalSlots || resolved.filter((value) => value.action === "REUSED_AUTHORITATIVE_OUTPUT").length !== planCounts.reuseAuthoritative || resolved.filter((value) => value.unitId !== null).length !== planCounts.executableUnits || resolved.some((value) => value.action === "BLOCKED")) throw new Error("LIVE_RESUME_UNIT_RESOLUTION_INVALID")
        for (const value of resolved) resolutionsBySlot.set(value.logicalSlotId, value)
        return makeOutput({ resolutions: resolved }, resolved.map((value) => value.unitId ?? value.logicalSlotId))
      })
      const resolutions = input.plan.slots.map((slot) => resolutionsBySlot.get(slot.logicalSlotId)).filter((value): value is LiveResumeUnitResolution => Boolean(value))
      if (resolutions.length === 0) {
        const stored = checkpoints.find((value) => value.stage === "UNITS_RESOLVED")?.output.details?.resolutions
        if (Array.isArray(stored)) for (const value of stored as unknown as LiveResumeUnitResolution[]) resolutions.push(value)
      }
      if (resolutions.length !== 24) throw new Error("LIVE_RESUME_RESOLUTION_RESTORE_FAILED")
      if (input.mode === "DRY_RUN") return Object.freeze({ status: "DRY_RUN", coordinatorRunId, planIdentity: input.plan.planIdentity, planChecksum: input.plan.planChecksum, logicalOutcomes: 24, unitIntents: resolutions.filter((value) => value.action === "CREATED_UNIT").length, resolutions: Object.freeze(resolutions), slotResults: Object.freeze([]), checkpoints: Object.freeze(checkpoints), commonWatermark: null, candidateBaseline: null, candidateExposed: false })

      const slotResults: LiveResumeSlotResult[] = []
      const authoritySlot = input.plan.slots.find((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT")
      const authorityResult = authoritySlot ? await this.ports.authoritativeOhlcv.reuse(authoritySlot) : null
      if (authoritySlot && authorityResult) validateSlotResult(authorityResult, authoritySlot)
      await stage("SOURCES_ACQUIRED", { resolutions: resolutions.map((value) => [value.logicalSlotId, value.action, value.unitId]) }, async () => {
        const results = await mapBounded(input.plan.slots, concurrency, async (slot) => {
          const resolution = resolutions.find((value) => value.logicalSlotId === slot.logicalSlotId)!
          const result = resolution.action === "REUSED_AUTHORITATIVE_OUTPUT"
            ? authorityResult ?? (() => { throw new Error("LIVE_RESUME_AUTHORITY_SLOT_MISSING") })()
            : await this.ports.executors[slot.dataset].execute(slot, resolution, { runId: coordinatorRunId, mode: input.mode, fencingToken: lease.fencingToken })
          validateSlotResult(result, slot)
          return result
        })
        slotResults.push(...results)
        return makeOutput({ results }, results.map((value) => value.retrievalIdentity))
      })
      if (!slotResults.length) {
        const stored = checkpoints.find((value) => value.stage === "SOURCES_ACQUIRED")?.output.details?.results
        if (Array.isArray(stored)) slotResults.push(...stored as unknown as LiveResumeSlotResult[])
      }
      if (slotResults.length !== 24) throw new Error("LIVE_RESUME_SLOT_RESULT_RESTORE_FAILED")
      await stage("RAW_ARTIFACTS_PERSISTED", { slots: slotResults.map((value) => [value.logicalSlotId, value.rawArtifactIdentity, value.rawArtifactChecksum]) }, async () => makeOutput({ verified: true }, slotResults.map((value) => value.rawArtifactIdentity)))
      await stage("CANDIDATES_NORMALIZED", { slots: slotResults.map((value) => [value.logicalSlotId, value.candidateIdentity, value.candidateChecksum]) }, async () => makeOutput({ verified: true }, slotResults.map((value) => value.candidateIdentity)))
      await stage("CANONICAL_COMMITTED", { slots: slotResults.map((value) => [value.logicalSlotId, value.canonicalCommitResult, value.canonicalFactIdentities]) }, async () => makeOutput({ verified: true }, slotResults.flatMap((value) => value.canonicalFactIdentities.map((fact) => fact.identity))))

      const datasetOutputs: LiveResumeStageOutput[] = []
      await stage("DATASET_WATERMARKS_VALIDATED", { end: input.plan.intervalEnd, slots: slotResults.map((value) => [value.dataset, value.instrument, value.validationStatus]) }, async () => {
        for (const dataset of MVP_REFRESH_MANDATORY_DATASETS) {
          const results = slotResults.filter((value) => value.dataset === dataset)
          if (results.length !== 6 || new Set(results.map((value) => value.instrument)).size !== 6) throw new Error("LIVE_RESUME_DATASET_LOGICAL_COMPLETENESS_FAILED")
          datasetOutputs.push(await this.ports.watermarks.persistDataset(dataset, input.plan.intervalEnd, results))
        }
        return makeOutput({ datasets: datasetOutputs }, datasetOutputs.flatMap((value) => value.identities))
      })
      if (!datasetOutputs.length) {
        const stored = checkpoints.find((value) => value.stage === "DATASET_WATERMARKS_VALIDATED")?.output.details?.datasets
        if (Array.isArray(stored)) datasetOutputs.push(...stored as unknown as LiveResumeStageOutput[])
      }
      await stage("COMMON_WATERMARK_VALIDATED", { end: input.plan.intervalEnd, datasetChecksums: datasetOutputs.map((value) => value.checksum) }, async () => this.ports.watermarks.persistCommon(input.plan.intervalEnd, datasetOutputs))

      const downstreamStage = async (stageName: LiveResumeStage, key: keyof LiveResumeCoordinatorPorts["downstream"]) => stage(stageName, { intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, slotChecksums: slotResults.map((value) => value.candidateChecksum), prior: checkpoints.map((value) => value.checksum) }, async () => this.ports.downstream[key]({ intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, slots: slotResults, prior: Object.freeze([...checkpoints]) }))
      await downstreamStage("COVERAGE_PERSISTED", "coverage")
      await downstreamStage("CONSISTENCY_PERSISTED", "consistency")
      await downstreamStage("EVIDENCE_PERSISTED", "evidence")
      await downstreamStage("PROJECTIONS_PERSISTED", "projections")
      await downstreamStage("REPLAY_MATERIALIZED", "replay")
      const candidateOutput = await stage("CANDIDATE_MEMBERSHIP_ASSEMBLED", { prior: checkpoints.map((value) => value.checksum) }, async () => this.ports.candidate.assemble({ intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, slots: slotResults, prior: Object.freeze([...checkpoints]) }))
      const candidateBaseline = input.plan.executionProfile === "CURRENT_CANDIDATE_CATCHUP" ? readLiveResumeCandidateBaseline(candidateOutput) : null
      await stage("CANDIDATE_MANIFEST_PERSISTED", { prior: checkpoints.map((value) => value.checksum) }, async () => this.ports.candidate.persistManifest({ intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, prior: Object.freeze([...checkpoints]) }))
      await stage("CANDIDATE_COMPARISON_VERIFIED", { prior: checkpoints.map((value) => value.checksum) }, async () => this.ports.candidate.compare({ intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, prior: Object.freeze([...checkpoints]) }))
      await stage("COMPLETE", { prior: checkpoints.map((value) => value.checksum) }, async () => makeOutput({ candidateExposed: false }, [coordinatorRunId]))
      return Object.freeze({ status: "COMPLETE", coordinatorRunId, planIdentity: input.plan.planIdentity, planChecksum: input.plan.planChecksum, logicalOutcomes: 24, unitIntents: resolutions.filter((value) => value.action === "CREATED_UNIT").length, resolutions: Object.freeze(resolutions), slotResults: Object.freeze(slotResults), checkpoints: Object.freeze(checkpoints), commonWatermark: input.plan.intervalEnd, candidateBaseline, candidateExposed: false })
    } finally {
      await this.ports.lease.release(coordinatorRunId, lease.fencingToken)
    }
  }
}

export function liveResumeStageOutput(details: Readonly<Record<string, unknown>>, identities: readonly string[]): LiveResumeStageOutput {
  return makeOutput(details, identities)
}
