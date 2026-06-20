import type { IntelligenceProductionStageStatus } from "./intelligenceProductionTypes"

export const INTELLIGENCE_SCHEDULER_SCHEMA_VERSION = 1

export interface IntelligenceProductionIntervalSchedule {
  kind: "interval"
  everyMinutes: number
}

export type IntelligenceProductionSchedule = IntelligenceProductionIntervalSchedule

export type IntelligenceSchedulerStatus =
  | "idle"
  | "running"
  | "succeeded"
  | "partial"
  | "failed"
  | "skipped"
  | "disabled"

export interface IntelligenceSchedulerRunReference {
  runId: string
  startedAt: string
  completedAt: string | null
  status: IntelligenceProductionStageStatus | "running"
}

export interface IntelligenceSchedulerSkipRecord {
  recordedAt: string
  reason: "disabled" | "not_due" | "concurrent_run"
  detail: string
}

export interface IntelligenceSchedulerState {
  schemaVersion: typeof INTELLIGENCE_SCHEDULER_SCHEMA_VERSION
  jobId: string
  enabled: boolean
  schedule: IntelligenceProductionSchedule
  lastRun: IntelligenceSchedulerRunReference | null
  nextRun: string | null
  status: IntelligenceSchedulerStatus
  updatedAt: string
}

export interface IntelligenceScheduledProductionResult {
  jobId: string
  status: "executed" | "skipped"
  reason?: IntelligenceSchedulerSkipRecord["reason"]
  runId: string | null
  nextRun: string | null
}
