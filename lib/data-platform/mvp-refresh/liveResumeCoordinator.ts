import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { MVP_REFRESH_INSTRUMENTS, MVP_REFRESH_MANDATORY_DATASETS } from "./contracts"
import type { RefreshLogicalDataset, RefreshLogicalInstrument, RefreshSlotResumePlanEntry } from "./unitReconciliation"

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
  readonly candidateExposed: false
}

export type LiveResumeWorkerCommand = "inspect" | "plan" | "preflight" | "dry-run" | "run" | "resume" | "status" | "verify"
export interface LiveResumeWorkerOptions {
  readonly command: LiveResumeWorkerCommand
  readonly start: string
  readonly end: string
  readonly executionMode: "dry-run" | "live"
  readonly confirmLocalInactiveCandidate: boolean
}

export function parseLiveResumeWorkerOptions(argv: readonly string[]): LiveResumeWorkerOptions {
  const command = argv[0] as LiveResumeWorkerCommand | undefined
  if (!command || !["inspect", "plan", "preflight", "dry-run", "run", "resume", "status", "verify"].includes(command)) throw new Error("LIVE_RESUME_COMMAND_INVALID")
  const option = (name: string) => argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3)
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
  const basis = { version: LIVE_RESUME_COORDINATOR_VERSION, intervalStart, intervalEnd, slots: slots.map(slotBasis) }
  const planChecksum = canonicalChecksum(basis)
  return Object.freeze({ planIdentity: `mrlp_${planChecksum}`, planChecksum, intervalStart, intervalEnd, slots })
}

export function verifyCertifiedLiveResumePlan(plan: CertifiedLiveResumePlan): void {
  const rebuilt = createCertifiedLiveResumePlan({ intervalStart: plan.intervalStart, intervalEnd: plan.intervalEnd, slots: plan.slots })
  if (rebuilt.planIdentity !== plan.planIdentity || rebuilt.planChecksum !== plan.planChecksum) throw new Error("LIVE_RESUME_PLAN_CHECKSUM_MISMATCH")
  if (plan.slots.length !== 24) throw new Error("LIVE_RESUME_PLAN_SLOT_COUNT_INVALID")
  const reuse = plan.slots.filter((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT")
  const create = plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME")
  const conflicts = plan.slots.filter((slot) => slot.action === "BLOCKED_CONFLICT")
  if (reuse.length !== 1 || reuse[0]?.dataset !== "ohlcv" || reuse[0].instrument !== "BTCUSDT" || create.length !== 23 || conflicts.length !== 0) throw new Error("LIVE_RESUME_PLAN_ACTIONS_INVALID")
  const expected = new Set(MVP_REFRESH_MANDATORY_DATASETS.flatMap((dataset) => MVP_REFRESH_INSTRUMENTS.map((instrument) => `${dataset}:${instrument}`)))
  const actual = new Set(plan.slots.map((slot) => `${slot.dataset}:${slot.instrument}`))
  if (actual.size !== 24 || [...expected].some((key) => !actual.has(key))) throw new Error("LIVE_RESUME_PLAN_GRAPH_INVALID")
  if (plan.slots.some((slot) => slot.intervalStart !== plan.intervalStart || slot.intervalEnd !== plan.intervalEnd || slot.sourceFinalizationState !== "SOURCE_AVAILABLE" || slot.blockers.length)) throw new Error("LIVE_RESUME_PLAN_SLOT_INELIGIBLE")
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

function validateSlotResult(result: LiveResumeSlotResult, slot: RefreshSlotResumePlanEntry): void {
  if (result.logicalSlotId !== slot.logicalSlotId || result.dataset !== slot.dataset || result.instrument !== slot.instrument || result.sourceContractId !== SOURCE_CONTRACT_BY_DATASET[slot.dataset]) throw new Error("LIVE_RESUME_SLOT_RESULT_IDENTITY_MISMATCH")
  if (!result.retrievalIdentity || !result.rawArtifactIdentity || !/^[0-9a-f]{64}$/.test(result.rawArtifactChecksum) || !result.candidateIdentity || !/^[0-9a-f]{64}$/.test(result.candidateChecksum) || !result.canonicalFactIdentities.length || result.canonicalFactIdentities.some((fact) => !fact.identity || !/^[0-9a-f]{64}$/.test(fact.checksum)) || result.validationStatus !== "PASSED" || result.durationMs < 0 || result.retainedBytes < 0) throw new Error("LIVE_RESUME_SLOT_RESULT_INCOMPLETE")
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
      await stage("PLAN_VERIFIED", { planChecksum: input.plan.planChecksum, persistedPlanId: execution.persistedPlanId, persistedRunId: execution.persistedRunId, transactionChecksum: execution.transactionChecksum }, async () => makeOutput({ logicalSlots: 24, reuse: 1, create: 23, conflicts: 0, planStatus: execution.planStatus, runStatus: execution.runStatus, resumeClassification: execution.resumeClassification }, [execution.persistedPlanId, execution.persistedRunId]))
      const resolutionsBySlot = new Map<string, LiveResumeUnitResolution>()
      await stage("UNITS_RESOLVED", { slots: input.plan.slots.map(slotBasis), mode: input.mode }, async () => {
        const byLogicalSlot = new Map(execution.unitOutcomes.map((value) => [value.logicalSlotId, value]))
        const resolved = input.plan.slots.map((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT"
          ? Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, action: "REUSED_AUTHORITATIVE_OUTPUT", unitId: null, sourceContractId: SOURCE_CONTRACT_BY_DATASET.ohlcv, checkpointStartStage: "VALIDATED", fencingToken: null, reason: "CERTIFIED_AUTHORITATIVE_RECOVERY" }) satisfies LiveResumeUnitResolution
          : byLogicalSlot.get(slot.logicalSlotId)!)
        if (resolved.some((value) => !value)) throw new Error("LIVE_RESUME_EXECUTION_UNIT_OUTCOME_MISSING")
        if (resolved.length !== 24 || resolved.filter((value) => value.action === "REUSED_AUTHORITATIVE_OUTPUT").length !== 1 || resolved.filter((value) => value.unitId !== null).length > 23 || resolved.some((value) => value.action === "BLOCKED")) throw new Error("LIVE_RESUME_UNIT_RESOLUTION_INVALID")
        for (const value of resolved) resolutionsBySlot.set(value.logicalSlotId, value)
        return makeOutput({ resolutions: resolved }, resolved.map((value) => value.unitId ?? value.logicalSlotId))
      })
      const resolutions = input.plan.slots.map((slot) => resolutionsBySlot.get(slot.logicalSlotId)).filter((value): value is LiveResumeUnitResolution => Boolean(value))
      if (resolutions.length === 0) {
        const stored = checkpoints.find((value) => value.stage === "UNITS_RESOLVED")?.output.details?.resolutions
        if (Array.isArray(stored)) for (const value of stored as unknown as LiveResumeUnitResolution[]) resolutions.push(value)
      }
      if (resolutions.length !== 24) throw new Error("LIVE_RESUME_RESOLUTION_RESTORE_FAILED")
      if (input.mode === "DRY_RUN") return Object.freeze({ status: "DRY_RUN", coordinatorRunId, planIdentity: input.plan.planIdentity, planChecksum: input.plan.planChecksum, logicalOutcomes: 24, unitIntents: resolutions.filter((value) => value.action === "CREATED_UNIT").length, resolutions: Object.freeze(resolutions), slotResults: Object.freeze([]), checkpoints: Object.freeze(checkpoints), commonWatermark: null, candidateExposed: false })

      const slotResults: LiveResumeSlotResult[] = []
      await stage("SOURCES_ACQUIRED", { resolutions: resolutions.map((value) => [value.logicalSlotId, value.action, value.unitId]) }, async () => {
        const results = await mapBounded(input.plan.slots, concurrency, async (slot) => {
          const resolution = resolutions.find((value) => value.logicalSlotId === slot.logicalSlotId)!
          const result = resolution.action === "REUSED_AUTHORITATIVE_OUTPUT" ? await this.ports.authoritativeOhlcv.reuse(slot) : await this.ports.executors[slot.dataset].execute(slot, resolution, { runId: coordinatorRunId, mode: input.mode, fencingToken: lease.fencingToken })
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
      await stage("CANDIDATE_MEMBERSHIP_ASSEMBLED", { prior: checkpoints.map((value) => value.checksum) }, async () => this.ports.candidate.assemble({ intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, slots: slotResults, prior: Object.freeze([...checkpoints]) }))
      await stage("CANDIDATE_MANIFEST_PERSISTED", { prior: checkpoints.map((value) => value.checksum) }, async () => this.ports.candidate.persistManifest({ intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, prior: Object.freeze([...checkpoints]) }))
      await stage("CANDIDATE_COMPARISON_VERIFIED", { prior: checkpoints.map((value) => value.checksum) }, async () => this.ports.candidate.compare({ intervalStart: input.plan.intervalStart, intervalEnd: input.plan.intervalEnd, prior: Object.freeze([...checkpoints]) }))
      await stage("COMPLETE", { prior: checkpoints.map((value) => value.checksum) }, async () => makeOutput({ candidateExposed: false }, [coordinatorRunId]))
      return Object.freeze({ status: "COMPLETE", coordinatorRunId, planIdentity: input.plan.planIdentity, planChecksum: input.plan.planChecksum, logicalOutcomes: 24, unitIntents: resolutions.filter((value) => value.action === "CREATED_UNIT").length, resolutions: Object.freeze(resolutions), slotResults: Object.freeze(slotResults), checkpoints: Object.freeze(checkpoints), commonWatermark: input.plan.intervalEnd, candidateExposed: false })
    } finally {
      await this.ports.lease.release(coordinatorRunId, lease.fencingToken)
    }
  }
}

export function liveResumeStageOutput(details: Readonly<Record<string, unknown>>, identities: readonly string[]): LiveResumeStageOutput {
  return makeOutput(details, identities)
}
