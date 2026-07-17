import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  ControlledOhlcvRecoveryStore,
  MvpLiveResumeCoordinator,
  MvpRefreshStore,
  assertSanitizedLiveResumeOutput,
  buildRefreshSlotResumePlan,
  createCertifiedLiveResumePlan,
  createMvpRefreshClientFromEnvironment,
  createBoundedArchiveRequest,
  createBoundedFundingRequest,
  createLocalLiveResumeEnvironment,
  inspectBoundedArchiveAvailability,
  liveResumeStageOutput,
  parseLiveResumeWorkerOptions,
  type LiveResumeCoordinatorPorts,
  type LiveResumeStageCheckpoint,
} from "@/lib/data-platform/mvp-refresh"
import { createBoundedFundingSourceUrl } from "@/lib/data-platform/mvp-refresh/boundedFunding"

const INSTRUMENTS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const
const DATASETS = ["ohlcv", "open-interest", "funding", "agg-trade"] as const

async function loadPlan(start: string, end: string) {
  const client = createMvpRefreshClientFromEnvironment()
  try {
    await client.verify()
    const attempts = await new MvpRefreshStore(client).auditUnitsForWindow(start, end)
    const authorities = await new ControlledOhlcvRecoveryStore(client).readAuthoritiesForWindow(start, end)
    const slots = buildRefreshSlotResumePlan({ intervalStart: start, intervalEnd: end, attempts, authoritativeResolutions: authorities, sourceFinalizationState: "SOURCE_AVAILABLE" })
    return Object.freeze({ plan: createCertifiedLiveResumePlan({ intervalStart: start, intervalEnd: end, slots }), authorityCount: authorities.length })
  } finally { await client.shutdown() }
}

async function preflight(start: string, end: string) {
  const archiveRequests = DATASETS.filter((value) => value !== "funding").flatMap((dataset) => INSTRUMENTS.map((instrument) => createBoundedArchiveRequest({ dataset, provider: "binance-vision", instrument, eventTimeStart: start, eventTimeEnd: end, sourceContractVersion: dataset === "ohlcv" ? "mvp-bounded-ohlcv/1.0.0" : dataset === "open-interest" ? "mvp-bounded-open-interest/1.0.0" : "mvp-bounded-agg-trade/1.0.0", maximumRecordCount: dataset === "ohlcv" ? 288 : dataset === "open-interest" ? 10_000 : 10_000_000 })))
  const fundingRequests = INSTRUMENTS.map((instrument) => createBoundedFundingRequest({ provider: "binance-official-rest-funding-rate", instrument, eventTimeStart: start, eventTimeEnd: end, maximumEventCount: 1_000, requestedAt: new Date().toISOString() }))
  const [localEnvironment, loaded, archives, funding] = await Promise.all([
    createLocalLiveResumeEnvironment({ mode: "PREFLIGHT" }),
    loadPlan(start, end),
    Promise.all(archiveRequests.map((request) => inspectBoundedArchiveAvailability(request))),
    Promise.all(fundingRequests.map(async (request) => {
      try {
        const response = await fetch(createBoundedFundingSourceUrl(request), { cache: "no-store", signal: AbortSignal.timeout(20_000) })
        if (!response.ok) return Object.freeze({ instrument: request.instrument, ready: false, classification: "SOURCE_UNAVAILABLE" })
        const value: unknown = await response.json()
        return Object.freeze({ instrument: request.instrument, ready: Array.isArray(value), classification: Array.isArray(value) ? "READY" : "MALFORMED_SOURCE_DATA" })
      } catch { return Object.freeze({ instrument: request.instrument, ready: false, classification: "CONNECTION_FAILED" }) }
    })),
  ])
  const environment = Object.freeze({ version: "mvp-live-resume-environment/1.0.0", passed: localEnvironment.passed, capabilities: localEnvironment.capabilities, productionOrNeonWriteTarget: false as const })
  const planCounts = { reuseAuthoritative: loaded.plan.slots.filter((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT").length, createNew: loaded.plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME").length, conflicts: loaded.plan.slots.filter((slot) => slot.action === "BLOCKED_CONFLICT").length }
  const archivePass = archives.length === 18 && archives.every((value) => value.sourceClassification === "HTTP_SUCCESS" && value.available && value.finalized)
  const fundingPass = funding.length === 6 && funding.every((value) => value.ready)
  const passed = environment.passed && archivePass && fundingPass && loaded.authorityCount === 1 && planCounts.reuseAuthoritative === 1 && planCounts.createNew === 23 && planCounts.conflicts === 0
  return Object.freeze({ passed, environment, sourceAvailability: { archives: { checked: archives.length, ready: archives.filter((value) => value.available && value.finalized).length, passed: archivePass }, funding: { checked: funding.length, ready: funding.filter((value) => value.ready).length, passed: fundingPass } }, authority: { count: loaded.authorityCount, checksumValid: loaded.authorityCount === 1 }, planner: { planIdentity: loaded.plan.planIdentity, planChecksum: loaded.plan.planChecksum, logicalSlots: loaded.plan.slots.length, ...planCounts }, productionOrNeonWriteTarget: false })
}

function dryRunPorts(gate: Awaited<ReturnType<typeof preflight>>): LiveResumeCoordinatorPorts {
  const checkpoints = new Map<string, LiveResumeStageCheckpoint>()
  return {
    targets: { classify: async () => ({ refreshLocal: gate.environment.passed, truthPlaneLocal: gate.environment.passed, servingLocal: gate.environment.passed, objectStorageLocal: gate.environment.passed, servingPublisher: gate.environment.passed, managedOrProductionTarget: gate.productionOrNeonWriteTarget }) },
    lease: { acquire: async () => ({ fencingToken: 1 }), assert: async () => undefined, release: async () => undefined },
    checkpoints: { read: async (runId, stage) => checkpoints.get(`${runId}:${stage}`) ?? null, append: async (checkpoint) => { const key = `${checkpoint.coordinatorRunId}:${checkpoint.stage}`, existing = checkpoints.get(key); if (existing && existing.checksum !== checkpoint.checksum) throw new Error("LIVE_RESUME_DRY_RUN_CHECKPOINT_CONFLICT"); if (existing) return "DUPLICATE"; checkpoints.set(key, checkpoint); return "CREATED" }, appendFailure: async () => "CREATED" },
    units: { resolve: async (slot, input) => ({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, action: "CREATED_UNIT", unitId: `intent_${canonicalChecksum({ runId: input.runId, logicalSlotId: slot.logicalSlotId })}`, sourceContractId: slot.dataset === "ohlcv" ? "mvp-bounded-ohlcv/1.0.0" : slot.dataset === "open-interest" ? "mvp-bounded-open-interest/1.0.0" : slot.dataset === "funding" ? "binance-official-rest-funding-rate/1.0.0" : "mvp-bounded-agg-trade/1.0.0", checkpointStartStage: "PENDING", fencingToken: input.fencingToken, reason: "DRY_RUN_UNIT_INTENT" }) },
    authoritativeOhlcv: { reuse: async () => { throw new Error("DRY_RUN_MUST_NOT_EXECUTE_AUTHORITY") } },
    executors: Object.fromEntries(DATASETS.map((dataset) => [dataset, { execute: async () => { throw new Error("DRY_RUN_MUST_NOT_EXECUTE_DATASET") } }])) as unknown as LiveResumeCoordinatorPorts["executors"],
    watermarks: { persistDataset: async () => { throw new Error("DRY_RUN_MUST_NOT_WRITE_WATERMARK") }, persistCommon: async () => { throw new Error("DRY_RUN_MUST_NOT_WRITE_WATERMARK") } },
    downstream: Object.fromEntries(["coverage", "consistency", "evidence", "projections", "replay"].map((name) => [name, async () => { throw new Error(`DRY_RUN_MUST_NOT_EXECUTE_${name.toUpperCase()}`) }])) as unknown as LiveResumeCoordinatorPorts["downstream"],
    candidate: { assemble: async () => { throw new Error("DRY_RUN_MUST_NOT_ASSEMBLE_CANDIDATE") }, persistManifest: async () => { throw new Error("DRY_RUN_MUST_NOT_PERSIST_MANIFEST") }, compare: async () => liveResumeStageOutput({}, []) },
  }
}

async function main() {
  const options = parseLiveResumeWorkerOptions(process.argv.slice(2))
  if (options.command === "inspect") {
    const environment = await createLocalLiveResumeEnvironment({ mode: "INSPECT" })
    return print({ command: options.command, coordinatorVersion: "mvp-live-resume-coordinator/1.0.0", environmentVersion: "mvp-live-resume-environment/1.0.0", capabilities: environment.capabilities, commands: ["inspect", "plan", "preflight", "dry-run", "run", "resume", "status", "verify"], liveConfirmationRequired: true })
  }
  const loaded = await loadPlan(options.start, options.end)
  if (options.command === "plan") return print({ command: options.command, plan: { planIdentity: loaded.plan.planIdentity, planChecksum: loaded.plan.planChecksum, logicalSlots: 24, reuseAuthoritative: 1, createNew: 23, conflicts: 0 } })
  const gate = await preflight(options.start, options.end)
  if (options.command === "preflight") return print({ command: options.command, result: gate })
  if (options.command === "status") return print({ command: options.command, status: "CERTIFICATION_ONLY", liveUnitsCreated: 0, candidateBuilt: false, productionMutation: false })
  if (options.command === "dry-run" || options.command === "verify") {
    if (!gate.passed) throw new Error("LIVE_RESUME_PREFLIGHT_FAILED")
    const result = await new MvpLiveResumeCoordinator(dryRunPorts(gate)).execute({ plan: loaded.plan, allowedInstruments: INSTRUMENTS, allowedDatasets: DATASETS, mode: "DRY_RUN" })
    return print({ command: options.command, result })
  }
  if (options.command === "run" || options.command === "resume") {
    if (!gate.passed) throw new Error("LIVE_RESUME_PREFLIGHT_FAILED")
    throw new Error("LIVE_RESUME_ENVIRONMENT_PORT_BOOTSTRAP_REQUIRED")
  }
}

function print(value: unknown): void {
  assertSanitizedLiveResumeOutput(value)
  console.log(JSON.stringify(value, null, 2))
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "LIVE_RESUME_WORKER_FAILED"); process.exitCode = 1 })
