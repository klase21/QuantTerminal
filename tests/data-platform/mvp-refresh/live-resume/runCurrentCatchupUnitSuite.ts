import assert from "node:assert/strict"

import {
  CURRENT_MVP_CANDIDATE_BASELINE,
  createDryRunLiveResumeExecutionSetup,
  createCurrentCatchupDayPlan,
  classifyCurrentCatchupExecutionState,
  currentCatchupProcessExitCode,
  currentCatchupIdentity,
  expandCurrentCatchupWindows,
  liveResumeRunIdentity,
  MvpLiveResumeCoordinator,
  parseCurrentCatchupWorkerOptions,
  runCurrentCandidateCatchup,
  type CertifiedLiveResumePlan,
  type CurrentCatchupPorts,
  type LiveResumeCoordinatorResult,
  type LiveResumeCoordinatorPorts,
  type LiveResumeStageCheckpoint,
  type LiveResumeStatusSnapshot,
} from "@/lib/data-platform/mvp-refresh"

const START = "2026-07-16T00:00:00.000Z"
const THROUGH = "2026-07-29T00:00:00.000Z"

function currentCatchupStatus(overrides: Partial<LiveResumeStatusSnapshot> = {}): LiveResumeStatusSnapshot {
  return Object.freeze({
    planId: `mrlp_${"a".repeat(64)}`,
    planChecksum: "a".repeat(64),
    persistedRunId: `mrlr_${"b".repeat(64)}`,
    runState: "PLANNED",
    unitCountsByState: Object.freeze({ PENDING: 24 }),
    unitCountsByDataset: Object.freeze({ ohlcv: 6, "open-interest": 6, funding: 6, "agg-trade": 6 }),
    authoritativeReuse: 0,
    createdSlots: 0,
    reusedSlots: 0,
    resumableSlots: 24,
    missingSlots: 0,
    currentCoordinatorStage: "UNITS_RESOLVED",
    leaseState: "RELEASED",
    candidateState: null,
    commonWatermark: null,
    blockers: Object.freeze(["STAGE_FAILURE:SOURCES_ACQUIRED"]),
    persistedUnitCount: 24,
    recoverableSlots: 24,
    blockedSlots: 0,
    retainedArtifacts: 2,
    retainedCandidates: 0,
    effectiveExecutionState: "BLOCKED",
    disposition: "ACTIVE",
    resumeEligible: true,
    quarantineReason: null,
    incidentChecksum: null,
    quarantineSagaState: null,
    missingQuarantineSteps: Object.freeze([]),
    quarantineReceiptId: null,
    ...overrides,
  })
}

async function main(): Promise<void> {
const dryOptions = parseCurrentCatchupWorkerOptions([
  "catch-up-current-candidate",
  `--start=${START}`,
  `--through=${THROUGH}`,
  "--execution-mode=dry-run",
  "--confirm-local-inactive-candidate=false",
  "--max-concurrency=2",
])
assert.equal(dryOptions.confirmLocalInactiveCandidate, false)
assert.equal(dryOptions.maxConcurrency, 2)
assert.equal(dryOptions.maxWindowsThisRun, null)
assert.throws(() => parseCurrentCatchupWorkerOptions(["catch-up-current-candidate", `--start=${START}`, `--through=${THROUGH}`, "--execution-mode=live", "--confirm-local-inactive-candidate=false"]), /CURRENT_CATCHUP_LIVE_CONFIRMATION_REQUIRED/)
assert.throws(() => parseCurrentCatchupWorkerOptions(["catch-up-current-candidate", "--start=2026-07-16T01:00:00.000Z", `--through=${THROUGH}`, "--execution-mode=dry-run", "--confirm-local-inactive-candidate=false"]), /CURRENT_CATCHUP_START_EXACT_UTC_MIDNIGHT_REQUIRED/)
assert.throws(() => parseCurrentCatchupWorkerOptions(["catch-up-current-candidate", `--start=${START}`, `--through=${THROUGH}`, "--execution-mode=dry-run", "--confirm-local-inactive-candidate=false", "--max-concurrency=3"]), /CURRENT_CATCHUP_CONCURRENCY_INVALID/)
assert.throws(() => parseCurrentCatchupWorkerOptions(["catch-up-current-candidate", `--start=${START}`, `--through=${THROUGH}`, "--execution-mode=dry-run", "--confirm-local-inactive-candidate"]), /CURRENT_CATCHUP_CONFIRMATION_FLAG_INVALID/)
assert.throws(() => parseCurrentCatchupWorkerOptions(["catch-up-current-candidate", `--start=${START}`, `--through=${THROUGH}`, "--execution-mode=dry-run", "--confirm-local-inactive-candidate=false", "--max-windows-this-run=0"]), /CURRENT_CATCHUP_EXECUTION_WINDOW_LIMIT_INVALID/)
assert.throws(() => parseCurrentCatchupWorkerOptions(["catch-up-current-candidate", `--start=${START}`, `--through=${THROUGH}`, "--execution-mode=dry-run", "--confirm-local-inactive-candidate=false", "--max-windows-this-run=14"]), /CURRENT_CATCHUP_EXECUTION_WINDOW_LIMIT_EXCEEDS_RANGE/)

const verifiedResumableStatus = currentCatchupStatus()
assert.equal(verifiedResumableStatus.effectiveExecutionState, "BLOCKED")
assert.equal(classifyCurrentCatchupExecutionState({ status: verifiedResumableStatus, completeCheckpoint: null }), "INCOMPLETE")
assert.equal(verifiedResumableStatus.retainedArtifacts, 2)
assert.equal(classifyCurrentCatchupExecutionState({ status: currentCatchupStatus({ leaseState: "ACTIVE" }), completeCheckpoint: null }), "BLOCKED")
assert.equal(classifyCurrentCatchupExecutionState({ status: currentCatchupStatus({ blockedSlots: 1 }), completeCheckpoint: null }), "BLOCKED")
assert.equal(classifyCurrentCatchupExecutionState({ status: currentCatchupStatus({ disposition: "QUARANTINED", resumeEligible: false, blockers: Object.freeze(["EXECUTION_GENERATION_QUARANTINED"]) }), completeCheckpoint: null }), "BLOCKED")
assert.equal(classifyCurrentCatchupExecutionState({ status: currentCatchupStatus({ disposition: "SUPERSEDED", resumeEligible: false, blockers: Object.freeze(["EXECUTION_GENERATION_SUPERSEDED"]) }), completeCheckpoint: null }), "BLOCKED")
assert.equal(classifyCurrentCatchupExecutionState({ status: currentCatchupStatus({ resumeEligible: false }), completeCheckpoint: null }), "BLOCKED")
assert.equal(classifyCurrentCatchupExecutionState({ status: currentCatchupStatus({ recoverableSlots: 23 }), completeCheckpoint: null }), "BLOCKED")
assert.equal(classifyCurrentCatchupExecutionState({ status: currentCatchupStatus({ blockers: Object.freeze(["IMMUTABLE_LOGICAL_SLOT_CONFLICT"]) }), completeCheckpoint: null }), "BLOCKED")
assert.equal(classifyCurrentCatchupExecutionState({ status: currentCatchupStatus({ persistedRunId: null, runState: null, effectiveExecutionState: "NOT_STARTED", unitCountsByState: Object.freeze({}), unitCountsByDataset: Object.freeze({}), persistedUnitCount: 0, recoverableSlots: 0, resumableSlots: 0, blockers: Object.freeze([]) }), completeCheckpoint: null }), "NOT_STARTED")
assert.equal(classifyCurrentCatchupExecutionState({ status: currentCatchupStatus({ effectiveExecutionState: "COMPLETE", resumeEligible: false }), completeCheckpoint: "COMPLETE" }), "COMPLETE")

const windows = expandCurrentCatchupWindows(START, THROUGH)
assert.equal(windows.length, 13)
assert.deepEqual(windows[0], { ordinal: 0, intervalStart: START, intervalEnd: "2026-07-17T00:00:00.000Z" })
assert.deepEqual(windows[12], { ordinal: 12, intervalStart: "2026-07-28T00:00:00.000Z", intervalEnd: THROUGH })
for (let index = 1; index < windows.length; index += 1) assert.equal(windows[index]!.intervalStart, windows[index - 1]!.intervalEnd)

const catchup = currentCatchupIdentity(START, THROUGH)
const firstPlan = createCurrentCatchupDayPlan({ catchupId: catchup.catchupId, window: windows[0]!, reconciliation: { attempts: Object.freeze([]), authorities: Object.freeze([]) } })
const repeatedPlan = createCurrentCatchupDayPlan({ catchupId: catchup.catchupId, window: windows[0]!, reconciliation: { attempts: Object.freeze([]), authorities: Object.freeze([]) } })
assert.equal(firstPlan.executionProfile, "CURRENT_CANDIDATE_CATCHUP")
assert.equal(firstPlan.currentCatchup?.baseline.candidateId, CURRENT_MVP_CANDIDATE_BASELINE.candidateId)
assert.equal(firstPlan.currentCatchup?.baseline.sourceLineageIdentity, CURRENT_MVP_CANDIDATE_BASELINE.sourceLineageIdentity)
assert.equal(firstPlan.slots.length, 24)
assert.equal(firstPlan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME").length, 24)
assert.equal(firstPlan.slots.filter((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT").length, 0)
assert.equal(firstPlan.planIdentity, repeatedPlan.planIdentity)
assert.equal(liveResumeRunIdentity(firstPlan).runId, liveResumeRunIdentity(repeatedPlan).runId)
const existingFullRangePlan = createCurrentCatchupDayPlan({
  catchupId: catchup.catchupId,
  window: windows[0]!,
  reconciliation: {
    attempts: Object.freeze([]),
    authorities: Object.freeze([]),
    existingExecution: Object.freeze({ plan: firstPlan, runId: liveResumeRunIdentity(firstPlan).runId, unitIds: Object.freeze([]) }),
  },
})
assert.equal(existingFullRangePlan.planIdentity, firstPlan.planIdentity)
const narrowedCatchup = currentCatchupIdentity(START, "2026-07-17T00:00:00.000Z")
assert.throws(() => createCurrentCatchupDayPlan({
  catchupId: narrowedCatchup.catchupId,
  window: windows[0]!,
  reconciliation: {
    attempts: Object.freeze([]),
    authorities: Object.freeze([]),
    existingExecution: Object.freeze({ plan: firstPlan, runId: liveResumeRunIdentity(firstPlan).runId, unitIds: Object.freeze([]) }),
  },
}), /CURRENT_CATCHUP_EXISTING_EXECUTION_CONFLICT/)

const dryCheckpoints = new Map<string, LiveResumeStageCheckpoint>()
let dryAuthorityCalls = 0
const freshCoordinator = new MvpLiveResumeCoordinator({
  targets: { classify: async () => Object.freeze({ refreshLocal: true, truthPlaneLocal: true, servingLocal: true, objectStorageLocal: true, servingPublisher: true, managedOrProductionTarget: false }) },
  execution: { resolveOrCreate: async ({ plan }) => createDryRunLiveResumeExecutionSetup(plan) },
  lease: { acquire: async () => Object.freeze({ fencingToken: 1 }), assert: async () => undefined, release: async () => undefined },
  checkpoints: {
    read: async (runId, stage) => dryCheckpoints.get(`${runId}:${stage}`) ?? null,
    append: async (checkpoint) => { dryCheckpoints.set(`${checkpoint.coordinatorRunId}:${checkpoint.stage}`, checkpoint); return "CREATED" },
    appendFailure: async () => "CREATED",
  },
  authoritativeOhlcv: { reuse: async () => { dryAuthorityCalls += 1; throw new Error("FRESH_PLAN_MUST_NOT_READ_AUTHORITY") } },
  executors: Object.fromEntries(["ohlcv", "open-interest", "funding", "agg-trade"].map((dataset) => [dataset, { execute: async () => { throw new Error("DRY_RUN_MUST_NOT_EXECUTE_SOURCE") } }])) as unknown as LiveResumeCoordinatorPorts["executors"],
  watermarks: { persistDataset: async () => { throw new Error("DRY_RUN_MUST_NOT_WRITE_WATERMARK") }, persistCommon: async () => { throw new Error("DRY_RUN_MUST_NOT_WRITE_WATERMARK") } },
  downstream: Object.fromEntries(["coverage", "consistency", "evidence", "projections", "replay"].map((stage) => [stage, async () => { throw new Error("DRY_RUN_MUST_NOT_EXECUTE_DOWNSTREAM") }])) as unknown as LiveResumeCoordinatorPorts["downstream"],
  candidate: { assemble: async () => { throw new Error("DRY_RUN_MUST_NOT_ASSEMBLE_CANDIDATE") }, persistManifest: async () => { throw new Error("DRY_RUN_MUST_NOT_PERSIST_MANIFEST") }, compare: async () => { throw new Error("DRY_RUN_MUST_NOT_COMPARE_CANDIDATE") } },
})
const freshDryResult = await freshCoordinator.execute({ plan: firstPlan, allowedInstruments: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"], allowedDatasets: ["ohlcv", "open-interest", "funding", "agg-trade"], mode: "DRY_RUN", maxConcurrency: 2 })
assert.equal(freshDryResult.status, "DRY_RUN")
assert.equal(freshDryResult.logicalOutcomes, 24)
assert.equal(freshDryResult.unitIntents, 24)
assert.equal(freshDryResult.resolutions.filter((value) => value.action === "CREATED_UNIT").length, 24)
assert.equal(dryAuthorityCalls, 0)

let dryExecutionReads = 0
let dryExecutions = 0
const inspectedConcurrency: number[] = []
const dryPorts: CurrentCatchupPorts = {
  reconcile: async () => Object.freeze({ attempts: Object.freeze([]), authorities: Object.freeze([]) }),
  inspectSources: async ({ plan, maxConcurrency }) => {
    inspectedConcurrency.push(maxConcurrency)
    return Object.freeze(plan.slots.map((slot) => Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, status: "READY_FOR_DOWNLOAD" as const, reusableRawObjects: 0, contentLength: 100, reason: null })))
  },
  readExecutionState: async () => { dryExecutionReads += 1; return Object.freeze({ state: "NOT_STARTED", candidateBaseline: null }) },
  execute: async () => { dryExecutions += 1; throw new Error("DRY_RUN_MUST_NOT_EXECUTE") },
}
const dryResult = await runCurrentCandidateCatchup(dryOptions, dryPorts)
assert.equal(dryResult.status, "DRY_RUN")
assert.equal(dryResult.windowCount, 13)
assert.equal(dryResult.logicalSlotCount, 312)
assert.equal(dryResult.readySourceSlotCount, 312)
assert.equal(dryResult.sourceStatusCounts.READY_FOR_DOWNLOAD, 312)
assert.equal(dryResult.sourceStatusCounts.REUSE_CERTIFIED_EXISTING, 0)
assert.equal(dryResult.sourceStatusCounts.SOURCE_NOT_FINALIZED, 0)
assert.equal(dryResult.sourceStatusCounts.UNAVAILABLE, 0)
assert.equal(dryResult.sourceStatusCounts.CHECKSUM_CONFLICT, 0)
assert.equal(dryResult.sourceStatusCounts.CONTRACT_UNSUPPORTED, 0)
assert.equal(dryResult.estimatedDownloadBytes, 31_200)
assert.equal(dryResult.contiguousSourceReadyThrough, THROUGH)
assert.equal(dryResult.completedThrough, START)
assert.equal(dryResult.operationalMutationCalls, 0)
assert.equal(dryResult.windowsCompletedThisInvocation, 0)
assert.equal(dryResult.retainedPayloadBytes, 0)
assert.equal(dryResult.candidateExposed, false)
assert.equal(dryResult.days.every((day) => day.executionState === "PLANNED" && day.sourceSlots === 24 && day.readySourceSlots === 24), true)
assert.equal(dryExecutionReads, 0)
assert.equal(dryExecutions, 0)
assert.equal(inspectedConcurrency.length, 13)
assert.equal(inspectedConcurrency.every((value) => value === 2), true)
assert.match(dryResult.commands.live, /catch-up-current-candidate/)
assert.match(dryResult.commands.live, /--execution-mode=live/)
assert.match(dryResult.commands.live, /--confirm-local-inactive-candidate=true/)
assert.equal(dryResult.commands.resume, dryResult.commands.live)

function completeResult(plan: CertifiedLiveResumePlan): LiveResumeCoordinatorResult {
  const candidateChecksum = "c".repeat(64)
  return Object.freeze({
    status: "COMPLETE",
    coordinatorRunId: liveResumeRunIdentity(plan).runId,
    planIdentity: plan.planIdentity,
    planChecksum: plan.planChecksum,
    logicalOutcomes: 24,
    unitIntents: 24,
    resolutions: Object.freeze([]),
    slotResults: Object.freeze([]),
    checkpoints: Object.freeze([]),
    commonWatermark: plan.intervalEnd,
    candidateBaseline: Object.freeze({ candidateId: `mvp-serving-candidate:${candidateChecksum}`, candidateChecksum, governedThrough: plan.intervalEnd, sourceLineageIdentity: `mvp-candidate-manifest:${"d".repeat(64)}`, commonWatermarkId: `mrcw_${"e".repeat(64)}`, commonWatermarkValue: plan.intervalEnd, commonWatermarkChecksum: "e".repeat(64), memberSetChecksum: "f".repeat(64) }),
    candidateExposed: false,
  })
}

const resumeOptions = parseCurrentCatchupWorkerOptions([
  "catch-up-current-candidate",
  `--start=${START}`,
  "--through=2026-07-17T00:00:00.000Z",
  "--execution-mode=live",
  "--confirm-local-inactive-candidate=true",
  "--max-concurrency=1",
])
let selectedResumeIntent: "RUN" | "RESUME" | null = null
const resumablePorts: CurrentCatchupPorts = {
  reconcile: async () => Object.freeze({ attempts: Object.freeze([]), authorities: Object.freeze([]) }),
  inspectSources: async ({ plan }) => Object.freeze(plan.slots.map((slot) => Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, status: "READY_FOR_DOWNLOAD" as const, reusableRawObjects: 0, contentLength: null, reason: null }))),
  readExecutionState: async () => Object.freeze({ state: "INCOMPLETE" as const, candidateBaseline: null }),
  execute: async ({ plan, intent }) => {
    selectedResumeIntent = intent
    return completeResult(plan)
  },
}
const resumed = await runCurrentCandidateCatchup(resumeOptions, resumablePorts)
assert.equal(selectedResumeIntent, "RESUME")
assert.equal(resumed.status, "COMPLETE")

const liveOptions = parseCurrentCatchupWorkerOptions([
  "catch-up-current-candidate",
  `--start=${START}`,
  `--through=${THROUGH}`,
  "--execution-mode=live",
  "--confirm-local-inactive-candidate=true",
  "--max-concurrency=1",
])
let liveStateReads = 0
let liveExecutions = 0
let liveReconciliations = 0
const livePorts: CurrentCatchupPorts = {
  reconcile: async () => { liveReconciliations += 1; return Object.freeze({ attempts: Object.freeze([]), authorities: Object.freeze([]) }) },
  inspectSources: async ({ plan }) => Object.freeze(plan.slots.map((slot) => Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, status: "READY_FOR_DOWNLOAD" as const, reusableRawObjects: 0, contentLength: null, reason: null }))),
  readExecutionState: async () => {
    liveStateReads += 1
    return liveStateReads === 1 ? Object.freeze({ state: "NOT_STARTED" as const, candidateBaseline: null }) : Object.freeze({ state: "BLOCKED" as const, candidateBaseline: null })
  },
  execute: async ({ plan, intent, maxConcurrency }) => {
    liveExecutions += 1
    assert.equal(intent, "RUN")
    assert.equal(maxConcurrency, 1)
    return completeResult(plan)
  },
}
const stopped = await runCurrentCandidateCatchup(liveOptions, livePorts)
assert.equal(stopped.status, "BLOCKED")
assert.equal(currentCatchupProcessExitCode(stopped.status), 1)
assert.equal(currentCatchupProcessExitCode(resumed.status), 0)
assert.equal(currentCatchupProcessExitCode(dryResult.status), 0)
assert.equal(stopped.completedThrough, "2026-07-17T00:00:00.000Z")
assert.equal(stopped.days.length, 2)
assert.equal(stopped.days[0]?.executionState, "COMPLETE")
assert.equal(stopped.days[1]?.executionState, "BLOCKED")
assert.equal(liveExecutions, 1)
assert.equal(liveReconciliations, 2)

const limitedOptions = parseCurrentCatchupWorkerOptions([
  "catch-up-current-candidate",
  `--start=${START}`,
  `--through=${THROUGH}`,
  "--execution-mode=live",
  "--confirm-local-inactive-candidate=true",
  "--max-concurrency=2",
  "--max-windows-this-run=1",
])
assert.equal(limitedOptions.maxWindowsThisRun, 1)
assert.deepEqual(currentCatchupIdentity(limitedOptions.start, limitedOptions.through), currentCatchupIdentity(liveOptions.start, liveOptions.through))
const limitedTouchedWindows: number[] = []
let limitedIntent: "RUN" | "RESUME" | null = null
const limitedPorts: CurrentCatchupPorts = {
  reconcile: async (window) => {
    limitedTouchedWindows.push(window.ordinal)
    return window.ordinal === 0
      ? Object.freeze({
        attempts: Object.freeze([]),
        authorities: Object.freeze([]),
        existingExecution: Object.freeze({ plan: firstPlan, runId: liveResumeRunIdentity(firstPlan).runId, unitIds: Object.freeze([]) }),
      })
      : Object.freeze({ attempts: Object.freeze([]), authorities: Object.freeze([]) })
  },
  inspectSources: async ({ plan }) => Object.freeze(plan.slots.map((slot) => Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, status: "READY_FOR_DOWNLOAD" as const, reusableRawObjects: 0, contentLength: null, reason: null }))),
  readExecutionState: async () => Object.freeze({ state: "INCOMPLETE" as const, candidateBaseline: null }),
  execute: async ({ plan, intent }) => {
    limitedIntent = intent
    return completeResult(plan)
  },
}
const paused = await runCurrentCandidateCatchup(limitedOptions, limitedPorts)
assert.equal(limitedIntent, "RESUME")
assert.deepEqual(limitedTouchedWindows, [0])
assert.equal(paused.status, "PAUSED")
assert.equal(currentCatchupProcessExitCode(paused.status), 0)
assert.equal(paused.windowsCompletedThisInvocation, 1)
assert.equal(paused.completedThrough, "2026-07-17T00:00:00.000Z")
assert.equal(paused.requestedThrough, THROUGH)
assert.equal(paused.candidateExposed, false)
assert.doesNotMatch(paused.commands.resume, /max-windows-this-run/)

const resumedTouchedWindows: number[] = []
const continuePorts: CurrentCatchupPorts = {
  reconcile: async (window) => {
    resumedTouchedWindows.push(window.ordinal)
    return Object.freeze({ attempts: Object.freeze([]), authorities: Object.freeze([]) })
  },
  inspectSources: async ({ plan }) => Object.freeze(plan.slots.map((slot) => Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, status: "READY_FOR_DOWNLOAD" as const, reusableRawObjects: 0, contentLength: null, reason: null }))),
  readExecutionState: async (plan) => plan.intervalStart === START
    ? Object.freeze({ state: "COMPLETE" as const, candidateBaseline: completeResult(plan).candidateBaseline! })
    : Object.freeze({ state: "BLOCKED" as const, candidateBaseline: null }),
  execute: async () => { throw new Error("CONTINUATION_TEST_MUST_NOT_EXECUTE_BLOCKED_SECOND_DAY") },
}
const continued = await runCurrentCandidateCatchup(liveOptions, continuePorts)
assert.equal(continued.status, "BLOCKED")
assert.deepEqual(resumedTouchedWindows, [0, 1])
assert.equal(continued.days[0]?.executionState, "COMPLETE")
assert.equal(continued.days[1]?.executionState, "BLOCKED")

console.log(JSON.stringify({ status: "PASS", windows: windows.length, logicalSlots: dryResult.logicalSlotCount, readySourceSlots: dryResult.readySourceSlotCount, deterministicPlanId: firstPlan.planIdentity, deterministicRunId: liveResumeRunIdentity(firstPlan).runId, operationalMutationCalls: dryResult.operationalMutationCalls, candidateExposed: dryResult.candidateExposed }))
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
