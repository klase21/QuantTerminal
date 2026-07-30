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
  parseBackfillDoctorOptions,
  runBackfillDoctor,
  currentCatchupProcessExitCode,
  type BackfillDoctorPorts,
  type CurrentCatchupPorts,
  type CurrentCatchupSourceAvailability,
  type CurrentCatchupWindow,
  type RefreshLogicalDataset,
} from "@/lib/data-platform/mvp-refresh"
import { createProcessLiveResumeBindings } from "@/lib/data-platform/mvp-refresh/liveResumeLocalBootstrap"
import {
  classifyPre005D3Structure,
  createCurrentCatchupSchemaRepairPort,
  createDurableD3PostgresClientFromEnvironment,
  discoverD3Migrations,
  isExactPost005CurrentCatchupStructure,
  repairCurrentCatchupSchema,
} from "@/lib/data-platform/population/postgres"

type Command = "inspect-connection" | "preflight" | "migrate" | "plan" | "availability" | "run" | "resume" | "verify" | "build-candidate" | "compare" | "manifest" | "status" | "reset-isolated" | "repair-current-catchup-d3-schema" | "backfill-doctor"

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

function createCurrentCatchupD3Client(roleIntent: "MIGRATION_OWNER" | "READ_ONLY", applicationName: string) {
  return createDurableD3PostgresClientFromEnvironment(
    { roleIntent, maxConnections: 1, applicationName, targetPurpose: "INTEGRATED_BACKFILL" },
    process.env,
  )
}

async function requireCurrentCatchupD3Identity(client: ReturnType<typeof createCurrentCatchupD3Client>): Promise<void> {
  const rows = await client.sql.unsafe<Array<{ readonly database_ok: boolean; readonly role_ok: boolean; readonly version_ok: boolean }>>(
    "SELECT current_database()='quantterminal_backfill' database_ok,current_user='qt_d3_backfill_owner' role_ok,current_setting('server_version_num')::int BETWEEN 160000 AND 169999 version_ok",
  )
  if (!rows[0]?.database_ok) throw new Error("CURRENT_CATCHUP_D3_DATABASE_MISMATCH")
  if (!rows[0]?.role_ok) throw new Error("CURRENT_CATCHUP_D3_ROLE_MISMATCH")
  if (!rows[0]?.version_ok) throw new Error("CURRENT_CATCHUP_D3_POSTGRES_VERSION_MISMATCH")
}

async function repairCurrentCatchupD3Schema(argv: readonly string[]) {
  if (argv.length !== 2 || argv[0] !== "repair-current-catchup-d3-schema" || argv[1] !== "--confirm-apply-migration-005=true") throw new Error("CURRENT_CATCHUP_D3_REPAIR_CONFIRMATION_REQUIRED")
  const client = createCurrentCatchupD3Client("MIGRATION_OWNER", "mvp-current-catchup-d3-schema-repair")
  try {
    await requireCurrentCatchupD3Identity(client)
    const port = await createCurrentCatchupSchemaRepairPort(client)
    const artifacts = await discoverD3Migrations()
    const artifactChecksums = new Map(artifacts.map((artifact) => [artifact.migrationId, artifact.checksum]))
    const beforeLedger = await port.readLedger()
    const beforeStructure = await port.inspectPre005Structure()
    const structureState = classifyPre005D3Structure(beforeStructure)
    const historicalChecksumMismatches = beforeLedger.filter((entry) => ["001", "002", "003", "004"].includes(entry.migrationId) && artifactChecksums.get(entry.migrationId) !== entry.checksum).length
    const result = await repairCurrentCatchupSchema(port, "mvp-current-catchup-d3-schema-repair")
    const [afterLedger, afterStructure] = await Promise.all([port.readLedger(), port.inspectPre005Structure()])
    const beforeHistorical = beforeLedger.filter((entry) => ["001", "002", "003", "004"].includes(entry.migrationId))
    const afterHistorical = afterLedger.filter((entry) => ["001", "002", "003", "004"].includes(entry.migrationId))
    if (JSON.stringify(beforeHistorical) !== JSON.stringify(afterHistorical)) throw new Error("CURRENT_CATCHUP_D3_HISTORICAL_LEDGER_MUTATED")
    const migration005 = afterLedger.filter((entry) => entry.migrationId === "005")
    if (migration005.length !== 1 || !isExactPost005CurrentCatchupStructure(afterStructure)) throw new Error("CURRENT_CATCHUP_D3_005_VERIFICATION_FAILED")
    return Object.freeze({
      status: result.status === "REPAIRED" ? "APPLIED" as const : "ALREADY_APPLIED" as const,
      structuralContract: structureState === "EXACT" ? "STRUCTURALLY_COMPATIBLE" as const : structureState,
      migrationId: result.migrationId,
      migrationChecksum: result.checksum,
      historicalChecksumMismatches,
      historicalLedgerRowsModified: 0,
      migration005LedgerRows: 1,
      productionMutation: false,
      neonMutation: false,
    })
  } finally {
    await client.shutdown()
  }
}

async function runCurrentCatchupBackfillDoctor(argv: readonly string[]) {
  const options = parseBackfillDoctorOptions(argv.slice(1))
  const refresh = createMvpRefreshClientFromEnvironment()
  const d3 = createCurrentCatchupD3Client("READ_ONLY", "mvp-current-catchup-backfill-doctor")
  await Promise.all([refresh.verify(), requireCurrentCatchupD3Identity(d3)])
  const executions = new PostgresLiveResumeExecutionStore(refresh)
  const d3Port = await createCurrentCatchupSchemaRepairPort(d3)
  const ports: BackfillDoctorPorts = {
    preflightEnvironment: async ({ requiredEnvironmentNames }) => {
      const missingEnvironmentNames = requiredEnvironmentNames.filter((name) => !process.env[name]?.trim())
      if (missingEnvironmentNames.length) return Object.freeze({ passed: false, missingEnvironmentNames: Object.freeze(missingEnvironmentNames), diagnostics: Object.freeze([]) })
      const preflight = await preflightLocalLiveResumeEnvironment(process.env)
      return Object.freeze({
        passed: preflight.passed,
        missingEnvironmentNames: Object.freeze([]),
        diagnostics: Object.freeze(preflight.capabilities.filter((capability) => capability.bindingName !== "candidate-activation" && capability.diagnostic !== "READY").map((capability) => `${capability.bindingName.toUpperCase().replaceAll("-", "_")}_${capability.diagnostic}`)),
      })
    },
    inspectD3Schema: async () => {
      const [structure, ledger] = await Promise.all([d3Port.inspectPre005Structure(), d3Port.readLedger()])
      const migration005 = ledger.find((entry) => entry.migrationId === "005")
      const artifact005 = (await discoverD3Migrations()).find((entry) => entry.migrationId === "005")
      const ready = classifyPre005D3Structure(structure) === "EXACT" && isExactPost005CurrentCatchupStructure(structure) && Boolean(migration005 && artifact005 && migration005.checksum === artifact005.checksum)
      return Object.freeze({ passedThroughMigration: ready ? 5 : 4, diagnostic: ready ? null : "D3_SCHEMA_THROUGH_005_REQUIRED" })
    },
    inspectRun: async ({ runId, start, through }) => {
      const execution = await executions.readPersistedExecution(start, through)
      const snapshot = execution ? await executions.status(execution.plan) : null
      const terminalUnitCount = snapshot ? Object.entries(snapshot.unitCountsByState).filter(([state]) => !["PENDING", "LEASED", "ACQUIRED", "NORMALIZED", "COMMITTED", "VALIDATED", "MATERIALIZED", "COMPLETE"].includes(state)).reduce((total, [, count]) => total + count, 0) : 0
      return Object.freeze({
        runId: execution?.runId ?? null,
        executionGenerationState: snapshot?.disposition ?? null,
        resumeEligible: snapshot?.resumeEligible ?? false,
        leaseState: snapshot?.leaseState ?? "ABSENT",
        persistedUnitCount: snapshot?.persistedUnitCount ?? 0,
        recoverableSlots: snapshot?.recoverableSlots ?? 0,
        blockedSlots: snapshot?.blockedSlots ?? 0,
        unitCountsByState: snapshot?.unitCountsByState ?? Object.freeze({}),
        terminalUnitCount,
        retainedArtifacts: Object.freeze({ count: snapshot?.retainedArtifacts ?? 0, allAttributedToRun: execution?.runId === runId }),
        candidateCount: snapshot?.retainedCandidates ?? 0,
        commonWatermark: snapshot?.commonWatermark ?? null,
      })
    },
    inspectProviderAvailability: async ({ start, through }) => {
      const execution = await executions.readPersistedExecution(start, through)
      if (!execution) return Object.freeze({ available: false, diagnostic: "PROVIDERS_EXECUTION_PLAN_MISSING" })
      const sources = await inspectCurrentCatchupSources({ ordinal: 0, intervalStart: start, intervalEnd: through }, execution.plan, 2)
      const available = sources.length === 24 && sources.every((source) => source.status === "READY_FOR_DOWNLOAD" || source.status === "REUSE_CERTIFIED_EXISTING")
      return Object.freeze({ available, diagnostic: available ? null : "PROVIDERS_ONE_DAY_WINDOW_UNAVAILABLE" })
    },
  }
  try {
    return await runBackfillDoctor(options, ports)
  } finally {
    await Promise.all([refresh.shutdown(), d3.shutdown()])
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
  if (process.argv[2] === "catch-up-current-candidate") {
    const result = await runCurrentCatchup(process.argv.slice(2))
    process.exitCode = currentCatchupProcessExitCode(result.status)
    return print({ command: "catch-up-current-candidate", result })
  }
  const command = process.argv[2] as Command
  if (command === "repair-current-catchup-d3-schema") return print({ command, result: await repairCurrentCatchupD3Schema(process.argv.slice(2)) })
  if (command === "backfill-doctor") {
    const result = await runCurrentCatchupBackfillDoctor(process.argv.slice(2))
    process.exitCode = result.status === "READY" ? 0 : 1
    return print({ command, result })
  }
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
  throw new Error("Usage: runMvpRefresh.ts <catch-up-current-candidate --start=<UTC-midnight> --through=<UTC-midnight> --execution-mode=<dry-run|live> --confirm-local-inactive-candidate=<true|false> [--max-concurrency=<1|2>]|repair-current-catchup-d3-schema --confirm-apply-migration-005=true|backfill-doctor --start=<UTC-midnight> --through=<UTC-midnight>|inspect-connection|preflight|migrate|plan|availability|run|resume|verify|build-candidate|compare|manifest|status|reset-isolated --confirm-isolated>")
}

function print(value: unknown): void { console.log(JSON.stringify(value, null, 2)) }
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_REFRESH_COMMAND_FAILED"); process.exitCode = 1 })
