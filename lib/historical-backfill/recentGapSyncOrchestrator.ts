import { runBinanceVisionAggTradeBackfill } from "@/lib/historical-backfill/aggTradeBackfill"
import { runBinanceRestFundingRecentGap } from "@/lib/historical-backfill/fundingRecentGapBackfill"
import { runBinanceVisionLiquidationBackfill } from "@/lib/historical-backfill/liquidationBackfill"
import { runBinanceVisionOpenInterestBackfill } from "@/lib/historical-backfill/openInterestBackfill"
import { planRecentGapSync } from "@/lib/historical-backfill/recentGapSyncPlanner"
import type {
  RecentGapSyncExecutionOptions,
  RecentGapSyncJobPlan,
  RecentGapSyncJobResult,
  RecentGapSyncResult,
} from "@/lib/historical-backfill/recentGapSyncTypes"

const DAY_MS = 86_400_000
const FUNDING_INTERVAL_MS = DAY_MS / 3

function result(input: RecentGapSyncResult): RecentGapSyncResult {
  return Object.freeze({
    ...input,
    jobs: Object.freeze([...input.jobs]),
    affectedUtcDays: Object.freeze([...input.affectedUtcDays]),
    projectionRefreshDays: Object.freeze([...input.projectionRefreshDays]),
    errors: Object.freeze([...input.errors]),
  })
}

function completedArchiveDays(plan: RecentGapSyncJobPlan): readonly string[] {
  const target = Date.parse(plan.targetEndTime)
  return Object.freeze(plan.affectedUtcDays.filter((day) => Date.parse(`${day}T00:00:00.000Z`) + DAY_MS <= target))
}

function jobResult(
  plan: RecentGapSyncJobPlan,
  status: RecentGapSyncJobResult["status"],
  attemptedUtcDays: readonly string[] = [],
  projectionRefreshDays: readonly string[] = [],
  recordsWritten = 0,
  duplicateRecords = 0,
  errors: readonly string[] = [],
): RecentGapSyncJobResult {
  return Object.freeze({
    jobId: plan.jobId,
    dataset: plan.dataset,
    status,
    attemptedUtcDays: Object.freeze([...attemptedUtcDays]),
    projectionRefreshDays: Object.freeze([...projectionRefreshDays]),
    recordsWritten,
    duplicateRecords,
    errors: Object.freeze([...errors]),
  })
}

async function dispatchBoundedJob(
  plan: RecentGapSyncJobPlan,
  options: RecentGapSyncExecutionOptions & { readonly repository: NonNullable<RecentGapSyncExecutionOptions["repository"]>; readonly recordedAt: string },
): Promise<RecentGapSyncJobResult> {
  if (!plan.executionSupported) return jobResult(plan, "UNSUPPORTED", [], [], 0, 0, [plan.executionBlocker ?? "Bounded runner is unavailable."])
  if (plan.dataset === "HISTORICAL_FUNDING") {
    if (!plan.missingWindowStart) return jobResult(plan, "SKIPPED", [], [], 0, 0, ["No missing finalized Funding event is inside the planned gap."])
    const alignedStart = Math.floor(Date.parse(plan.missingWindowStart) / FUNDING_INTERVAL_MS) * FUNDING_INTERVAL_MS
    const run = await runBinanceRestFundingRecentGap({
      repository: options.repository,
      recordedAt: options.recordedAt,
      symbol: plan.symbol,
      startTime: new Date(alignedStart).toISOString(),
      endTime: plan.missingWindowEnd,
      fetchImpl: options.fetchImpl,
    })
    return jobResult(
      plan,
      run.status === "DUPLICATE" ? "DUPLICATE" : run.status === "SUCCESS" ? "SUCCESS" : "FAILED",
      run.affectedUtcDays,
      run.status === "SUCCESS" || run.status === "DUPLICATE" ? run.affectedUtcDays : [],
      run.persistedCount,
      run.duplicateWriteCount,
      run.errors,
    )
  }
  if (plan.dataset === "HISTORICAL_LIQUIDATION" && !options.includeExperimentalLiquidation) {
    return jobResult(plan, "SKIPPED", [], [], 0, 0, ["Experimental Liquidation sync requires explicit inclusion."])
  }
  const days = completedArchiveDays(plan)
  if (!days.length) return jobResult(plan, "SKIPPED", [], [], 0, 0, ["No completed UTC archive day is inside the planned gap."])
  const maxDays = options.maxUtcDaysPerDataset ?? 7
  if (!Number.isInteger(maxDays) || maxDays <= 0 || days.length > maxDays) {
    return jobResult(plan, "FAILED", [], [], 0, 0, [`Planned ${days.length} UTC days exceeds maxUtcDaysPerDataset ${maxDays}.`])
  }

  let written = 0
  let duplicates = 0
  const refreshed: string[] = []
  const errors: string[] = []
  let allDuplicate = true
  for (const day of days) {
    if (plan.dataset === "HISTORICAL_OPEN_INTEREST") {
      const run = await runBinanceVisionOpenInterestBackfill({ repository: options.repository, recordedAt: options.recordedAt, symbol: plan.symbol, day, fetchImpl: options.fetchImpl })
      written += run.persistedCount
      duplicates += run.duplicateWriteCount
      if (run.status === "SUCCESS" || run.status === "DUPLICATE") refreshed.push(day)
      else errors.push(...run.errors.map((error) => `${day}: ${error}`))
      if (run.status !== "DUPLICATE") allDuplicate = false
      continue
    }
    if (plan.dataset === "HISTORICAL_AGG_TRADE") {
      const run = await runBinanceVisionAggTradeBackfill({ repository: options.repository, recordedAt: options.recordedAt, symbol: plan.symbol, day, fetchImpl: options.fetchImpl })
      written += run.persistedCount
      duplicates += run.duplicateWriteCount
      if (run.status === "SUCCESS" || run.status === "DUPLICATE") refreshed.push(day)
      else errors.push(...run.errors.map((error) => `${day}: ${error}`))
      if (run.status !== "DUPLICATE") allDuplicate = false
      continue
    }
    if (plan.dataset === "HISTORICAL_LIQUIDATION") {
      const run = await runBinanceVisionLiquidationBackfill({
        repository: options.repository,
        recordedAt: options.recordedAt,
        symbol: plan.symbol,
        day,
        fetchImpl: options.fetchImpl,
        coinalyzeInternalEnabled: options.coinalyzeInternalEnabled ?? false,
        coinalyzeRequestKey: options.coinalyzeRequestKey,
      })
      written += run.persistedCount
      duplicates += run.duplicateWriteCount
      if (run.status === "SUCCESS" || run.status === "DUPLICATE") refreshed.push(day)
      else errors.push(...run.errors.map((error) => `${day}: ${error}`))
      if (run.status !== "DUPLICATE") allDuplicate = false
    }
  }
  return jobResult(
    plan,
    errors.length ? "FAILED" : allDuplicate ? "DUPLICATE" : "SUCCESS",
    days,
    refreshed,
    written,
    duplicates,
    errors,
  )
}

export async function runRecentGapSync(options: RecentGapSyncExecutionOptions): Promise<RecentGapSyncResult> {
  const planned = planRecentGapSync(options)
  if (planned.status !== "SUCCESS") {
    return result({ status: "VALIDATION_ERROR", dryRun: options.dryRun, plan: null, jobs: [], affectedUtcDays: [], projectionRefreshDays: [], errors: planned.errors })
  }
  if (options.dryRun) {
    return result({
      status: "DRY_RUN",
      dryRun: true,
      plan: planned.value,
      jobs: planned.value.jobs.map((job) => jobResult(job, "PLANNED")),
      affectedUtcDays: planned.value.affectedUtcDays,
      projectionRefreshDays: planned.value.affectedUtcDays,
      errors: [],
    })
  }
  if (!options.repository || !options.recordedAt || !Number.isFinite(Date.parse(options.recordedAt))) {
    return result({ status: "VALIDATION_ERROR", dryRun: false, plan: planned.value, jobs: [], affectedUtcDays: planned.value.affectedUtcDays, projectionRefreshDays: [], errors: ["Non-dry execution requires Repository and explicit recordedAt."] })
  }

  const executableOptions = { ...options, repository: options.repository, recordedAt: new Date(options.recordedAt).toISOString() }
  const jobs: RecentGapSyncJobResult[] = []
  for (const plan of planned.value.jobs) jobs.push(await dispatchBoundedJob(plan, executableOptions))
  const projectionRefreshDays = [...new Set(jobs.flatMap((job) => job.projectionRefreshDays))].sort()
  const errors = jobs.flatMap((job) => job.errors)
  return result({
    status: errors.length ? "PARTIAL" : "SUCCESS",
    dryRun: false,
    plan: planned.value,
    jobs,
    affectedUtcDays: planned.value.affectedUtcDays,
    projectionRefreshDays,
    errors,
  })
}
