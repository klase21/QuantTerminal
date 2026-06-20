import path from "node:path"

import {
  type IntelligenceScheduledProductionResult,
  type IntelligenceSchedulerSkipRecord,
} from "@/core/intelligence-production"
import {
  DEFAULT_DURABLE_ARTIFACT_ROOT,
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"
import {
  buildIntelligenceSuite,
  type IntelligenceSuiteBuildInput,
} from "./buildIntelligenceSuite"
import {
  DEFAULT_INTELLIGENCE_REPORT_ROOT,
  FileIntelligenceProductionRunReportStore,
  createIntelligenceProductionRunId,
} from "./productionRunReportStore"
import {
  FileIntelligenceSchedulerStore,
  createDefaultSchedulerState,
  nextScheduledRun,
} from "./intelligenceSchedulerStore"

export interface ScheduledProductionOptions {
  now?: Date
  jobId?: string
  enabled?: boolean
  everyMinutes?: number
  schedulerStore?: FileIntelligenceSchedulerStore
  artifactRoot?: string
  reportRoot?: string
  input?: IntelligenceSuiteBuildInput
}

function skipRecord(
  reason: IntelligenceSchedulerSkipRecord["reason"],
  detail: string,
  now: Date,
): IntelligenceSchedulerSkipRecord {
  return {
    recordedAt: now.toISOString(),
    reason,
    detail,
  }
}

export async function runScheduledProduction(
  options: ScheduledProductionOptions = {},
): Promise<IntelligenceScheduledProductionResult> {
  const now = options.now ?? new Date()
  const schedulerStore = options.schedulerStore ?? new FileIntelligenceSchedulerStore()
  let state = await schedulerStore.readState()
  if (!state) {
    state = createDefaultSchedulerState(now, {
      jobId: options.jobId,
      enabled: options.enabled,
      everyMinutes: options.everyMinutes,
    })
  } else {
    if (options.jobId) state.jobId = options.jobId
    if (options.enabled !== undefined) state.enabled = options.enabled
    if (options.everyMinutes !== undefined) {
      if (!Number.isInteger(options.everyMinutes) || options.everyMinutes <= 0) {
        throw new Error("Scheduler interval must be a positive whole number of minutes.")
      }
      state.schedule = { kind: "interval", everyMinutes: options.everyMinutes }
      state.nextRun = state.lastRun?.completedAt
        ? nextScheduledRun(state.schedule, new Date(state.lastRun.completedAt))
        : now.toISOString()
    }
  }

  if (!state.enabled) {
    state.status = "disabled"
    state.nextRun = null
    state.updatedAt = now.toISOString()
    await schedulerStore.writeState(state)
    await schedulerStore.recordSkip(skipRecord(
      "disabled",
      "Scheduled intelligence production is disabled.",
      now,
    ))
    return {
      jobId: state.jobId,
      status: "skipped",
      reason: "disabled",
      runId: null,
      nextRun: null,
    }
  }

  if (state.nextRun && Date.parse(state.nextRun) > now.getTime()) {
    state.status = "skipped"
    state.updatedAt = now.toISOString()
    await schedulerStore.writeState(state)
    await schedulerStore.recordSkip(skipRecord(
      "not_due",
      `Next scheduled production run is ${state.nextRun}.`,
      now,
    ))
    return {
      jobId: state.jobId,
      status: "skipped",
      reason: "not_due",
      runId: null,
      nextRun: state.nextRun,
    }
  }

  const lock = await schedulerStore.acquireLock(state.jobId, now)
  if (!lock) {
    await schedulerStore.recordSkip(skipRecord(
      "concurrent_run",
      "Another intelligence production run holds the scheduler lock.",
      now,
    ))
    return {
      jobId: state.jobId,
      status: "skipped",
      reason: "concurrent_run",
      runId: null,
      nextRun: state.nextRun,
    }
  }

  const runId = createIntelligenceProductionRunId(now)
  const artifactRoot = options.artifactRoot ?? DEFAULT_DURABLE_ARTIFACT_ROOT
  const reportRoot = options.reportRoot ?? DEFAULT_INTELLIGENCE_REPORT_ROOT
  const reportStore = new FileIntelligenceProductionRunReportStore(reportRoot)

  try {
    state.status = "running"
    state.lastRun = {
      runId,
      startedAt: now.toISOString(),
      completedAt: null,
      status: "running",
    }
    state.updatedAt = now.toISOString()
    await schedulerStore.writeState(state)

    const report = await buildIntelligenceSuite(
      options.input,
      {
        artifactRegistry: new FileBackedIntelligenceArtifactRegistry(artifactRoot),
        publicationTarget: `file:${path.resolve(artifactRoot)}`,
        reportStore,
        runId,
      },
    )
    const completedAt = new Date(report.completedAt)
    state.status = report.status
    state.lastRun = {
      runId,
      startedAt: report.startedAt,
      completedAt: report.completedAt,
      status: report.status,
    }
    state.nextRun = nextScheduledRun(state.schedule, completedAt)
    state.updatedAt = report.completedAt
    await schedulerStore.writeState(state)

    return {
      jobId: state.jobId,
      status: "executed",
      runId,
      nextRun: state.nextRun,
    }
  } catch (error) {
    const completedAt = new Date()
    state.status = "failed"
    state.lastRun = {
      runId,
      startedAt: state.lastRun?.startedAt ?? now.toISOString(),
      completedAt: completedAt.toISOString(),
      status: "failed",
    }
    state.nextRun = nextScheduledRun(state.schedule, completedAt)
    state.updatedAt = completedAt.toISOString()
    await schedulerStore.writeState(state)
    throw error
  } finally {
    await lock.release()
  }
}
