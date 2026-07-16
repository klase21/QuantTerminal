import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { persistBoundedMvpProjections, type ConsistencyPostgresRuntime, type MvpProjectionStore } from "@/lib/data-platform/consistency-evidence/postgres"
import { persistMvpConsistencyWindow, persistMvpEvidenceWindow, type BoundedPersistenceContract, type MvpEvidenceCorpusReference, type MvpEvidenceWindowData } from "@/lib/data-platform/consistency"
import type { MvpProjectionEvidenceInput, MvpProjectionKind } from "@/lib/data-platform/evidence-platform"
import type { ReplaySequenceModel } from "@/lib/replay-sequence"
import type { MvpRefreshStore } from "./store"
import { inspectMvpServingIsolatedTarget } from "@/lib/data-platform/mvp-serving/safety"
import type { BoundedArchiveDataset } from "./boundedAdapters"

export type BoundedPipelineStage = "CONSISTENCY" | "EVIDENCE" | "PROJECTION" | "REPLAY"
export interface BoundedCommittedInput { readonly dataset: BoundedArchiveDataset | "funding"; readonly instrument: string; readonly eventTimeStart: string; readonly eventTimeEnd: string; readonly commitChecksum: string; readonly validationState: "PASSED" }
export interface BoundedStageResult { readonly stage: BoundedPipelineStage; readonly windowIdentity: string; readonly outputIdentities: readonly string[]; readonly checksum: string; readonly status: "CREATED" | "DUPLICATE" | "INELIGIBLE" }

function exactWindow(inputs: readonly BoundedCommittedInput[]): { readonly start: string; readonly end: string; readonly identity: string } {
  if (!inputs.length) throw new Error("BOUNDED_AFFECTED_INPUTS_REQUIRED")
  const start = inputs[0].eventTimeStart, end = inputs[0].eventTimeEnd
  if (inputs.some((item) => item.eventTimeStart !== start || item.eventTimeEnd !== end || item.validationState !== "PASSED")) throw new Error("BOUNDED_AFFECTED_WINDOW_MISMATCH")
  return Object.freeze({ start, end, identity: `mbw_${canonicalChecksum({ start, end, inputs: inputs.map((item) => [item.dataset, item.instrument, item.commitChecksum]).sort() })}` })
}

export async function runBoundedAffectedStage(input: { readonly stage: BoundedPipelineStage; readonly committedInputs: readonly BoundedCommittedInput[]; readonly execute: (window: { readonly start: string; readonly end: string; readonly inputChecksums: readonly string[] }) => Promise<readonly string[]> }): Promise<BoundedStageResult> {
  const window = exactWindow(input.committedInputs)
  const outputIdentities = Object.freeze([...(await input.execute({ start: window.start, end: window.end, inputChecksums: input.committedInputs.map((item) => item.commitChecksum) }))])
  const basis = { stage: input.stage, windowIdentity: window.identity, outputIdentities }
  return Object.freeze({ ...basis, checksum: canonicalChecksum(basis), status: outputIdentities.length ? "CREATED" : "INELIGIBLE" })
}

export const runBoundedConsistency = (committedInputs: readonly BoundedCommittedInput[], execute: Parameters<typeof runBoundedAffectedStage>[0]["execute"]) => runBoundedAffectedStage({ stage: "CONSISTENCY", committedInputs, execute })
export const runBoundedEvidence = (committedInputs: readonly BoundedCommittedInput[], execute: Parameters<typeof runBoundedAffectedStage>[0]["execute"]) => runBoundedAffectedStage({ stage: "EVIDENCE", committedInputs, execute })
export const runBoundedProjections = (committedInputs: readonly BoundedCommittedInput[], execute: Parameters<typeof runBoundedAffectedStage>[0]["execute"]) => runBoundedAffectedStage({ stage: "PROJECTION", committedInputs, execute })
export const runBoundedReplayMaterialization = (committedInputs: readonly BoundedCommittedInput[], execute: Parameters<typeof runBoundedAffectedStage>[0]["execute"]) => runBoundedAffectedStage({ stage: "REPLAY", committedInputs, execute })

export async function executeBoundedConsistency(input: { readonly corpus: MvpEvidenceCorpusReference; readonly data: MvpEvidenceWindowData; readonly worker: ConsistencyPostgresRuntime; readonly contract: BoundedPersistenceContract }) {
  return persistMvpConsistencyWindow(input)
}

export async function executeBoundedEvidence(input: { readonly corpus: MvpEvidenceCorpusReference; readonly data: MvpEvidenceWindowData; readonly worker: ConsistencyPostgresRuntime; readonly assembler: ConsistencyPostgresRuntime; readonly contract: BoundedPersistenceContract }) {
  return persistMvpEvidenceWindow(input)
}

export async function executeBoundedProjections(input: { readonly evidence: MvpProjectionEvidenceInput; readonly store: MvpProjectionStore; readonly request: { readonly instrument: string; readonly eventTimeStart: string; readonly eventTimeEnd: string; readonly evidenceIdentity: string; readonly evidenceChecksum: string; readonly requestedProjectionKinds: readonly MvpProjectionKind[]; readonly modelVersion: string; readonly modelChecksum: string; readonly schemaVersion: string } }) {
  return persistBoundedMvpProjections(input)
}

export interface BoundedReplayHandoff {
  readonly instrument: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly price: { readonly identity: string; readonly checksum: string; readonly sampleCount: number }
  readonly openInterest: { readonly identity: string; readonly checksum: string; readonly sampleCount: number }
  readonly funding: { readonly identity: string; readonly checksum: string; readonly eventCount: number }
  readonly aggressiveFlow: { readonly identity: string; readonly checksum: string; readonly bucketCount: number }
  readonly evidence: { readonly identity: string; readonly checksum: string }
  readonly sourceProjection: { readonly identity: string; readonly checksum: string }
}

export async function executeBoundedReplayHandoff(input: BoundedReplayHandoff, materialize: (handoff: BoundedReplayHandoff) => Promise<ReplaySequenceModel>) {
  const identities = [input.price, input.openInterest, input.funding, input.aggressiveFlow, input.evidence, input.sourceProjection]
  if (!input.instrument || Date.parse(input.eventTimeEnd) - Date.parse(input.eventTimeStart) !== 86_400_000 || identities.some((value) => !value.identity || !/^[0-9a-f]{64}$/.test(value.checksum))) return Object.freeze({ status: "INELIGIBLE" as const, model: null, checksum: canonicalChecksum({ input, reason: "REPLAY_HANDOFF_INCOMPLETE" }) })
  if (input.price.sampleCount !== 288 || input.openInterest.sampleCount !== 288 || input.aggressiveFlow.bucketCount !== 48 || input.funding.eventCount < 1) return Object.freeze({ status: "INELIGIBLE" as const, model: null, checksum: canonicalChecksum({ input, reason: "REPLAY_HANDOFF_SAMPLE_CONTRACT" }) })
  const model = await materialize(input)
  if (model.instrument !== input.instrument || model.eventTimeStart !== input.eventTimeStart || model.eventTimeEnd !== input.eventTimeEnd || model.sourceProjectionVersionId !== input.sourceProjection.identity || model.sourceProjectionChecksum !== input.sourceProjection.checksum || model.sampleCounts.price !== 288 || model.sampleCounts.openInterest !== 288 || model.sampleCounts.flow !== 48) throw new Error("BOUNDED_REPLAY_MATERIALIZATION_CONFLICT")
  return Object.freeze({ status: "CREATED" as const, model, checksum: canonicalChecksum({ input, modelChecksum: model.modelChecksum }) })
}

export type BoundedCandidateStage = "CANONICAL_COMMIT" | "COVERAGE" | "CONSISTENCY" | "EVIDENCE" | "PROJECTION" | "REPLAY" | "CANDIDATE" | "MANIFEST" | "COMPARISON"
export interface BoundedCandidateCheckpoint { readonly stage: BoundedCandidateStage; readonly state: "COMPLETE"; readonly outputIdentities: readonly string[]; readonly checksum: string }
export interface BoundedCandidateCheckpointPort {
  read(stage: BoundedCandidateStage): Promise<BoundedCandidateCheckpoint | null>
  write(checkpoint: BoundedCandidateCheckpoint): Promise<"CREATED" | "DUPLICATE">
}

export class RefreshUnitCandidateCheckpointPort implements BoundedCandidateCheckpointPort {
  constructor(private readonly store: MvpRefreshStore, private readonly lease: { readonly unitId: string; readonly leaseKey: string; readonly ownerId: string; readonly fencingToken: number }) {}
  async read(stage: BoundedCandidateStage): Promise<BoundedCandidateCheckpoint | null> { return await this.store.readStageCheckpoint(this.lease.unitId, stage) as unknown as BoundedCandidateCheckpoint | null }
  async write(checkpoint: BoundedCandidateCheckpoint): Promise<"CREATED" | "DUPLICATE"> { return this.store.writeStageCheckpoint({ ...this.lease, stage: checkpoint.stage, checkpoint }) }
}
const candidateStages: readonly BoundedCandidateStage[] = Object.freeze(["CANONICAL_COMMIT", "COVERAGE", "CONSISTENCY", "EVIDENCE", "PROJECTION", "REPLAY", "CANDIDATE", "MANIFEST", "COMPARISON"])

export async function resumeBoundedCandidatePipeline(input: { readonly checkpointPort: BoundedCandidateCheckpointPort; readonly execute: Readonly<Record<BoundedCandidateStage, (prior: readonly BoundedCandidateCheckpoint[]) => Promise<readonly string[]>>> }) {
  const completed: BoundedCandidateCheckpoint[] = []
  for (const stage of candidateStages) {
    const stored = await input.checkpointPort.read(stage)
    if (stored) { completed.push(stored); continue }
    const outputIdentities = Object.freeze([...(await input.execute[stage](Object.freeze([...completed])))])
    if (!outputIdentities.length) return Object.freeze({ status: "INELIGIBLE" as const, blockedAt: stage, checkpoints: Object.freeze(completed) })
    const basis = { stage, state: "COMPLETE" as const, outputIdentities }
    const checkpoint = Object.freeze({ ...basis, checksum: canonicalChecksum(basis) })
    await input.checkpointPort.write(checkpoint)
    completed.push(checkpoint)
  }
  return Object.freeze({ status: "COMPLETE" as const, blockedAt: null, checkpoints: Object.freeze(completed) })
}

export interface InactiveCandidateCorpus {
  readonly corpusId: string
  readonly servingChecksum: string
  readonly lifecycle: "WITHHELD"
  readonly exposure: "INTERNAL_ONLY"
  readonly governedThrough: string
}

export interface InactiveCandidateServingPort {
  transaction<T>(work: (transaction: { readonly activeExposure: () => Promise<string | null>; readonly insertCorpusImmutable: (candidate: InactiveCandidateCorpus) => Promise<"INSERTED" | "DUPLICATE"> }) => Promise<T>): Promise<T>
}

export function inspectInactiveCandidateServingTarget(environment: Readonly<Record<string, string | undefined>> = process.env) {
  const inspected = inspectMvpServingIsolatedTarget(environment.MVP_SERVING_ISOLATED_POSTGRES_URL, environment)
  return Object.freeze({ configured: environment.MVP_SERVING_ISOLATED_POSTGRES_URL !== undefined, targetAllowed: inspected.safe, expectedDatabase: inspected.database === "quantterminal_mvp_serving_isolated", managedTarget: inspected.reasons.some((reason) => reason === "MVP7A_LOCAL_HOST_REQUIRED") })
}

export async function insertInactiveCandidateCorpus(port: InactiveCandidateServingPort, candidate: InactiveCandidateCorpus): Promise<{ readonly status: "INSERTED" | "DUPLICATE"; readonly exposureUnchanged: true }> {
  if (candidate.lifecycle !== "WITHHELD" || candidate.exposure !== "INTERNAL_ONLY" || !/^[0-9a-f]{64}$/.test(candidate.servingChecksum)) throw new Error("CANDIDATE_SERVING_CONTRACT_INVALID")
  return port.transaction(async (transaction) => {
    const before = await transaction.activeExposure()
    const status = await transaction.insertCorpusImmutable(candidate)
    const after = await transaction.activeExposure()
    if (after !== before) throw new Error("CANDIDATE_EXPOSURE_CHANGED")
    return Object.freeze({ status, exposureUnchanged: true as const })
  })
}
