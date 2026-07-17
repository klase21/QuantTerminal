import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type {
  LiveResumeCoordinatorPorts,
  LiveResumeExecutionMode,
  LiveResumeSlotResult,
  LiveResumeStageCheckpoint,
  LiveResumeStageOutput,
  LiveResumeUnitResolution,
} from "./liveResumeCoordinator"
import { createRefreshLogicalSlot, type RefreshLogicalDataset, type RefreshLogicalInstrument, type RefreshSlotResumePlanEntry } from "./unitReconciliation"

export const LIVE_EXECUTOR_PORT_VERSION = "mvp-live-executor-ports/1.0.0" as const
export const LIVE_EXECUTOR_ALLOWED_INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const)
const LIVE_EXECUTOR_PROVIDER_BY_DATASET: Readonly<Record<RefreshLogicalDataset, string>> = Object.freeze({ ohlcv: "binance-vision", "open-interest": "binance-vision", funding: "binance-official-rest", "agg-trade": "binance-vision" })
export const LIVE_EXECUTOR_PORT_NAMES = Object.freeze([
  "executeBoundedOhlcvSlot", "executeBoundedOpenInterestSlot", "executeBoundedFundingSlot", "executeBoundedAggTradesSlot",
  "persistDatasetWatermark", "persistCommonWatermark", "executeBoundedCoverage", "executeAffectedConsistency",
  "executeAffectedEvidence", "executeAffectedProjections", "executeReplayMaterialization", "assembleInactiveCandidate",
  "persistCandidateManifest", "compareActiveAndCandidate",
] as const)

export type LiveExecutorStatus = "CREATED" | "DUPLICATE" | "CONFLICT" | "INELIGIBLE" | "SOURCE_NOT_FINALIZED" | "BLOCKED_PRECONDITION"
export type SanitizedLiveExecutorFailure = "VARIABLE_MISSING" | "AUTHENTICATION_FAILED" | "WRONG_DATABASE" | "WRONG_ROLE" | "NON_LOCAL_TARGET" | "CONNECTION_FAILED" | "BINDING_INCOMPLETE" | "READY"

export interface LiveExecutorInvocation {
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly logicalSlotId: string
  readonly executionGenerationId: string
  readonly plannerIdentity: string
  readonly plannerChecksum: string
  readonly sourceContractId: string
  readonly sourceContractVersion: string
  readonly providerBinding: string
  readonly unitId: string
  readonly dataset: RefreshLogicalDataset
  readonly instrument: RefreshLogicalInstrument
  readonly fencingToken: number
  readonly checkpointInputChecksum: string
  readonly allowedDatasets: readonly RefreshLogicalDataset[]
  readonly allowedInstruments: readonly RefreshLogicalInstrument[]
  readonly requiredUpstream: readonly { readonly identity: string; readonly checksum: string }[]
  readonly mode: Exclude<LiveResumeExecutionMode, "DRY_RUN">
}

export interface LiveExecutorPortResult {
  readonly status: LiveExecutorStatus
  readonly logicalSlotId: string
  readonly dataset: RefreshLogicalDataset
  readonly instrument: RefreshLogicalInstrument
  readonly unitId: string
  readonly sourceContractId: string
  readonly sourceContractVersion: string
  readonly providerBinding: string
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly executionGenerationId: string
  readonly retrievalIdentity: string | null
  readonly rawArtifactIdentity: string | null
  readonly rawArtifactChecksum: string | null
  readonly candidateIdentity: string | null
  readonly candidateChecksum: string | null
  readonly canonicalOutputIdentities: readonly { readonly identity: string; readonly checksum: string }[]
  readonly createdCount: number
  readonly duplicateCount: number
  readonly conflictCount: number
  readonly limitations: readonly string[]
  readonly retainedBytes: number
  readonly durationMs: number
  readonly resumeToken: Readonly<Record<string, unknown>>
  readonly outputChecksum: string
  readonly failureClassification: SanitizedLiveExecutorFailure
}

export interface LiveSlotSourceResult {
  readonly status: "AVAILABLE" | "SOURCE_NOT_FINALIZED" | "INELIGIBLE"
  readonly retrievalIdentity: string | null
  readonly bytes: Uint8Array | null
  readonly sourceChecksum: string | null
  readonly contentType: string | null
  readonly observedThrough: string | null
  readonly limitations: readonly string[]
}

export interface LiveSlotArtifactResult {
  readonly artifactIdentity: string
  readonly artifactChecksum: string
  readonly retainedBytes: number
  readonly status: "CREATED" | "DUPLICATE"
}

export interface LiveSlotCandidateResult {
  readonly candidateIdentity: string
  readonly candidateChecksum: string
  readonly status: "CREATED" | "DUPLICATE" | "CONFLICT"
  readonly payload: unknown
}

export interface LiveSlotCommitResult {
  readonly status: "CREATED" | "DUPLICATE" | "CONFLICT"
  readonly outputs: readonly { readonly identity: string; readonly checksum: string }[]
  readonly createdCount: number
  readonly duplicateCount: number
  readonly conflictCount: number
}
export interface LiveSlotResumeResult {
  readonly stage: "SOURCE_ACQUISITION" | "CANDIDATE_LINEAGE" | "CANONICAL_COMMIT"
  readonly source?: LiveSlotSourceResult
  readonly artifact?: LiveSlotArtifactResult
  readonly candidate?: LiveSlotCandidateResult
}

export interface BoundedLiveSlotAdapter {
  readonly dataset: RefreshLogicalDataset
  readonly sourceContractId: string
  readonly supportedInstruments: readonly RefreshLogicalInstrument[]
  reconcileResume?(input: LiveExecutorInvocation): Promise<LiveSlotResumeResult | null>
  inspectFinalization(input: LiveExecutorInvocation): Promise<LiveSlotSourceResult>
  persistArtifact(input: LiveExecutorInvocation, source: LiveSlotSourceResult): Promise<LiveSlotArtifactResult>
  normalizeAndPersistCandidates(input: LiveExecutorInvocation, source: LiveSlotSourceResult, artifact: LiveSlotArtifactResult): Promise<LiveSlotCandidateResult>
  commit(input: LiveExecutorInvocation, candidate: LiveSlotCandidateResult): Promise<LiveSlotCommitResult>
  validate(input: LiveExecutorInvocation, source: LiveSlotSourceResult, artifact: LiveSlotArtifactResult, candidate: LiveSlotCandidateResult, commit: LiveSlotCommitResult): Promise<readonly string[]>
  recordIdentityMismatch?(input: LiveExecutorInvocation, classification: "LIVE_RESUME_SLOT_RESULT_IDENTITY_MISMATCH"): Promise<void>
}

export interface LiveExecutorPortSet {
  executeBoundedOhlcvSlot(input: LiveExecutorInvocation): Promise<LiveExecutorPortResult>
  executeBoundedOpenInterestSlot(input: LiveExecutorInvocation): Promise<LiveExecutorPortResult>
  executeBoundedFundingSlot(input: LiveExecutorInvocation): Promise<LiveExecutorPortResult>
  executeBoundedAggTradesSlot(input: LiveExecutorInvocation): Promise<LiveExecutorPortResult>
}

function exactDay(start: string, end: string): void {
  const startMs = Date.parse(start), endMs = Date.parse(end)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || new Date(startMs).toISOString() !== start || new Date(endMs).toISOString() !== end || endMs - startMs !== 86_400_000 || startMs % 86_400_000 !== 0) throw new Error("LIVE_EXECUTOR_EXACT_DAY_REQUIRED")
}

function checksum64(value: string, code: string): void { if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(code) }

function validateInvocation(input: LiveExecutorInvocation, adapter: BoundedLiveSlotAdapter): void {
  exactDay(input.intervalStart, input.intervalEnd)
  checksum64(input.plannerChecksum, "LIVE_EXECUTOR_PLANNER_CHECKSUM_INVALID")
  checksum64(input.checkpointInputChecksum, "LIVE_EXECUTOR_CHECKPOINT_CHECKSUM_INVALID")
  if (!input.logicalSlotId || !input.executionGenerationId || !input.plannerIdentity || !input.unitId || input.fencingToken < 1) throw new Error("LIVE_EXECUTOR_IDENTITY_INCOMPLETE")
  if (input.dataset !== adapter.dataset || input.sourceContractVersion !== adapter.sourceContractId || input.sourceContractId !== adapter.sourceContractId) throw new Error("LIVE_EXECUTOR_SOURCE_CONTRACT_MISMATCH")
  const expectedSlot = createRefreshLogicalSlot({ provider: input.providerBinding, dataset: input.dataset, instrument: input.instrument, intervalStart: input.intervalStart, intervalEnd: input.intervalEnd, contractVersion: input.sourceContractVersion })
  if (expectedSlot.logicalSlotId !== input.logicalSlotId) throw new Error("LIVE_EXECUTOR_PREWRITE_LOGICAL_SLOT_MISMATCH")
  if (input.dataset === "ohlcv" && input.instrument === "BTCUSDT") throw new Error("LIVE_EXECUTOR_BTCUSDT_OHLCV_REUSE_ONLY")
  if (!input.allowedDatasets.includes(input.dataset) || !input.allowedInstruments.includes(input.instrument) || !adapter.supportedInstruments.includes(input.instrument)) throw new Error("LIVE_EXECUTOR_ALLOWLIST_REJECTED")
  for (const upstream of input.requiredUpstream) { if (!upstream.identity) throw new Error("LIVE_EXECUTOR_UPSTREAM_IDENTITY_MISSING"); checksum64(upstream.checksum, "LIVE_EXECUTOR_UPSTREAM_CHECKSUM_INVALID") }
}

function terminal(input: LiveExecutorInvocation, status: LiveExecutorStatus, limitations: readonly string[], startedAt: number): LiveExecutorPortResult {
  const basis = { status, logicalSlotId: input.logicalSlotId, executionGenerationId: input.executionGenerationId, dataset: input.dataset, instrument: input.instrument, intervalStart: input.intervalStart, intervalEnd: input.intervalEnd, unitId: input.unitId, sourceContractId: input.sourceContractId, sourceContractVersion: input.sourceContractVersion, providerBinding: input.providerBinding, retrievalIdentity: null, rawArtifactIdentity: null, rawArtifactChecksum: null, candidateIdentity: null, candidateChecksum: null, canonicalOutputIdentities: Object.freeze([]), createdCount: 0, duplicateCount: 0, conflictCount: status === "CONFLICT" ? 1 : 0, limitations: Object.freeze([...limitations]), retainedBytes: 0, durationMs: Math.max(0, Date.now() - startedAt), resumeToken: Object.freeze({ stage: "SOURCE_FINALIZATION", status }), failureClassification: status === "BLOCKED_PRECONDITION" ? "BINDING_INCOMPLETE" as const : "READY" as const }
  return Object.freeze({ ...basis, outputChecksum: canonicalChecksum(basis) })
}

export function createBoundedLiveSlotExecutor(adapter: BoundedLiveSlotAdapter): (input: LiveExecutorInvocation) => Promise<LiveExecutorPortResult> {
  return async (input) => {
    const startedAt = Date.now()
    validateInvocation(input, adapter)
    const resume = await adapter.reconcileResume?.(input) ?? null
    const source = resume?.source ?? await adapter.inspectFinalization(input)
    if (source.status !== "AVAILABLE") return terminal(input, source.status === "SOURCE_NOT_FINALIZED" ? "SOURCE_NOT_FINALIZED" : "INELIGIBLE", source.limitations, startedAt)
    if (!source.bytes?.byteLength || !source.retrievalIdentity || !source.sourceChecksum || !source.contentType) return terminal(input, "BLOCKED_PRECONDITION", ["SOURCE_RESULT_INCOMPLETE"], startedAt)
    checksum64(source.sourceChecksum, "LIVE_EXECUTOR_SOURCE_CHECKSUM_INVALID")
    const artifact = resume?.artifact ?? await adapter.persistArtifact(input, source)
    checksum64(artifact.artifactChecksum, "LIVE_EXECUTOR_ARTIFACT_CHECKSUM_INVALID")
    if (artifact.artifactChecksum !== source.sourceChecksum) return terminal(input, "CONFLICT", ["RAW_ARTIFACT_CHECKSUM_MISMATCH"], startedAt)
    const candidate = resume?.candidate ?? await adapter.normalizeAndPersistCandidates(input, source, artifact)
    checksum64(candidate.candidateChecksum, "LIVE_EXECUTOR_CANDIDATE_CHECKSUM_INVALID")
    if (candidate.status === "CONFLICT") return terminal(input, "CONFLICT", ["CANDIDATE_IMMUTABLE_CONFLICT"], startedAt)
    const commit = await adapter.commit(input, candidate)
    if (commit.status === "CONFLICT" || commit.conflictCount) return terminal(input, "CONFLICT", ["CANONICAL_IMMUTABLE_CONFLICT"], startedAt)
    if (!commit.outputs.length || commit.outputs.some((value) => !value.identity || !/^[0-9a-f]{64}$/.test(value.checksum))) return terminal(input, "BLOCKED_PRECONDITION", ["CANONICAL_ATTRIBUTION_INCOMPLETE"], startedAt)
    const status = commit.createdCount > 0 ? "CREATED" as const : "DUPLICATE" as const
    const preValidationBasis = { status, logicalSlotId: input.logicalSlotId, executionGenerationId: input.executionGenerationId, dataset: input.dataset, instrument: input.instrument, intervalStart: input.intervalStart, intervalEnd: input.intervalEnd, unitId: input.unitId, sourceContractId: input.sourceContractId, sourceContractVersion: input.sourceContractVersion, providerBinding: input.providerBinding, retrievalIdentity: source.retrievalIdentity, rawArtifactIdentity: artifact.artifactIdentity, rawArtifactChecksum: artifact.artifactChecksum, candidateIdentity: candidate.candidateIdentity, candidateChecksum: candidate.candidateChecksum, canonicalOutputIdentities: Object.freeze([...commit.outputs]), createdCount: commit.createdCount, duplicateCount: commit.duplicateCount, conflictCount: 0, limitations: Object.freeze([]), retainedBytes: artifact.retainedBytes, durationMs: Math.max(0, Date.now() - startedAt), resumeToken: Object.freeze({ stage: "VALIDATED", logicalSlotId: input.logicalSlotId, outputChecksum: canonicalChecksum(commit.outputs) }), failureClassification: "READY" as const }
    const preValidationResult = Object.freeze({ ...preValidationBasis, outputChecksum: canonicalChecksum(preValidationBasis) })
    await verifyLiveExecutorResultBeforeFinalize(input, preValidationResult, (classification) => adapter.recordIdentityMismatch?.(input, classification) ?? Promise.resolve())
    const limitations = await adapter.validate(input, source, artifact, candidate, commit)
    const basis = { ...preValidationBasis, limitations: Object.freeze([...limitations]) }
    return Object.freeze({ ...basis, outputChecksum: canonicalChecksum(basis) })
  }
}

export function assertLiveExecutorResultIdentity(input: LiveExecutorInvocation, result: LiveExecutorPortResult): void {
  if (result.logicalSlotId !== input.logicalSlotId || result.dataset !== input.dataset || result.instrument !== input.instrument || result.intervalStart !== input.intervalStart || result.intervalEnd !== input.intervalEnd || result.sourceContractId !== input.sourceContractId || result.sourceContractVersion !== input.sourceContractVersion || result.providerBinding !== input.providerBinding || result.executionGenerationId !== input.executionGenerationId) throw new Error("LIVE_RESUME_SLOT_RESULT_IDENTITY_MISMATCH")
}

export async function verifyLiveExecutorResultBeforeFinalize(input: LiveExecutorInvocation, result: LiveExecutorPortResult, recordFailure: (classification: "LIVE_RESUME_SLOT_RESULT_IDENTITY_MISMATCH") => Promise<void>): Promise<void> {
  try { assertLiveExecutorResultIdentity(input, result) } catch (error) {
    await recordFailure("LIVE_RESUME_SLOT_RESULT_IDENTITY_MISMATCH")
    throw error
  }
}

export function createLiveExecutorPortSet(adapters: Readonly<Record<RefreshLogicalDataset, BoundedLiveSlotAdapter>>): LiveExecutorPortSet {
  const ohlcv = createBoundedLiveSlotExecutor(adapters.ohlcv), oi = createBoundedLiveSlotExecutor(adapters["open-interest"]), funding = createBoundedLiveSlotExecutor(adapters.funding), agg = createBoundedLiveSlotExecutor(adapters["agg-trade"])
  return Object.freeze({ executeBoundedOhlcvSlot: ohlcv, executeBoundedOpenInterestSlot: oi, executeBoundedFundingSlot: funding, executeBoundedAggTradesSlot: agg })
}

export interface LiveWatermarkAuditPort {
  append(input: { readonly scope: "DATASET" | "COMMON"; readonly dataset: RefreshLogicalDataset | null; readonly through: string; readonly inputIdentities: readonly string[]; readonly inputChecksum: string }): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly identity: string; readonly checksum: string }>
}

export function createLiveWatermarkPorts(audit: LiveWatermarkAuditPort): LiveResumeCoordinatorPorts["watermarks"] {
  const persistDataset = async (dataset: RefreshLogicalDataset, through: string, slots: readonly LiveResumeSlotResult[]): Promise<LiveResumeStageOutput> => {
    const unique = new Map(slots.map((value) => [value.instrument, value]))
    if (slots.length !== 6 || unique.size !== 6 || LIVE_EXECUTOR_ALLOWED_INSTRUMENTS.some((instrument) => !unique.has(instrument)) || slots.some((value) => value.dataset !== dataset || !["CREATED", "DUPLICATE"].includes(value.canonicalCommitResult) || value.validationStatus !== "PASSED" || !value.canonicalFactIdentities.length)) throw new Error("LIVE_EXECUTOR_DATASET_WATERMARK_INCOMPLETE")
    const identities = Object.freeze([...slots].sort((left, right) => left.instrument.localeCompare(right.instrument)).flatMap((value) => value.canonicalFactIdentities.map((fact) => fact.identity)))
    const inputChecksum = canonicalChecksum({ dataset, through, slots: slots.map((value) => ({ logicalSlotId: value.logicalSlotId, checksum: value.candidateChecksum, facts: value.canonicalFactIdentities })) })
    const result = await audit.append({ scope: "DATASET", dataset, through, inputIdentities: identities, inputChecksum })
    return Object.freeze({ identities: Object.freeze([result.identity]), checksum: result.checksum, details: Object.freeze({ dataset, through, logicalSlots: 6, status: result.status }) })
  }
  const persistCommon = async (through: string, datasets: readonly LiveResumeStageOutput[]): Promise<LiveResumeStageOutput> => {
    if (datasets.length !== 4 || datasets.some((value) => !value.identities.length)) throw new Error("LIVE_EXECUTOR_COMMON_WATERMARK_INCOMPLETE")
    const identities = Object.freeze(datasets.flatMap((value) => value.identities).sort())
    const inputChecksum = canonicalChecksum({ through, datasetChecksums: datasets.map((value) => value.checksum).sort() })
    const result = await audit.append({ scope: "COMMON", dataset: null, through, inputIdentities: identities, inputChecksum })
    return Object.freeze({ identities: Object.freeze([result.identity]), checksum: result.checksum, details: Object.freeze({ through, mandatoryDatasets: 4, status: result.status }) })
  }
  return Object.freeze({ persistDataset, persistCommon })
}

export type LiveDownstreamStage = "coverage" | "consistency" | "evidence" | "projections" | "replay"
export interface LiveDownstreamExecutor {
  execute(input: { readonly stage: LiveDownstreamStage; readonly intervalStart: string; readonly intervalEnd: string; readonly slots: readonly LiveResumeSlotResult[]; readonly upstream: readonly { readonly identity: string; readonly checksum: string }[] }): Promise<LiveResumeStageOutput>
}

function priorOutputs(prior: readonly LiveResumeStageCheckpoint[]): readonly { readonly identity: string; readonly checksum: string }[] {
  return Object.freeze(prior.flatMap((checkpoint) => checkpoint.output.identities.map((identity) => Object.freeze({ identity, checksum: checkpoint.output.checksum }))))
}

export function createLiveDownstreamPorts(executor: LiveDownstreamExecutor): LiveResumeCoordinatorPorts["downstream"] {
  const stage = (name: LiveDownstreamStage) => async (input: { readonly intervalStart: string; readonly intervalEnd: string; readonly slots: readonly LiveResumeSlotResult[]; readonly prior: readonly LiveResumeStageCheckpoint[] }) => {
    exactDay(input.intervalStart, input.intervalEnd)
    if (input.slots.length !== 24) throw new Error("LIVE_EXECUTOR_DOWNSTREAM_SLOT_GRAPH_INCOMPLETE")
    const upstream = priorOutputs(input.prior)
    if (!upstream.length) throw new Error("LIVE_EXECUTOR_DOWNSTREAM_UPSTREAM_MISSING")
    const output = await executor.execute({ stage: name, intervalStart: input.intervalStart, intervalEnd: input.intervalEnd, slots: input.slots, upstream })
    checksum64(output.checksum, "LIVE_EXECUTOR_DOWNSTREAM_CHECKSUM_INVALID")
    if (!output.identities.length) throw new Error("LIVE_EXECUTOR_DOWNSTREAM_OUTPUT_MISSING")
    return output
  }
  return Object.freeze({ coverage: stage("coverage"), consistency: stage("consistency"), evidence: stage("evidence"), projections: stage("projections"), replay: stage("replay") })
}

export interface LiveCandidateExecutor {
  assemble(input: { readonly intervalStart: string; readonly intervalEnd: string; readonly slots: readonly LiveResumeSlotResult[]; readonly upstream: readonly { readonly identity: string; readonly checksum: string }[] }): Promise<LiveResumeStageOutput>
  persistManifest(input: { readonly intervalStart: string; readonly intervalEnd: string; readonly upstream: readonly { readonly identity: string; readonly checksum: string }[] }): Promise<LiveResumeStageOutput>
  compare(input: { readonly intervalStart: string; readonly intervalEnd: string; readonly upstream: readonly { readonly identity: string; readonly checksum: string }[] }): Promise<LiveResumeStageOutput>
}

export function createLiveCandidatePorts(executor: LiveCandidateExecutor): LiveResumeCoordinatorPorts["candidate"] {
  return Object.freeze({
    assemble: (input) => executor.assemble({ ...input, upstream: priorOutputs(input.prior) }),
    persistManifest: (input) => executor.persistManifest({ ...input, upstream: priorOutputs(input.prior) }),
    compare: (input) => executor.compare({ ...input, upstream: priorOutputs(input.prior) }),
  })
}

export interface ConcreteLiveResumePortComposition extends Omit<LiveResumeCoordinatorPorts, "executors" | "watermarks" | "downstream" | "candidate"> {
  readonly executorPorts: LiveExecutorPortSet
  readonly watermarkAudit: LiveWatermarkAuditPort
  readonly downstreamExecutor: LiveDownstreamExecutor
  readonly candidateExecutor: LiveCandidateExecutor
  readonly plannerIdentity: string
  readonly plannerChecksum: string
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly allowedDatasets: readonly RefreshLogicalDataset[]
  readonly allowedInstruments: readonly RefreshLogicalInstrument[]
}

function coordinatorSlotResult(result: LiveExecutorPortResult): LiveResumeSlotResult {
  if (result.status !== "CREATED" && result.status !== "DUPLICATE") throw new Error(`LIVE_EXECUTOR_SLOT_${result.status}`)
  if (!result.retrievalIdentity || !result.rawArtifactIdentity || !result.rawArtifactChecksum || !result.candidateIdentity || !result.candidateChecksum) throw new Error("LIVE_EXECUTOR_SLOT_LINEAGE_INCOMPLETE")
  return Object.freeze({ logicalSlotId: result.logicalSlotId, executionGenerationId: result.executionGenerationId, dataset: result.dataset, instrument: result.instrument, intervalStart: result.intervalStart, intervalEnd: result.intervalEnd, unitId: result.unitId, sourceContractId: result.sourceContractId, sourceContractVersion: result.sourceContractVersion, providerBinding: result.providerBinding, retrievalIdentity: result.retrievalIdentity, rawArtifactIdentity: result.rawArtifactIdentity, rawArtifactChecksum: result.rawArtifactChecksum, candidateIdentity: result.candidateIdentity, candidateChecksum: result.candidateChecksum, canonicalCommitResult: result.status, canonicalFactIdentities: result.canonicalOutputIdentities, validationStatus: "PASSED", limitations: result.limitations, durationMs: result.durationMs, retainedBytes: result.retainedBytes })
}

export function composeConcreteLiveResumePorts(input: ConcreteLiveResumePortComposition): LiveResumeCoordinatorPorts {
  exactDay(input.intervalStart, input.intervalEnd); checksum64(input.plannerChecksum, "LIVE_EXECUTOR_PLANNER_CHECKSUM_INVALID")
  const execute = (dataset: RefreshLogicalDataset, port: (value: LiveExecutorInvocation) => Promise<LiveExecutorPortResult>) => ({ execute: async (slot: RefreshSlotResumePlanEntry, unit: LiveResumeUnitResolution, context: { readonly runId: string; readonly mode: LiveResumeExecutionMode; readonly fencingToken: number }) => {
    if (!unit.unitId || context.mode === "DRY_RUN") throw new Error("LIVE_EXECUTOR_LIVE_UNIT_REQUIRED")
    if (slot.dataset !== dataset || unit.logicalSlotId !== slot.logicalSlotId || unit.dataset !== slot.dataset || unit.instrument !== slot.instrument || slot.intervalStart !== input.intervalStart || slot.intervalEnd !== input.intervalEnd) throw new Error("LIVE_EXECUTOR_PREWRITE_LOGICAL_SLOT_MISMATCH")
    const invocation: LiveExecutorInvocation = Object.freeze({ intervalStart: input.intervalStart, intervalEnd: input.intervalEnd, logicalSlotId: slot.logicalSlotId, executionGenerationId: context.runId, plannerIdentity: input.plannerIdentity, plannerChecksum: input.plannerChecksum, sourceContractId: unit.sourceContractId, sourceContractVersion: unit.sourceContractId, providerBinding: LIVE_EXECUTOR_PROVIDER_BY_DATASET[dataset], unitId: unit.unitId, dataset, instrument: slot.instrument, fencingToken: context.fencingToken, checkpointInputChecksum: canonicalChecksum({ runId: context.runId, unit, slot }), allowedDatasets: input.allowedDatasets, allowedInstruments: input.allowedInstruments, requiredUpstream: Object.freeze([]), mode: context.mode })
    const result = await port(invocation)
    assertLiveExecutorResultIdentity(invocation, result)
    return coordinatorSlotResult(result)
  } })
  return Object.freeze({
    targets: input.targets,
    execution: input.execution,
    lease: input.lease,
    checkpoints: input.checkpoints,
    authoritativeOhlcv: input.authoritativeOhlcv,
    executors: Object.freeze({ ohlcv: execute("ohlcv", input.executorPorts.executeBoundedOhlcvSlot), "open-interest": execute("open-interest", input.executorPorts.executeBoundedOpenInterestSlot), funding: execute("funding", input.executorPorts.executeBoundedFundingSlot), "agg-trade": execute("agg-trade", input.executorPorts.executeBoundedAggTradesSlot) }),
    watermarks: createLiveWatermarkPorts(input.watermarkAudit),
    downstream: createLiveDownstreamPorts(input.downstreamExecutor),
    candidate: createLiveCandidatePorts(input.candidateExecutor),
  })
}
