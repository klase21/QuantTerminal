import { canonicalChecksum } from "@/lib/data-platform/contracts"
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
