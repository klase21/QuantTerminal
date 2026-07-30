import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createCertifiedLiveResumePlan, type CertifiedLiveResumePlan, type LiveResumeCandidateBaseline, type LiveResumeCoordinatorResult } from "./liveResumeCoordinator"
import { liveResumeRunIdentity } from "./liveResumePostgres"
import { CURRENT_MVP_CANDIDATE_BASELINE } from "./service"
import { buildRefreshSlotResumePlan, type RefreshLogicalDataset, type RefreshLogicalInstrument, type RefreshUnitAttemptAudit } from "./unitReconciliation"
import type { AuthoritativeSlotReconciliation } from "./controlledOhlcvRecovery"

export const CURRENT_CATCHUP_VERSION = "mvp-current-candidate-catchup/1.0.0" as const
export const CURRENT_CATCHUP_DAY_MS = 86_400_000
export const CURRENT_CATCHUP_MAX_CONCURRENCY = 2

export interface CurrentCatchupWorkerOptions {
  readonly command: "catch-up-current-candidate"
  readonly start: string
  readonly through: string
  readonly executionMode: "dry-run" | "live"
  readonly confirmLocalInactiveCandidate: boolean
  readonly maxConcurrency: 1 | 2
}

export interface CurrentCatchupWindow {
  readonly ordinal: number
  readonly intervalStart: string
  readonly intervalEnd: string
}

export interface CurrentCatchupSourceAvailability {
  readonly logicalSlotId: string
  readonly dataset: RefreshLogicalDataset
  readonly instrument: RefreshLogicalInstrument
  readonly status: "READY_FOR_DOWNLOAD" | "REUSE_CERTIFIED_EXISTING" | "SOURCE_NOT_FINALIZED" | "UNAVAILABLE" | "CHECKSUM_CONFLICT" | "CONTRACT_UNSUPPORTED"
  readonly reusableRawObjects: number
  readonly contentLength: number | null
  readonly reason: string | null
}

export interface CurrentCatchupReconciliation {
  readonly attempts: readonly RefreshUnitAttemptAudit[]
  readonly authorities: readonly AuthoritativeSlotReconciliation[]
  readonly existingExecution?: {
    readonly plan: CertifiedLiveResumePlan
    readonly runId: string
    readonly unitIds: readonly string[]
  }
}

export type CurrentCatchupExecutionState = "NOT_STARTED" | "INCOMPLETE" | "COMPLETE" | "BLOCKED"

export interface CurrentCatchupPorts {
  reconcile(window: CurrentCatchupWindow): Promise<CurrentCatchupReconciliation>
  inspectSources(input: { readonly window: CurrentCatchupWindow; readonly plan: CertifiedLiveResumePlan; readonly maxConcurrency: 1 | 2 }): Promise<readonly CurrentCatchupSourceAvailability[]>
  readExecutionState(plan: CertifiedLiveResumePlan): Promise<{ readonly state: CurrentCatchupExecutionState; readonly candidateBaseline: LiveResumeCandidateBaseline | null }>
  execute(input: { readonly plan: CertifiedLiveResumePlan; readonly intent: "RUN" | "RESUME"; readonly maxConcurrency: 1 | 2; readonly candidateBaseline: CurrentCatchupBaselineCursor }): Promise<LiveResumeCoordinatorResult>
}

export interface CurrentCatchupBaselineCursor {
  readonly candidateId: string
  readonly candidateChecksum: string
  readonly governedThrough: string
  readonly sourceLineageIdentity: string
}

export interface CurrentCatchupDayReport {
  readonly ordinal: number
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly planId: string
  readonly planChecksum: string
  readonly runId: string
  readonly sourceSlots: number
  readonly readySourceSlots: number
  readonly reusableRawObjects: number
  readonly estimatedDownloadBytes: number
  readonly sourceStatusCounts: Readonly<Record<string, number>>
  readonly baselineCursor: { readonly kind: "CERTIFIED_CANDIDATE" | "PREDECESSOR_EXECUTION"; readonly identity: string }
  readonly executionState: "PLANNED" | "COMPLETE" | "BLOCKED"
  readonly candidateExposed: false
}

export interface CurrentCatchupResult {
  readonly version: typeof CURRENT_CATCHUP_VERSION
  readonly status: "DRY_RUN" | "COMPLETE" | "BLOCKED"
  readonly catchupId: string
  readonly baseline: typeof CURRENT_MVP_CANDIDATE_BASELINE
  readonly requestedStart: string
  readonly requestedThrough: string
  readonly windowCount: number
  readonly logicalSlotCount: number
  readonly readySourceSlotCount: number
  readonly sourceStatusCounts: Readonly<Record<CurrentCatchupSourceAvailability["status"], number>>
  readonly estimatedDownloadBytes: number
  readonly contiguousSourceReadyThrough: string
  readonly completedThrough: string
  readonly days: readonly CurrentCatchupDayReport[]
  readonly commands: {
    readonly live: string
    readonly resume: string
    readonly resumeBehavior: "AUTO_RESUME_DETERMINISTIC_INCOMPLETE_RUN"
  }
  readonly operationalMutationCalls: number
  readonly retainedPayloadBytes: number
  readonly candidateExposed: false
  readonly blocker: string | null
}

function option(argv: readonly string[], name: string): string | undefined {
  const prefix = `--${name}=`
  const inline = argv.find((value) => value.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = argv.indexOf(`--${name}`)
  return index >= 0 ? argv[index + 1] : undefined
}

function exactUtcMidnight(value: string, code: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value || timestamp % CURRENT_CATCHUP_DAY_MS !== 0) throw new Error(code)
  return value
}

export function parseCurrentCatchupWorkerOptions(argv: readonly string[]): CurrentCatchupWorkerOptions {
  if (argv[0] !== "catch-up-current-candidate") throw new Error("CURRENT_CATCHUP_COMMAND_INVALID")
  const start = exactUtcMidnight(option(argv, "start") ?? "", "CURRENT_CATCHUP_START_EXACT_UTC_MIDNIGHT_REQUIRED")
  const through = exactUtcMidnight(option(argv, "through") ?? "", "CURRENT_CATCHUP_THROUGH_EXACT_UTC_MIDNIGHT_REQUIRED")
  const executionMode = option(argv, "execution-mode")
  const maximum = Number(option(argv, "max-concurrency") ?? "2")
  if (executionMode !== "dry-run" && executionMode !== "live") throw new Error("CURRENT_CATCHUP_EXECUTION_MODE_INVALID")
  if (maximum !== 1 && maximum !== 2) throw new Error("CURRENT_CATCHUP_CONCURRENCY_INVALID")
  const confirmationArguments = argv.filter((value) => value.startsWith("--confirm-local-inactive-candidate"))
  if (confirmationArguments.length !== 1 || !/^--confirm-local-inactive-candidate=(?:true|false)$/.test(confirmationArguments[0]!)) throw new Error("CURRENT_CATCHUP_CONFIRMATION_FLAG_INVALID")
  const confirmLocalInactiveCandidate = option(argv, "confirm-local-inactive-candidate") === "true"
  if (executionMode === "live" && !confirmLocalInactiveCandidate) throw new Error("CURRENT_CATCHUP_LIVE_CONFIRMATION_REQUIRED")
  if (start !== CURRENT_MVP_CANDIDATE_BASELINE.governedThrough) throw new Error("CURRENT_CATCHUP_BASELINE_WATERMARK_MISMATCH")
  if (Date.parse(through) <= Date.parse(start)) throw new Error("CURRENT_CATCHUP_WINDOW_INVALID")
  return Object.freeze({ command: "catch-up-current-candidate", start, through, executionMode, confirmLocalInactiveCandidate, maxConcurrency: maximum })
}

export function expandCurrentCatchupWindows(start: string, through: string): readonly CurrentCatchupWindow[] {
  const from = Date.parse(exactUtcMidnight(start, "CURRENT_CATCHUP_START_EXACT_UTC_MIDNIGHT_REQUIRED"))
  const to = Date.parse(exactUtcMidnight(through, "CURRENT_CATCHUP_THROUGH_EXACT_UTC_MIDNIGHT_REQUIRED"))
  if (to <= from) throw new Error("CURRENT_CATCHUP_WINDOW_INVALID")
  return Object.freeze(Array.from({ length: (to - from) / CURRENT_CATCHUP_DAY_MS }, (_, ordinal) => Object.freeze({
    ordinal,
    intervalStart: new Date(from + ordinal * CURRENT_CATCHUP_DAY_MS).toISOString(),
    intervalEnd: new Date(from + (ordinal + 1) * CURRENT_CATCHUP_DAY_MS).toISOString(),
  })))
}

export function currentCatchupIdentity(start: string, through: string): { readonly catchupId: string; readonly checksum: string } {
  const basis = { version: CURRENT_CATCHUP_VERSION, start, through, baseline: CURRENT_MVP_CANDIDATE_BASELINE }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ catchupId: `mrcc_${checksum}`, checksum })
}

export function createCurrentCatchupDayPlan(input: { readonly catchupId: string; readonly window: CurrentCatchupWindow; readonly reconciliation: CurrentCatchupReconciliation; readonly predecessor?: { readonly planId: string; readonly runId: string; readonly governedThrough: string } | null }): CertifiedLiveResumePlan {
  if (!/^mrcc_[0-9a-f]{64}$/.test(input.catchupId)) throw new Error("CURRENT_CATCHUP_ID_INVALID")
  if (input.reconciliation.existingExecution) {
    const existing = input.reconciliation.existingExecution
    const context = existing.plan.currentCatchup
    if (existing.plan.executionProfile !== "CURRENT_CANDIDATE_CATCHUP" || context?.catchupId !== input.catchupId || context.dayOrdinal !== input.window.ordinal || existing.plan.intervalStart !== input.window.intervalStart || existing.plan.intervalEnd !== input.window.intervalEnd || canonicalChecksum(context.baseline) !== canonicalChecksum(CURRENT_MVP_CANDIDATE_BASELINE) || canonicalChecksum(context.predecessor) !== canonicalChecksum(input.predecessor ?? null) || liveResumeRunIdentity(existing.plan).runId !== existing.runId || input.reconciliation.authorities.length !== 0) throw new Error("CURRENT_CATCHUP_EXISTING_EXECUTION_CONFLICT")
    const expectedUnits = new Set(existing.plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME").map((slot) => `${slot.dataset}:${slot.instrument}`))
    if (expectedUnits.size !== 24 || existing.unitIds.length > 24 || input.reconciliation.attempts.some((attempt) => attempt.runId !== existing.runId || !existing.unitIds.includes(attempt.unitId) || !expectedUnits.has(`${attempt.dataset}:${attempt.instrument}`))) throw new Error("CURRENT_CATCHUP_EXISTING_EXECUTION_CONFLICT")
    return existing.plan
  }
  if (input.reconciliation.attempts.length || input.reconciliation.authorities.length) throw new Error("CURRENT_CATCHUP_PREEXISTING_LINEAGE_CONFLICT")
  const slots = buildRefreshSlotResumePlan({
    intervalStart: input.window.intervalStart,
    intervalEnd: input.window.intervalEnd,
    attempts: input.reconciliation.attempts,
    authoritativeResolutions: input.reconciliation.authorities,
    sourceFinalizationState: "SOURCE_AVAILABLE",
  })
  return createCertifiedLiveResumePlan({
    intervalStart: input.window.intervalStart,
    intervalEnd: input.window.intervalEnd,
    slots,
    executionProfile: "CURRENT_CANDIDATE_CATCHUP",
    currentCatchup: {
      version: "mvp-current-catchup-plan-context/1.0.0",
      catchupId: input.catchupId,
      dayOrdinal: input.window.ordinal,
      baseline: CURRENT_MVP_CANDIDATE_BASELINE,
      predecessor: input.predecessor ?? null,
    },
  })
}

const SOURCE_STATUSES = Object.freeze(["READY_FOR_DOWNLOAD", "REUSE_CERTIFIED_EXISTING", "SOURCE_NOT_FINALIZED", "UNAVAILABLE", "CHECKSUM_CONFLICT", "CONTRACT_UNSUPPORTED"] as const)

function emptySourceStatusCounts(): Record<CurrentCatchupSourceAvailability["status"], number> {
  return Object.fromEntries(SOURCE_STATUSES.map((status) => [status, 0])) as Record<CurrentCatchupSourceAvailability["status"], number>
}

function verifySourceAvailability(plan: CertifiedLiveResumePlan, rows: readonly CurrentCatchupSourceAvailability[]): { readonly ready: number; readonly reusableRawObjects: number; readonly estimatedDownloadBytes: number; readonly counts: Readonly<Record<CurrentCatchupSourceAvailability["status"], number>> } {
  const bySlot = new Map<string, CurrentCatchupSourceAvailability>()
  for (const row of rows) {
    if (bySlot.has(row.logicalSlotId)) throw new Error("CURRENT_CATCHUP_SOURCE_AVAILABILITY_DUPLICATE")
    bySlot.set(row.logicalSlotId, row)
  }
  if (rows.length !== plan.slots.length || plan.slots.some((slot) => {
    const row = bySlot.get(slot.logicalSlotId)
    return !row || row.dataset !== slot.dataset || row.instrument !== slot.instrument
  })) throw new Error("CURRENT_CATCHUP_SOURCE_AVAILABILITY_GRAPH_INVALID")
  const counts = emptySourceStatusCounts()
  for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1
  const ready = rows.filter((row) => row.status === "READY_FOR_DOWNLOAD" || row.status === "REUSE_CERTIFIED_EXISTING").length
  const reusableRawObjects = rows.reduce((total, row) => total + row.reusableRawObjects, 0)
  const estimatedDownloadBytes = rows.reduce((total, row) => total + (row.status === "READY_FOR_DOWNLOAD" ? row.contentLength ?? 0 : 0), 0)
  if (rows.some((row) => row.status === "REUSE_CERTIFIED_EXISTING" && row.reusableRawObjects < 1)) throw new Error("CURRENT_CATCHUP_REUSE_EVIDENCE_MISSING")
  return Object.freeze({ ready, reusableRawObjects, estimatedDownloadBytes, counts: Object.freeze(counts) })
}

function command(options: CurrentCatchupWorkerOptions): string {
  return `npx.cmd tsx workers/data-platform/runMvpRefresh.ts catch-up-current-candidate --start=${options.start} --through=${options.through} --execution-mode=live --confirm-local-inactive-candidate=true --max-concurrency=${options.maxConcurrency}`
}

function verifyAdvancedCandidate(candidate: LiveResumeCandidateBaseline | null, window: CurrentCatchupWindow): LiveResumeCandidateBaseline {
  if (!candidate || candidate.governedThrough !== window.intervalEnd || candidate.commonWatermarkValue !== window.intervalEnd || candidate.sourceLineageIdentity.length === 0) throw new Error("CURRENT_CATCHUP_COMPLETED_CANDIDATE_INVALID")
  return candidate
}

export async function runCurrentCandidateCatchup(options: CurrentCatchupWorkerOptions, ports: CurrentCatchupPorts): Promise<CurrentCatchupResult> {
  if (options.executionMode === "live" && !options.confirmLocalInactiveCandidate) throw new Error("CURRENT_CATCHUP_LIVE_CONFIRMATION_REQUIRED")
  if (options.maxConcurrency < 1 || options.maxConcurrency > CURRENT_CATCHUP_MAX_CONCURRENCY) throw new Error("CURRENT_CATCHUP_CONCURRENCY_INVALID")
  const windows = expandCurrentCatchupWindows(options.start, options.through)
  const identity = currentCatchupIdentity(options.start, options.through)
  const days: CurrentCatchupDayReport[] = []
  let contiguousSourceReadyThrough = options.start
  let completedThrough = options.start
  let readySourceSlotCount = 0
  const sourceStatusCounts = emptySourceStatusCounts()
  let estimatedDownloadBytes = 0
  let operationalMutationCalls = 0
  let blocker: string | null = null
  let previousPlan: CertifiedLiveResumePlan | null = null
  let candidateBaseline: CurrentCatchupBaselineCursor = CURRENT_MVP_CANDIDATE_BASELINE

  for (const window of windows) {
    const reconciliation = await ports.reconcile(window)
    const predecessor = previousPlan ? Object.freeze({ planId: previousPlan.planIdentity, runId: liveResumeRunIdentity(previousPlan).runId, governedThrough: window.intervalStart }) : null
    const plan = createCurrentCatchupDayPlan({ catchupId: identity.catchupId, window, reconciliation, predecessor })
    const runId = liveResumeRunIdentity(plan).runId
    const availability = await ports.inspectSources({ window, plan, maxConcurrency: options.maxConcurrency })
    const source = verifySourceAvailability(plan, availability)
    readySourceSlotCount += source.ready
    estimatedDownloadBytes += source.estimatedDownloadBytes
    for (const status of SOURCE_STATUSES) sourceStatusCounts[status] += source.counts[status]
    const allReady = source.ready === plan.slots.length
    if (allReady && contiguousSourceReadyThrough === window.intervalStart) contiguousSourceReadyThrough = window.intervalEnd
    const baselineCursor = options.executionMode === "live" || window.ordinal === 0
      ? Object.freeze({ kind: "CERTIFIED_CANDIDATE" as const, identity: candidateBaseline.candidateId })
      : Object.freeze({ kind: "PREDECESSOR_EXECUTION" as const, identity: predecessor!.runId })
    const base = { ordinal: window.ordinal, intervalStart: window.intervalStart, intervalEnd: window.intervalEnd, planId: plan.planIdentity, planChecksum: plan.planChecksum, runId, sourceSlots: availability.length, readySourceSlots: source.ready, reusableRawObjects: source.reusableRawObjects, estimatedDownloadBytes: source.estimatedDownloadBytes, sourceStatusCounts: source.counts, baselineCursor, candidateExposed: false as const }
    if (!allReady) {
      const blockedSource = availability.find((row) => row.status !== "READY_FOR_DOWNLOAD" && row.status !== "REUSE_CERTIFIED_EXISTING")
      blocker = `CURRENT_CATCHUP_SOURCE_${blockedSource?.status ?? "AVAILABILITY_INCOMPLETE"}`
      days.push(Object.freeze({ ...base, executionState: "BLOCKED" }))
      break
    }
    if (options.executionMode === "dry-run") {
      days.push(Object.freeze({ ...base, executionState: "PLANNED" }))
      previousPlan = plan
      continue
    }
    const inspection = await ports.readExecutionState(plan)
    if (inspection.state === "BLOCKED") {
      blocker = "CURRENT_CATCHUP_EXISTING_EXECUTION_BLOCKED"
      days.push(Object.freeze({ ...base, executionState: "BLOCKED" }))
      break
    }
    if (inspection.state === "COMPLETE") {
      candidateBaseline = verifyAdvancedCandidate(inspection.candidateBaseline, window)
      completedThrough = window.intervalEnd
      days.push(Object.freeze({ ...base, executionState: "COMPLETE" }))
      previousPlan = plan
      continue
    }
    operationalMutationCalls += 1
    const result = await ports.execute({ plan, intent: inspection.state === "INCOMPLETE" ? "RESUME" : "RUN", maxConcurrency: options.maxConcurrency, candidateBaseline })
    if (result.status !== "COMPLETE" || result.commonWatermark !== window.intervalEnd || result.candidateExposed !== false) {
      blocker = "CURRENT_CATCHUP_DAY_NOT_COMPLETE"
      days.push(Object.freeze({ ...base, executionState: "BLOCKED" }))
      break
    }
    candidateBaseline = verifyAdvancedCandidate(result.candidateBaseline ?? null, window)
    completedThrough = window.intervalEnd
    days.push(Object.freeze({ ...base, executionState: "COMPLETE" }))
    previousPlan = plan
  }

  const liveCommand = command(options)
  const status = blocker ? "BLOCKED" : options.executionMode === "dry-run" ? "DRY_RUN" : completedThrough === options.through ? "COMPLETE" : "BLOCKED"
  return Object.freeze({
    version: CURRENT_CATCHUP_VERSION,
    status,
    catchupId: identity.catchupId,
    baseline: CURRENT_MVP_CANDIDATE_BASELINE,
    requestedStart: options.start,
    requestedThrough: options.through,
    windowCount: windows.length,
    logicalSlotCount: windows.length * 24,
    readySourceSlotCount,
    sourceStatusCounts: Object.freeze(sourceStatusCounts),
    estimatedDownloadBytes,
    contiguousSourceReadyThrough,
    completedThrough,
    days: Object.freeze(days),
    commands: Object.freeze({ live: liveCommand, resume: liveCommand, resumeBehavior: "AUTO_RESUME_DETERMINISTIC_INCOMPLETE_RUN" }),
    operationalMutationCalls,
    retainedPayloadBytes: 0,
    candidateExposed: false,
    blocker: blocker ?? (status === "BLOCKED" ? "CURRENT_CATCHUP_INCOMPLETE" : null),
  })
}
