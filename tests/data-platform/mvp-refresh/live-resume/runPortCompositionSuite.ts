import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  MvpLiveResumeCoordinator,
  LIVE_EXECUTOR_PORT_NAMES,
  composeConcreteLiveResumePorts,
  createCertifiedLiveResumePlan,
  createLiveExecutorPortSet,
  createMandatoryRefreshLogicalSlots,
  liveResumeStageOutput,
  type BoundedLiveSlotAdapter,
  type LiveCandidateExecutor,
  type LiveDownstreamExecutor,
  type LiveExecutorInvocation,
  type LiveResumeCoordinatorPorts,
  type LiveResumeSlotResult,
  type LiveResumeStageCheckpoint,
  type LiveWatermarkAuditPort,
} from "@/lib/data-platform/mvp-refresh"

const start = "2026-07-15T00:00:00.000Z", end = "2026-07-16T00:00:00.000Z"
const instruments = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const
const datasets = ["ohlcv", "open-interest", "funding", "agg-trade"] as const
const contracts = { ohlcv: "mvp-bounded-ohlcv/1.0.0", "open-interest": "mvp-bounded-open-interest/1.0.0", funding: "binance-official-rest-funding-rate/1.0.0", "agg-trade": "mvp-bounded-agg-trade/1.0.0" } as const

function plan() {
  return createCertifiedLiveResumePlan({ intervalStart: start, intervalEnd: end, slots: createMandatoryRefreshLogicalSlots(start, end).map((slot) => Object.freeze({ ...slot, action: slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT" ? "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT" as const : "CREATE_NEW_ON_LIVE_RESUME" as const, authoritativeUnitId: slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT" ? "authority" : null, reason: "CERTIFIED", checkpointStartStage: slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT" ? "VALIDATED" as const : "PENDING" as const, blockers: Object.freeze([]), sourceFinalizationState: "SOURCE_AVAILABLE" as const, ignoredAttemptIds: Object.freeze([]) })) })
}

function adapter(dataset: typeof datasets[number], calls: string[], fail: { dataset: string | null; stage?: string | null }): BoundedLiveSlotAdapter {
  const supported = dataset === "ohlcv" ? instruments.filter((value) => value !== "BTCUSDT") : instruments
  return Object.freeze({
    dataset, sourceContractId: contracts[dataset], supportedInstruments: supported,
    inspectFinalization: async (input: LiveExecutorInvocation) => {
      calls.push(`${dataset}:${input.instrument}`)
      if (fail.dataset === dataset || fail.stage === "retrieval") throw new Error("INJECTED_DATASET_FAILURE")
      const bytes = new TextEncoder().encode(`${dataset}:${input.instrument}:${input.intervalStart}`), sourceChecksum = canonicalChecksum(Array.from(bytes))
      return Object.freeze({ status: "AVAILABLE" as const, retrievalIdentity: `retrieval:${input.logicalSlotId}`, bytes, sourceChecksum, contentType: "application/octet-stream", observedThrough: input.intervalEnd, limitations: Object.freeze([]) })
    },
    persistArtifact: async (input, source) => { if (fail.stage === "artifact") throw new Error("INJECTED_ARTIFACT_FAILURE"); return Object.freeze({ artifactIdentity: `artifact:${input.logicalSlotId}`, artifactChecksum: source.sourceChecksum!, retainedBytes: source.bytes!.byteLength, status: "CREATED" as const }) },
    normalizeAndPersistCandidates: async (input, _source, artifact) => { if (fail.stage === "candidate") throw new Error("INJECTED_CANDIDATE_FAILURE"); return Object.freeze({ candidateIdentity: `candidate:${input.logicalSlotId}`, candidateChecksum: canonicalChecksum({ slot: input.logicalSlotId, artifact: artifact.artifactChecksum }), status: "CREATED" as const, payload: Object.freeze({ slot: input.logicalSlotId }) }) },
    commit: async (input, candidate) => {
      if (fail.stage === "commit") throw new Error("INJECTED_COMMIT_FAILURE")
      const count = dataset === "ohlcv" || dataset === "open-interest" ? 288 : dataset === "funding" ? 3 : 1
      return Object.freeze({ status: "CREATED" as const, outputs: Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({ identity: `${dataset}:${input.instrument}:${index}`, checksum: canonicalChecksum({ candidate: candidate.candidateChecksum, index }) }))), createdCount: count, duplicateCount: 0, conflictCount: 0 })
    },
    validate: async () => Object.freeze([]),
  })
}

function authority(slot: ReturnType<typeof plan>["slots"][number]): LiveResumeSlotResult {
  const hash = (kind: string) => canonicalChecksum({ kind, slot: slot.logicalSlotId })
  return Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, unitId: null, sourceContractId: contracts.ohlcv, retrievalIdentity: `retrieval:${hash("retrieval")}`, rawArtifactIdentity: `artifact:${hash("artifact")}`, rawArtifactChecksum: hash("raw"), candidateIdentity: `candidate:${hash("candidate")}`, candidateChecksum: hash("candidate-checksum"), canonicalCommitResult: "DUPLICATE", canonicalFactIdentities: Object.freeze(Array.from({ length: 288 }, (_, index) => Object.freeze({ identity: `ohlcv:BTCUSDT:${index}`, checksum: canonicalChecksum({ slot: slot.logicalSlotId, index }) }))), validationStatus: "PASSED", limitations: Object.freeze([]), durationMs: 0, retainedBytes: 0 })
}

function fixture(failDataset: string | null = null) {
  const calls: string[] = [], downstream: string[] = [], checkpoints = new Map<string, LiveResumeStageCheckpoint>(), fail = { dataset: failDataset }, certified = plan()
  const executorPorts = createLiveExecutorPortSet({ ohlcv: adapter("ohlcv", calls, fail), "open-interest": adapter("open-interest", calls, fail), funding: adapter("funding", calls, fail), "agg-trade": adapter("agg-trade", calls, fail) })
  const watermarkAudit: LiveWatermarkAuditPort = { append: async (input) => { const checksum = canonicalChecksum(input); return Object.freeze({ status: "CREATED" as const, identity: `watermark:${input.scope}:${input.dataset ?? "mandatory"}`, checksum }) } }
  const downstreamExecutor: LiveDownstreamExecutor = { execute: async (input) => { downstream.push(input.stage); assert.equal(input.upstream.length > 0, true); return liveResumeStageOutput({ stage: input.stage, upstream: input.upstream }, [`${input.stage}:${canonicalChecksum(input.upstream)}`]) } }
  let assembled = false, exposed = false
  const candidateExecutor: LiveCandidateExecutor = {
    assemble: async (input) => { assembled = true; assert.equal(input.slots.length, 24); return liveResumeStageOutput({ lifecycle: "WITHHELD", exposure: "INTERNAL_ONLY" }, ["candidate:fixture"]) },
    persistManifest: async (input) => { assert.equal(assembled, true); return liveResumeStageOutput({ channel: "candidate", upstream: input.upstream.length }, ["manifest:fixture"]) },
    compare: async () => liveResumeStageOutput({ unexpectedDeletions: 0, exposed }, ["comparison:fixture"]),
  }
  let fence = 1
  const base: Omit<LiveResumeCoordinatorPorts, "executors" | "watermarks" | "downstream" | "candidate"> = {
    targets: { classify: async () => ({ refreshLocal: true, truthPlaneLocal: true, servingLocal: true, objectStorageLocal: true, servingPublisher: true, managedOrProductionTarget: false }) },
    lease: { acquire: async () => ({ fencingToken: fence }), assert: async (_runId, token) => { if (token !== fence) throw new Error("STALE_WORKER") }, release: async () => undefined },
    checkpoints: { read: async (runId, stage) => checkpoints.get(`${runId}:${stage}`) ?? null, append: async (value) => { const key = `${value.coordinatorRunId}:${value.stage}`, prior = checkpoints.get(key); if (prior && prior.checksum !== value.checksum) throw new Error("CHECKPOINT_CONFLICT"); if (prior) return "DUPLICATE"; checkpoints.set(key, value); return "CREATED" }, appendFailure: async (value) => { checkpoints.set(`${value.coordinatorRunId}:failure:${value.stage}:${value.checksum}`, value); return "CREATED" } },
    units: { resolve: async (slot, input) => Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, action: "CREATED_UNIT" as const, unitId: `unit:${canonicalChecksum({ run: input.runId, slot: slot.logicalSlotId })}`, sourceContractId: contracts[slot.dataset], checkpointStartStage: "PENDING" as const, fencingToken: input.fencingToken, reason: "MISSING" }) },
    authoritativeOhlcv: { reuse: async (slot) => authority(slot) },
  }
  const ports = composeConcreteLiveResumePorts({ ...base, executorPorts, watermarkAudit, downstreamExecutor, candidateExecutor, plannerIdentity: certified.planIdentity, plannerChecksum: certified.planChecksum, intervalStart: start, intervalEnd: end, allowedDatasets: datasets, allowedInstruments: instruments })
  return { ports, certified, calls, downstream, checkpoints, exposed: () => exposed, stale: () => { fence += 1 } }
}

async function main() {
  assert.equal(LIVE_EXECUTOR_PORT_NAMES.length, 14)
  assert.equal(new Set(LIVE_EXECUTOR_PORT_NAMES).size, 14)
  const value = fixture(), coordinator = new MvpLiveResumeCoordinator(value.ports)
  const complete = await coordinator.execute({ plan: value.certified, allowedDatasets: datasets, allowedInstruments: instruments, mode: "CERTIFICATION", maxConcurrency: 2 })
  assert.equal(complete.status, "COMPLETE")
  assert.equal(value.calls.length, 23)
  assert.equal(value.calls.includes("ohlcv:BTCUSDT"), false)
  assert.deepEqual(value.downstream, ["coverage", "consistency", "evidence", "projections", "replay"])
  assert.equal(complete.commonWatermark, end)
  assert.equal(complete.candidateExposed, false)
  assert.equal(value.exposed(), false)
  const rerun = await coordinator.execute({ plan: value.certified, allowedDatasets: datasets, allowedInstruments: instruments, mode: "CERTIFICATION" })
  assert.equal(rerun.status, "COMPLETE")
  assert.equal(value.calls.length, 23)

  const failed = fixture("funding")
  await assert.rejects(() => new MvpLiveResumeCoordinator(failed.ports).execute({ plan: failed.certified, allowedDatasets: datasets, allowedInstruments: instruments, mode: "CERTIFICATION" }), /INJECTED_DATASET_FAILURE/)
  assert.equal([...failed.checkpoints.values()].some((value) => value.stage === "COMMON_WATERMARK_VALIDATED"), false)
  assert.equal(failed.downstream.length, 0)

  const direct = createLiveExecutorPortSet({ ohlcv: adapter("ohlcv", [], { dataset: null }), "open-interest": adapter("open-interest", [], { dataset: null }), funding: adapter("funding", [], { dataset: null }), "agg-trade": adapter("agg-trade", [], { dataset: null }) })
  await assert.rejects(() => direct.executeBoundedOhlcvSlot({ intervalStart: start, intervalEnd: end, logicalSlotId: "slot", plannerIdentity: "plan", plannerChecksum: "a".repeat(64), sourceContractId: contracts.ohlcv, unitId: "unit", dataset: "ohlcv", instrument: "BTCUSDT", fencingToken: 1, checkpointInputChecksum: "b".repeat(64), allowedDatasets: datasets, allowedInstruments: instruments, requiredUpstream: [], mode: "CERTIFICATION" }), /REUSE_ONLY/)
  for (const stage of ["retrieval", "artifact", "candidate", "commit"] as const) {
    const failing = createLiveExecutorPortSet({ ohlcv: adapter("ohlcv", [], { dataset: null, stage }), "open-interest": adapter("open-interest", [], { dataset: null }), funding: adapter("funding", [], { dataset: null }), "agg-trade": adapter("agg-trade", [], { dataset: null }) })
    await assert.rejects(() => failing.executeBoundedOhlcvSlot({ intervalStart: start, intervalEnd: end, logicalSlotId: "slot", plannerIdentity: "plan", plannerChecksum: "a".repeat(64), sourceContractId: contracts.ohlcv, unitId: "unit", dataset: "ohlcv", instrument: "ETHUSDT", fencingToken: 1, checkpointInputChecksum: "b".repeat(64), allowedDatasets: datasets, allowedInstruments: instruments, requiredUpstream: [], mode: "CERTIFICATION" }), /INJECTED/)
  }
  console.log(JSON.stringify({ status: "PASS", executorCalls: value.calls.length, btcusdtOhlcvAcquisitions: 0, downstreamStages: value.downstream.length, candidateExposed: false, exactRerun: "PASS" }))
}

void main().catch((error) => { console.error(error); process.exitCode = 1 })
