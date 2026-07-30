import {
  createBoundedArchiveRequest,
  createBoundedFundingRequest,
  createBoundedFundingSourceUrl,
  classifyCurrentCatchupExecutionState,
  createMvpRefreshClientFromEnvironment,
  CURRENT_MVP_CANDIDATE_BASELINE,
  inspectBoundedArchiveAvailability,
  inspectMvpRefreshConnectionFromEnvironment,
  MvpLiveResumeCoordinator,
  MvpRefreshMigrationRunner,
  MvpRefreshStore,
  MVP_REFRESH_SOURCE_AUDIT,
  parseCurrentCatchupWorkerOptions,
  planNextMvpRefresh,
  PostgresLiveResumeExecutionStore,
  PostgresLiveResumeCoordinatorControlPlane,
  readLiveResumeCandidateBaseline,
  preflightLocalLiveResumeEnvironment,
  preflightMvpRefreshClientFromEnvironment,
  runCurrentCandidateCatchup,
  runInitialBoundedRefresh,
  ControlledOhlcvRecoveryStore,
  type CurrentCatchupPorts,
  type CurrentCatchupSourceAvailability,
  type CurrentCatchupWindow,
  type RefreshLogicalDataset,
} from "@/lib/data-platform/mvp-refresh"
import { createProcessLiveResumeBindings } from "@/lib/data-platform/mvp-refresh/liveResumeLocalBootstrap"

type Command = "inspect-connection" | "preflight" | "migrate" | "plan" | "availability" | "run" | "resume" | "verify" | "build-candidate" | "compare" | "manifest" | "status" | "reset-isolated"

const CURRENT_CATCHUP_INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const)
const CURRENT_CATCHUP_DATASETS = Object.freeze(["ohlcv", "open-interest", "funding", "agg-trade"] as const)

async function mapCurrentCatchupBounded<T, R>(values: readonly T[], concurrency: 1 | 2, work: (value: T) => Promise<R>): Promise<readonly R[]> {
  const output: R[] = new Array(values.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor++
      output[index] = await work(values[index]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker))
  return Object.freeze(output)
}

function sourceContractVersion(dataset: Exclude<RefreshLogicalDataset, "funding">): string {
  return dataset === "ohlcv" ? "mvp-bounded-ohlcv/1.0.0" : dataset === "open-interest" ? "mvp-bounded-open-interest/1.0.0" : "mvp-bounded-agg-trade/1.0.0"
}

function maximumRecordCount(dataset: Exclude<RefreshLogicalDataset, "funding">): number {
  return dataset === "ohlcv" ? 288 : dataset === "open-interest" ? 10_000 : 10_000_000
}

async function inspectCurrentCatchupSources(window: CurrentCatchupWindow, plan: Parameters<CurrentCatchupPorts["inspectSources"]>[0]["plan"], maxConcurrency: 1 | 2): Promise<readonly CurrentCatchupSourceAvailability[]> {
  const slots = [...plan.slots]
  return mapCurrentCatchupBounded(slots, maxConcurrency, async (slot) => {
    try {
      if (slot.dataset === "funding") {
        const request = createBoundedFundingRequest({ provider: "binance-official-rest-funding-rate", instrument: slot.instrument, eventTimeStart: window.intervalStart, eventTimeEnd: window.intervalEnd, maximumEventCount: 1_000, requestedAt: new Date().toISOString() })
        const response = await fetch(createBoundedFundingSourceUrl(request), { cache: "no-store", signal: AbortSignal.timeout(20_000) })
        const header = response.headers.get("content-length")
        const length = header === null ? Number.NaN : Number(header)
        const contentLength = Number.isSafeInteger(length) && length >= 0 ? length : null
        const payload: unknown = response.ok ? await response.json() : null
        const rows = Array.isArray(payload) ? payload as Array<{ symbol?: unknown; fundingTime?: unknown; fundingRate?: unknown }> : []
        const timestamps = rows.map((row) => row.fundingTime)
        const valid = response.ok && rows.length > 0 && rows.length <= 1_000 && new Set(timestamps).size === rows.length && rows.every((row) => row.symbol === slot.instrument && Number.isSafeInteger(row.fundingTime) && Number(row.fundingTime) >= Date.parse(window.intervalStart) && Number(row.fundingTime) < Date.parse(window.intervalEnd) && typeof row.fundingRate === "string" && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(row.fundingRate) && Number.isFinite(Number(row.fundingRate)))
        return Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, status: valid ? "READY_FOR_DOWNLOAD" as const : "UNAVAILABLE" as const, reusableRawObjects: 0, contentLength, reason: valid ? null : "FUNDING_SOURCE_UNAVAILABLE" })
      }
      const request = createBoundedArchiveRequest({ dataset: slot.dataset, provider: "binance-vision", instrument: slot.instrument, eventTimeStart: window.intervalStart, eventTimeEnd: window.intervalEnd, sourceContractVersion: sourceContractVersion(slot.dataset), maximumRecordCount: maximumRecordCount(slot.dataset) })
      let contentLength: number | null = null
      const result = await inspectBoundedArchiveAvailability(request, async (input, init) => {
        const response = await fetch(input, init)
        const header = response.headers.get("content-length")
        const length = header === null ? Number.NaN : Number(header)
        contentLength = Number.isSafeInteger(length) && length >= 0 ? length : null
        return response
      })
      const ready = result.available && result.finalized && result.sourceClassification === "HTTP_SUCCESS"
      const status = ready ? "READY_FOR_DOWNLOAD" as const : result.limitationReason === "SOURCE_NOT_FINALIZED" ? "SOURCE_NOT_FINALIZED" as const : result.checksumState === "MISMATCH" ? "CHECKSUM_CONFLICT" as const : "UNAVAILABLE" as const
      return Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, status, reusableRawObjects: 0, contentLength, reason: ready ? null : result.limitationReason })
    } catch (error) {
      const reason = error instanceof Error ? error.message.split(":", 1)[0] : "SOURCE_INSPECTION_FAILED"
      return Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, status: reason.includes("CONTRACT") ? "CONTRACT_UNSUPPORTED" as const : reason.includes("CHECKSUM") || reason.includes("CONFLICT") ? "CHECKSUM_CONFLICT" as const : "UNAVAILABLE" as const, reusableRawObjects: 0, contentLength: null, reason })
    }
  })
}

async function runCurrentCatchup(argv: readonly string[]) {
  const options = parseCurrentCatchupWorkerOptions(argv)
  const environmentGate = await preflightLocalLiveResumeEnvironment(process.env)
  if (!environmentGate.passed) throw new Error("CURRENT_CATCHUP_LOCAL_PREFLIGHT_FAILED")
  const refresh = createMvpRefreshClientFromEnvironment()
  await refresh.verify()
  const store = new MvpRefreshStore(refresh)
  const recovery = new ControlledOhlcvRecoveryStore(refresh)
  const executions = new PostgresLiveResumeExecutionStore(refresh)
  const coordinatorControl = new PostgresLiveResumeCoordinatorControlPlane(refresh)
  const ports: CurrentCatchupPorts = {
    reconcile: async (window) => {
      const [attempts, authorities, existing] = await Promise.all([
        store.auditUnitsForWindow(window.intervalStart, window.intervalEnd),
        recovery.readAuthoritiesForWindow(window.intervalStart, window.intervalEnd),
        executions.readPersistedExecution(window.intervalStart, window.intervalEnd),
      ])
      return Object.freeze({
        attempts,
        authorities,
        ...(existing ? { existingExecution: Object.freeze({ plan: existing.plan, runId: existing.runId, unitIds: Object.freeze(existing.units.map((unit) => unit.unitId)) }) } : {}),
      })
    },
    inspectSources: async ({ window, plan, maxConcurrency }) => inspectCurrentCatchupSources(window, plan, maxConcurrency),
    readExecutionState: async (plan) => {
      const status = await executions.status(plan)
      const complete = status.persistedRunId ? await coordinatorControl.read(status.persistedRunId, "COMPLETE") : null
      const state = classifyCurrentCatchupExecutionState({ status, completeCheckpoint: complete?.state === "COMPLETE" ? "COMPLETE" : null })
      if (state === "NOT_STARTED" || state === "BLOCKED" || state === "INCOMPLETE") return Object.freeze({ state, candidateBaseline: null })
      if (!status.persistedRunId) throw new Error("CURRENT_CATCHUP_COMPLETE_RUN_MISSING")
      const candidate = await coordinatorControl.read(status.persistedRunId, "CANDIDATE_MEMBERSHIP_ASSEMBLED")
      if (!candidate || candidate.state !== "COMPLETE") throw new Error("CURRENT_CATCHUP_COMPLETE_CANDIDATE_CHECKPOINT_MISSING")
      return Object.freeze({ state: "COMPLETE" as const, candidateBaseline: readLiveResumeCandidateBaseline(candidate.output) })
    },
    execute: async ({ plan, intent, maxConcurrency, candidateBaseline }) => {
      // This branch remains wired for the separately required Serving exportability
      // certification. The fail-closed gate above prevents partial live catch-up.
      const bindings = await createProcessLiveResumeBindings({
        mode: "LIVE",
        environment: process.env,
        capabilities: environmentGate.capabilities,
        intervalStart: plan.intervalStart,
        intervalEnd: plan.intervalEnd,
        plannerIdentity: plan.planIdentity,
        plannerChecksum: plan.planChecksum,
        authorityPolicy: "FORBIDDEN",
        candidateBaseline,
      })
      try {
        return await new MvpLiveResumeCoordinator(bindings.ports).execute({ plan, allowedInstruments: CURRENT_CATCHUP_INSTRUMENTS, allowedDatasets: CURRENT_CATCHUP_DATASETS, mode: "LIVE", intent, maxConcurrency })
      } finally {
        await bindings.close?.()
      }
    },
  }
  try {
    const result = await runCurrentCandidateCatchup(options, ports)
    return Object.freeze({ ...result, environmentGate: Object.freeze({ passed: true as const, version: environmentGate.version, readyCapabilities: environmentGate.capabilities.filter((value) => value.callable).length, requiredCapabilities: environmentGate.capabilities.filter((value) => value.bindingName !== "candidate-activation").length, productionOrNeonWriteTarget: environmentGate.productionOrNeonWriteTarget }) })
  } finally {
    await refresh.shutdown()
  }
}

async function withClient<T>(work: (client: ReturnType<typeof createMvpRefreshClientFromEnvironment>) => Promise<T>): Promise<T> {
  const client = createMvpRefreshClientFromEnvironment()
  await client.verify()
  try { return await work(client) } finally { await client.shutdown() }
}

async function migrate() {
  return withClient(async (client) => {
    const result = await new MvpRefreshMigrationRunner(client).apply("mvp-8a-refresh-foundation")
    if (result.some((entry) => entry.status === "FAILED")) throw new Error("MVP_REFRESH_MIGRATION_FAILED")
    return result
  })
}

async function status() { return withClient(async (client) => new MvpRefreshStore(client).status()) }

async function reset() {
  if (process.argv[3] !== "--confirm-isolated") throw new Error("MVP_REFRESH_RESET_CONFIRMATION_REQUIRED")
  return withClient(async (client) => {
    await client.sql.unsafe("DROP SCHEMA IF EXISTS refresh_control CASCADE")
    return { status: "RESET", database: "quantterminal_mvp_refresh_isolated" }
  })
}

async function main() {
  if (process.argv[2] === "catch-up-current-candidate") return print({ command: "catch-up-current-candidate", result: await runCurrentCatchup(process.argv.slice(2)) })
  const command = process.argv[2] as Command
  if (command === "inspect-connection") return print({ command, result: inspectMvpRefreshConnectionFromEnvironment() })
  if (command === "preflight") return print({ command, result: await preflightMvpRefreshClientFromEnvironment() })
  if (command === "migrate") return print({ command, result: await migrate() })
  if (command === "plan") return print({ command, plan: planNextMvpRefresh() ?? { status: "NOOP", reason: "NO_CLOSED_WINDOW_AVAILABLE" } })
  if (command === "availability") return print({ command, sources: MVP_REFRESH_SOURCE_AUDIT, safeToAcquire: false, blockerReasonCodes: ["SOURCE_AVAILABILITY_INSPECTION_REQUIRED"] })
  if (command === "run") { await migrate(); return print({ command, result: await withClient((client) => runInitialBoundedRefresh(client)) }) }
  if (command === "resume") return print({ command, status: "BLOCKED", reason: "TERMINAL_BLOCKED_RUN_REQUIRES_NEW_PLAN" })
  if (command === "verify") return print({ command, status: "VERIFIED", controlPlane: await status(), productionMutation: false })
  if (["build-candidate", "compare", "manifest"].includes(command)) return print({ command, status: "BLOCKED", reasons: ["SOURCE_AVAILABILITY_INSPECTION_REQUIRED"], candidateActivation: false })
  if (command === "status") return print({ command, result: await status() })
  if (command === "reset-isolated") return print({ command, result: await reset() })
  throw new Error("Usage: runMvpRefresh.ts <catch-up-current-candidate --start=<UTC-midnight> --through=<UTC-midnight> --execution-mode=<dry-run|live> --confirm-local-inactive-candidate=<true|false> [--max-concurrency=<1|2>]|inspect-connection|preflight|migrate|plan|availability|run|resume|verify|build-candidate|compare|manifest|status|reset-isolated --confirm-isolated>")
}

function print(value: unknown): void { console.log(JSON.stringify(value, null, 2)) }
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_REFRESH_COMMAND_FAILED"); process.exitCode = 1 })
