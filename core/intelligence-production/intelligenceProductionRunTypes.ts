import type {
  IntelligenceProductionMessage,
  IntelligenceProductionOutput,
  IntelligenceProductionStage,
  IntelligenceProductionStageStatus,
} from "./intelligenceProductionTypes"

export const INTELLIGENCE_PRODUCTION_RUN_SCHEMA_VERSION = 1

export type IntelligenceProductionRunStatus =
  | "running"
  | IntelligenceProductionStageStatus

export type IntelligenceProductionRunStageStatus =
  | "pending"
  | "running"
  | IntelligenceProductionStageStatus

export interface IntelligenceProductionRunStage {
  stage: IntelligenceProductionStage
  status: IntelligenceProductionRunStageStatus
  startedAt: string | null
  completedAt: string | null
  duration: number
  outputs: IntelligenceProductionOutput[]
  warnings: IntelligenceProductionMessage[]
  errors: IntelligenceProductionMessage[]
}

export interface IntelligenceProductionRunReport {
  schemaVersion: typeof INTELLIGENCE_PRODUCTION_RUN_SCHEMA_VERSION
  runId: string
  startedAt: string
  completedAt: string | null
  duration: number
  overallStatus: IntelligenceProductionRunStatus
  stages: IntelligenceProductionRunStage[]
}

export interface IntelligenceProductionRunSummary {
  runId: string
  startedAt: string
  completedAt: string | null
  duration: number
  overallStatus: IntelligenceProductionRunStatus
  outputCount: number
  warningCount: number
  errorCount: number
  stages: Array<{
    stage: IntelligenceProductionStage
    status: IntelligenceProductionRunStageStatus
    duration: number
    outputCount: number
    warningCount: number
    errorCount: number
  }>
}

export interface IntelligenceProductionRunReportStore {
  writeRun(report: IntelligenceProductionRunReport): Promise<void>
  getLatestRun(): Promise<IntelligenceProductionRunReport | null>
  getRun(runId: string): Promise<IntelligenceProductionRunReport | null>
  listRecentRuns(limit: number): Promise<IntelligenceProductionRunReport[]>
}
