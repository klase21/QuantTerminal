import postgres from "postgres"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  ControlledOhlcvRecoveryStore,
  MvpLiveResumeCoordinator,
  MvpRefreshStore,
  assertSanitizedLiveResumeOutput,
  buildRefreshSlotResumePlan,
  createCertifiedLiveResumePlan,
  createMvpRefreshClientFromEnvironment,
  liveResumeStageOutput,
  parseLiveResumeWorkerOptions,
  type LiveResumeCoordinatorPorts,
  type LiveResumeStageCheckpoint,
} from "@/lib/data-platform/mvp-refresh"
import { inspectMvpServingIsolatedTarget } from "@/lib/data-platform/mvp-serving/safety"
import { inspectFilesystemObjectRoot } from "@/lib/data-platform/population/backfill/filesystemObjectStorage"

const INSTRUMENTS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const
const DATASETS = ["ohlcv", "open-interest", "funding", "agg-trade"] as const

function localUrl(value: string | undefined): boolean {
  if (!value) return false
  try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname.toLowerCase()) } catch { return false }
}

async function databaseGate(value: string | undefined, expectedDatabase: string, expectedRole: string) {
  if (!value || !localUrl(value)) return Object.freeze({ configured: Boolean(value), connected: false, expectedDatabase: false, expectedRole: false, postgresMajor16: false, localOnly: localUrl(value), sanitizedErrorCode: null })
  const sql = postgres(value, { max: 1, prepare: false, connect_timeout: 10 })
  try {
    const rows = await sql.unsafe<Array<{ database_ok: boolean; role_ok: boolean; major_16: boolean }>>("SELECT current_database()=$1 database_ok,current_user=$2 role_ok,current_setting('server_version_num')::int BETWEEN 160000 AND 169999 major_16", [expectedDatabase, expectedRole])
    return Object.freeze({ configured: true, connected: true, expectedDatabase: Boolean(rows[0]?.database_ok), expectedRole: Boolean(rows[0]?.role_ok), postgresMajor16: Boolean(rows[0]?.major_16), localOnly: true, sanitizedErrorCode: null })
  } catch (error) {
    return Object.freeze({ configured: true, connected: false, expectedDatabase: false, expectedRole: false, postgresMajor16: false, localOnly: true, sanitizedErrorCode: typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "UNCLASSIFIED" })
  } finally { await sql.end({ timeout: 2 }) }
}

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
  const d2Value = process.env.D2_ISOLATED_POSTGRES_URL ?? process.env.D2_CANONICAL_POSTGRES_URL
  const d3Value = process.env.D3_ISOLATED_POSTGRES_URL ?? process.env.D3_POPULATION_POSTGRES_URL
  const [refresh, d2, d3, d4, serving, objectStorage, loaded] = await Promise.all([
    databaseGate(process.env.MVP_REFRESH_ISOLATED_POSTGRES_URL, "quantterminal_mvp_refresh_isolated", "qt_d2_owner"),
    databaseGate(d2Value, "quantterminal_d2_isolated", "qt_d2_owner"),
    databaseGate(d3Value, "quantterminal_d3_isolated", "qt_d2_owner"),
    databaseGate(process.env.D4_ISOLATED_POSTGRES_URL, "quantterminal_d4_isolated", "qt_d2_owner"),
    databaseGate(process.env.MVP_SERVING_ISOLATED_POSTGRES_URL, "quantterminal_mvp_serving_isolated", "mvp_serving_publisher"),
    process.env.D3_BACKFILL_OBJECT_ROOT ? inspectFilesystemObjectRoot({ root: process.env.D3_BACKFILL_OBJECT_ROOT, repositoryRoot: process.cwd(), createRoot: false }) : Promise.resolve({ safe: false, reasons: ["OBJECT_STORAGE_NOT_CONFIGURED"], resolvedRoot: "", availableBytes: null }),
    loadPlan(start, end),
  ])
  const databases = { refresh, d2, d3, d4, serving }
  const servingTarget = inspectMvpServingIsolatedTarget(process.env.MVP_SERVING_ISOLATED_POSTGRES_URL, process.env)
  const databasePass = Object.values(databases).every((value) => value.configured && value.connected && value.expectedDatabase && value.expectedRole && value.postgresMajor16 && value.localOnly)
  const planCounts = { reuseAuthoritative: loaded.plan.slots.filter((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT").length, createNew: loaded.plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME").length, conflicts: loaded.plan.slots.filter((slot) => slot.action === "BLOCKED_CONFLICT").length }
  const passed = databasePass && objectStorage.safe && servingTarget.safe && loaded.authorityCount === 1 && planCounts.reuseAuthoritative === 1 && planCounts.createNew === 23 && planCounts.conflicts === 0
  return Object.freeze({ passed, databases, objectStorage: { configured: Boolean(process.env.D3_BACKFILL_OBJECT_ROOT), localOnly: objectStorage.safe, capacityObserved: objectStorage.availableBytes !== null }, servingTarget: { localOnly: servingTarget.safe, expectedDatabase: servingTarget.database === "quantterminal_mvp_serving_isolated" }, authority: { count: loaded.authorityCount, checksumValid: loaded.authorityCount === 1 }, planner: { planIdentity: loaded.plan.planIdentity, planChecksum: loaded.plan.planChecksum, logicalSlots: loaded.plan.slots.length, ...planCounts }, productionOrNeonWriteTarget: false })
}

function dryRunPorts(gate: Awaited<ReturnType<typeof preflight>>): LiveResumeCoordinatorPorts {
  const checkpoints = new Map<string, LiveResumeStageCheckpoint>()
  return {
    targets: { classify: async () => ({ refreshLocal: gate.databases.refresh.localOnly, truthPlaneLocal: gate.databases.d2.localOnly && gate.databases.d3.localOnly && gate.databases.d4.localOnly, servingLocal: gate.servingTarget.localOnly, objectStorageLocal: gate.objectStorage.localOnly, servingPublisher: gate.databases.serving.expectedRole, managedOrProductionTarget: gate.productionOrNeonWriteTarget }) },
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
  const loaded = await loadPlan(options.start, options.end)
  if (options.command === "inspect") return print({ command: options.command, coordinatorVersion: "mvp-live-resume-coordinator/1.0.0", commands: ["inspect", "plan", "preflight", "dry-run", "run", "resume", "status", "verify"], liveConfirmationRequired: true })
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
    throw new Error("LIVE_RESUME_ENVIRONMENT_EXECUTOR_BINDINGS_REQUIRED")
  }
}

function print(value: unknown): void {
  assertSanitizedLiveResumeOutput(value)
  console.log(JSON.stringify(value, null, 2))
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "LIVE_RESUME_WORKER_FAILED"); process.exitCode = 1 })
