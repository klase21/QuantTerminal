import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  LIVE_RESUME_STAGES,
  MvpLiveResumeCoordinator,
  assertSanitizedLiveResumeOutput,
  createCertifiedLiveResumePlan,
  createCleanCertifiedLiveResumePlan,
  createCleanExecutionGenerationContext,
  createDryRunLiveResumeExecutionSetup,
  createMandatoryRefreshLogicalSlots,
  liveResumeStageOutput,
  integratedMvpGovernanceDefinitions,
  parseLiveResumeWorkerOptions,
  verifyStageAwareLiveResumePlan,
  type LiveResumeCoordinatorPorts,
  type LiveResumeSlotResult,
  type LiveResumeStageCheckpoint,
} from "@/lib/data-platform/mvp-refresh"

const start = "2026-07-15T00:00:00.000Z", end = "2026-07-16T00:00:00.000Z"
const contracts = { ohlcv: "mvp-bounded-ohlcv/1.0.0", "open-interest": "mvp-bounded-open-interest/1.0.0", funding: "binance-official-rest-funding-rate/1.0.0", "agg-trade": "mvp-bounded-agg-trade/1.0.0" } as const
const providers = { ohlcv: "binance-vision", "open-interest": "binance-vision", funding: "binance-official-rest", "agg-trade": "binance-vision" } as const

function plan() {
  const slots = createMandatoryRefreshLogicalSlots(start, end).map((slot) => Object.freeze({
    logicalSlotId: slot.logicalSlotId,
    dataset: slot.dataset,
    instrument: slot.instrument,
    intervalStart: start,
    intervalEnd: end,
    action: slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT" ? "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT" as const : "CREATE_NEW_ON_LIVE_RESUME" as const,
    authoritativeUnitId: slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT" ? "authoritative-unit" : null,
    reason: "CERTIFIED",
    checkpointStartStage: slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT" ? "VALIDATED" as const : "PENDING" as const,
    blockers: Object.freeze([]),
    sourceFinalizationState: "SOURCE_AVAILABLE" as const,
    ignoredAttemptIds: Object.freeze([]),
  }))
  return createCertifiedLiveResumePlan({ intervalStart: start, intervalEnd: end, slots })
}

function slotResult(slot: ReturnType<typeof plan>["slots"][number], unitId: string | null): LiveResumeSlotResult {
  const hash = (kind: string) => canonicalChecksum({ kind, slot: slot.logicalSlotId })
  const count = slot.dataset === "funding" ? 3 : slot.dataset === "agg-trade" ? 1 : 288
  return Object.freeze({ logicalSlotId: slot.logicalSlotId, executionGenerationId: "fixture-generation", dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, unitId, sourceContractId: contracts[slot.dataset], sourceContractVersion: contracts[slot.dataset], providerBinding: providers[slot.dataset], retrievalIdentity: `retrieval:${hash("retrieval")}`, rawArtifactIdentity: `artifact:${hash("artifact")}`, rawArtifactChecksum: hash("raw"), candidateIdentity: `candidate:${hash("candidate")}`, candidateChecksum: hash("candidate-checksum"), canonicalCommitResult: "DUPLICATE", canonicalFactIdentities: Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({ identity: `fact:${slot.logicalSlotId}:${index}`, checksum: canonicalChecksum({ slot: slot.logicalSlotId, index }) }))), validationStatus: "PASSED", limitations: Object.freeze([]), durationMs: 1, retainedBytes: 1 })
}

function fixture() {
  const checkpoints = new Map<string, LiveResumeStageCheckpoint>(), createdUnits: string[] = [], executorCalls: string[] = [], downstreamCalls: string[] = []
  let fence = 1, candidateAssembled = false, candidateExposed = false
  const ports: LiveResumeCoordinatorPorts = {
    targets: { classify: async () => ({ refreshLocal: true, truthPlaneLocal: true, servingLocal: true, objectStorageLocal: true, servingPublisher: true, managedOrProductionTarget: false }) },
    execution: { resolveOrCreate: async ({ plan: value, mode }) => {
      const setup = createDryRunLiveResumeExecutionSetup(value)
      if (mode !== "DRY_RUN" && createdUnits.length === 0) createdUnits.push(...setup.unitOutcomes.map((unit) => unit.unitId!))
      return setup
    } },
    lease: { acquire: async () => ({ fencingToken: fence }), assert: async (_runId, token) => { if (token !== fence) throw new Error("STALE") }, release: async () => undefined },
    checkpoints: { read: async (runId, stage) => checkpoints.get(`${runId}:${stage}`) ?? null, append: async (value) => { const key = `${value.coordinatorRunId}:${value.stage}`, existing = checkpoints.get(key); if (existing && existing.checksum !== value.checksum) throw new Error("CONFLICT"); if (existing) return "DUPLICATE"; checkpoints.set(key, value); return "CREATED" }, appendFailure: async (value) => { checkpoints.set(`${value.coordinatorRunId}:failure:${value.stage}:${value.checksum}`, value); return "CREATED" } },
    authoritativeOhlcv: { reuse: async (slot) => slotResult(slot, null) },
    executors: Object.fromEntries(Object.keys(contracts).map((dataset) => [dataset, { execute: async (slot: ReturnType<typeof plan>["slots"][number], unit: { unitId: string | null }) => { executorCalls.push(`${slot.dataset}:${slot.instrument}`); return slotResult(slot, unit.unitId) } }])) as unknown as LiveResumeCoordinatorPorts["executors"],
    watermarks: { persistDataset: async (dataset, through, slots) => liveResumeStageOutput({ dataset, through, logicalSlots: slots.length }, [`watermark:${dataset}:${through}`]), persistCommon: async (through, datasets) => liveResumeStageOutput({ through, datasets: datasets.length }, [`watermark:common:${through}`]) },
    downstream: Object.fromEntries(["coverage", "consistency", "evidence", "projections", "replay"].map((name) => [name, async (input: { intervalStart: string; intervalEnd: string; slots: readonly LiveResumeSlotResult[] }) => { downstreamCalls.push(name); return liveResumeStageOutput({ intervalStart: input.intervalStart, intervalEnd: input.intervalEnd, slots: input.slots.length }, [`${name}:${input.intervalStart}`]) }])) as unknown as LiveResumeCoordinatorPorts["downstream"],
    candidate: { assemble: async () => { candidateAssembled = true; return liveResumeStageOutput({ lifecycle: "WITHHELD", exposure: "INTERNAL_ONLY" }, ["candidate:fixture"]) }, persistManifest: async () => liveResumeStageOutput({ channel: "candidate" }, ["manifest:fixture"]), compare: async () => { if (!candidateAssembled) throw new Error("CANDIDATE_REQUIRED"); return liveResumeStageOutput({ unexpectedDeletions: 0 }, ["comparison:fixture"]) } },
  }
  return { ports, checkpoints, createdUnits, executorCalls, downstreamCalls, stale: () => { fence += 1 }, exposed: () => candidateExposed }
}

async function main() {
  const certified = plan()
  assert.equal(certified.slots.length, 24)
  assert.equal(certified.slots.filter((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT").length, 1)
  assert.equal(certified.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME").length, 23)
  const persistedUnits = certified.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME").map((slot) => ({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, state: "PENDING" }))
  assert.doesNotThrow(() => verifyStageAwareLiveResumePlan({ plan: certified, stage: "AFTER_EXECUTION_SETUP", persistedUnits }))
  assert.throws(() => verifyStageAwareLiveResumePlan({ plan: certified, stage: "AFTER_EXECUTION_SETUP", persistedUnits: persistedUnits.slice(1) }), /EXECUTION_SETUP_INCOMPLETE/)
  assert.doesNotThrow(() => verifyStageAwareLiveResumePlan({ plan: certified, stage: "DURING_EXECUTION", persistedUnits: persistedUnits.slice(1) }))
  const governance = integratedMvpGovernanceDefinitions(start)
  assert.equal(governance.length, 16)
  assert.equal(governance.filter((value) => value.dataset === "funding").length, 4)
  assert.ok(governance.some((value) => value.identity === "mvp-bounded-funding-provider:binance-official-rest-funding-rate/1.0.0"))
  assert.ok(governance.every((value) => /^[0-9a-f]{64}$/.test(value.input.contentChecksum)))
  const manifestBasis = { schemaVersion: "mvp-clean-generation-input/1.0.0" as const, sourceGenerationId: `mrlr_${"a".repeat(64)}`, certifiedPlanContext: { planId: certified.planIdentity, planChecksum: certified.planChecksum }, targetInterval: { start, end }, logicalSlotIds: certified.slots.map((slot) => slot.logicalSlotId).sort(), reusableRawPayloadBytes: Object.freeze([]), excludedExecutionIdentities: { populationRunAttempts: Object.freeze([]), retrievalAttempts: Object.freeze([]), candidates: Object.freeze([]), checkpoints: Object.freeze([]) }, freshLineagePolicy: "FRESH_RETRIEVAL_CANDIDATE_FACT_DOWNSTREAM_WATERMARK_REPLAY_MANIFEST" as const }
  const manifest = Object.freeze({ ...manifestBasis, checksum: canonicalChecksum(manifestBasis) })
  const cleanContext = createCleanExecutionGenerationContext({ manifest, predecessorQuarantineReceiptId: `mre_${"b".repeat(64)}`, sourceCommitSha: "abcdef1", operatorConfirmationIdentity: "fixture-operator" })
  const cleanPlan = createCleanCertifiedLiveResumePlan({ predecessorPlan: certified, context: cleanContext })
  assert.notEqual(cleanPlan.planIdentity, certified.planIdentity)
  assert.deepEqual(cleanPlan.slots.map((slot) => slot.logicalSlotId), certified.slots.map((slot) => slot.logicalSlotId))
  assert.equal(cleanPlan.executionGeneration?.executionGenerationId, cleanContext.executionGenerationId)

  const dry = fixture(), dryResult = await new MvpLiveResumeCoordinator(dry.ports).execute({ plan: certified, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "DRY_RUN" })
  assert.equal(dryResult.status, "DRY_RUN")
  assert.equal(dryResult.logicalOutcomes, 24)
  assert.equal(dryResult.unitIntents, 23)
  assert.equal(dry.createdUnits.length, 0)
  assert.equal(dry.executorCalls.length, 0)
  assert.equal(dryResult.resolutions.filter((value) => value.action === "REUSED_AUTHORITATIVE_OUTPUT" && value.unitId === null).length, 1)

  const live = fixture(), coordinator = new MvpLiveResumeCoordinator(live.ports)
  const complete = await coordinator.execute({ plan: certified, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "CERTIFICATION", maxConcurrency: 2 })
  assert.equal(complete.status, "COMPLETE")
  assert.equal(live.createdUnits.length, 23)
  assert.equal(live.executorCalls.length, 23)
  assert.deepEqual(new Set(live.executorCalls.filter((value) => value.startsWith("ohlcv:"))), new Set(["ohlcv:ETHUSDT", "ohlcv:SOLUSDT", "ohlcv:BNBUSDT", "ohlcv:XRPUSDT", "ohlcv:DOGEUSDT"]))
  assert.deepEqual(live.downstreamCalls, ["coverage", "consistency", "evidence", "projections", "replay"])
  assert.equal(complete.checkpoints.length, LIVE_RESUME_STAGES.length)
  assert.equal(complete.commonWatermark, end)
  assert.equal(complete.candidateExposed, false)
  assert.equal(live.exposed(), false)

  const rerun = await coordinator.execute({ plan: certified, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "CERTIFICATION", maxConcurrency: 2 })
  assert.equal(rerun.status, "COMPLETE")
  assert.equal(live.createdUnits.length, 23)
  assert.equal(live.executorCalls.length, 23)

  const failure = fixture()
  await assert.rejects(() => new MvpLiveResumeCoordinator(failure.ports).execute({ plan: certified, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "CERTIFICATION", failAfterStage: "CANONICAL_COMMITTED" }), /LIVE_RESUME_INJECTED_FAILURE/)
  assert.equal([...failure.checkpoints.values()].some((value) => value.stage === "COMMON_WATERMARK_VALIDATED"), false)
  assert.equal([...failure.checkpoints.values()].some((value) => value.stage === "CANDIDATE_MEMBERSHIP_ASSEMBLED"), false)

  let failurePointsCertified = 0
  for (const failureStage of LIVE_RESUME_STAGES) {
    const injected = fixture(), resumable = new MvpLiveResumeCoordinator(injected.ports)
    await assert.rejects(() => resumable.execute({ plan: certified, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "CERTIFICATION", failAfterStage: failureStage }), /LIVE_RESUME_INJECTED_FAILURE/)
    const recovered = await resumable.execute({ plan: certified, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "CERTIFICATION" })
    assert.equal(recovered.status, "COMPLETE")
    assert.equal(injected.createdUnits.length, 23)
    assert.equal(injected.executorCalls.length, 23)
    failurePointsCertified += 1
  }

  const slotFailure = fixture()
  const originalOhlcv = slotFailure.ports.executors.ohlcv
  let ohlcvCalls = 0
  ;(slotFailure.ports.executors as Record<string, unknown>).ohlcv = { execute: async (...args: Parameters<typeof originalOhlcv.execute>) => { ohlcvCalls += 1; if (ohlcvCalls === 2) throw new Error("INJECTED_SLOT_FAILURE"); return originalOhlcv.execute(...args) } }
  await assert.rejects(() => new MvpLiveResumeCoordinator(slotFailure.ports).execute({ plan: certified, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "CERTIFICATION" }), /INJECTED_SLOT_FAILURE/)
  assert.equal([...slotFailure.checkpoints.values()].some((value) => value.stage === "COMMON_WATERMARK_VALIDATED"), false)
  assert.equal(slotFailure.downstreamCalls.length, 0)

  const conflict = fixture(), conflictCoordinator = new MvpLiveResumeCoordinator(conflict.ports)
  await assert.rejects(() => conflictCoordinator.execute({ plan: certified, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "CERTIFICATION", failAfterStage: "PLAN_VERIFIED" }), /LIVE_RESUME_INJECTED_FAILURE/)
  const first = [...conflict.checkpoints.entries()][0]!
  conflict.checkpoints.set(first[0], { ...first[1], inputChecksum: "f".repeat(64) })
  await assert.rejects(() => conflictCoordinator.execute({ plan: certified, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "CERTIFICATION" }), /STAGE_CHECKSUM_CONFLICT/)

  assert.deepEqual(parseLiveResumeWorkerOptions(["dry-run", `--start=${start}`, `--end=${end}`]), { command: "dry-run", start, end, executionMode: "dry-run", confirmLocalInactiveCandidate: false })
  assert.equal(parseLiveResumeWorkerOptions(["bootstrap-governance", `--start=${start}`, `--end=${end}`]).command, "bootstrap-governance")
  assert.throws(() => parseLiveResumeWorkerOptions(["run", `--start=${start}`, `--end=${end}`]), /EXPLICIT_CONFIRMATION_REQUIRED/)
  assert.equal(parseLiveResumeWorkerOptions(["run", `--start=${start}`, `--end=${end}`, "--execution-mode=live", "--confirm-local-inactive-candidate=true"]).confirmLocalInactiveCandidate, true)
  const quarantineRunId = `mrlr_${"a".repeat(64)}`
  const quarantinePreview = parseLiveResumeWorkerOptions(["quarantine-generation", `--run-id=${quarantineRunId}`, "--reason=LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT"])
  assert.equal(quarantinePreview.command, "quarantine-generation")
  assert.equal(quarantinePreview.confirmQuarantine, false)
  assert.throws(() => parseLiveResumeWorkerOptions(["quarantine-generation", `--run-id=${quarantineRunId}`, "--confirm-quarantine=true"]), /EXPLICIT_CONFIRMATION_REQUIRED/)
  const reconcilePreview = parseLiveResumeWorkerOptions(["reconcile-quarantine", `--run-id=${quarantineRunId}`])
  assert.equal(reconcilePreview.command, "reconcile-quarantine")
  assert.equal(reconcilePreview.confirmReconcile, false)
  assert.throws(() => parseLiveResumeWorkerOptions(["reconcile-quarantine", `--run-id=${quarantineRunId}`, "--confirm-reconcile=true"]), /EXPLICIT_CONFIRMATION_REQUIRED/)
  const reconcileConfirmed = parseLiveResumeWorkerOptions(["reconcile-quarantine", `--run-id=${quarantineRunId}`, "--confirm-reconcile=true", `--incident-checksum=${"b".repeat(64)}`, "--operator-confirmation-identity=mvp-operator"])
  assert.equal(reconcileConfirmed.command, "reconcile-quarantine")
  assert.equal(reconcileConfirmed.confirmReconcile, true)
  const createClean = parseLiveResumeWorkerOptions(["create-clean-generation", `--predecessor-run-id=${quarantineRunId}`, `--start=${start}`, `--end=${end}`, `--manifest-checksum=${"c".repeat(64)}`, "--confirm-create=true", "--operator-confirmation-identity=fixture-operator"])
  assert.equal(createClean.command, "create-clean-generation")
  assert.throws(() => parseLiveResumeWorkerOptions(["create-clean-generation", `--predecessor-run-id=${quarantineRunId}`, `--start=${start}`, `--end=${end}`, `--manifest-checksum=${"c".repeat(64)}`]), /EXPLICIT_CONFIRMATION_REQUIRED/)
  assert.equal(parseLiveResumeWorkerOptions(["clean-generation-status", `--execution-generation-id=${cleanContext.executionGenerationId}`]).command, "clean-generation-status")
  assert.throws(() => parseLiveResumeWorkerOptions(["execute-clean-generation", `--execution-generation-id=${cleanContext.executionGenerationId}`]), /EXPLICIT_CONFIRMATION_REQUIRED/)
  assert.doesNotThrow(() => assertSanitizedLiveResumeOutput({ configured: true, planChecksum: certified.planChecksum }))
  assert.throws(() => assertSanitizedLiveResumeOutput({ connectionString: "redacted" }), /OUTPUT_NOT_SANITIZED/)

  const changed = { ...certified, planChecksum: "0".repeat(64) }
  await assert.rejects(() => new MvpLiveResumeCoordinator(fixture().ports).execute({ plan: changed, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "DRY_RUN" }), /PLAN_CHECKSUM_MISMATCH/)
  console.log(JSON.stringify({ status: "PASS", logicalSlots: 24, authoritativeReuse: 1, unitIntents: 23, stages: LIVE_RESUME_STAGES.length, failurePointsCertified, candidateExposed: false }))
}

void main().catch((error) => { console.error(error); process.exitCode = 1 })
