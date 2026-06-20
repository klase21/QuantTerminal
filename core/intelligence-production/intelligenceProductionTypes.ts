export const INTELLIGENCE_PRODUCTION_SCHEMA_VERSION = 1

export const INTELLIGENCE_PRODUCTION_STAGES = [
  "historical_analog",
  "event_impact",
  "market_memory",
  "artifact_publication",
] as const

export type IntelligenceProductionStage = typeof INTELLIGENCE_PRODUCTION_STAGES[number]

export type IntelligenceProductionStageStatus =
  | "succeeded"
  | "partial"
  | "failed"
  | "skipped"

export interface IntelligenceProductionMessage {
  code: string
  message: string
}

export interface IntelligenceProductionOutput {
  kind: "cache" | "catalog" | "memory" | "artifact"
  id: string
  metadata?: Record<string, unknown>
}

export interface IntelligenceProductionStageResult {
  schemaVersion: typeof INTELLIGENCE_PRODUCTION_SCHEMA_VERSION
  stage: IntelligenceProductionStage
  status: IntelligenceProductionStageStatus
  startedAt: string
  completedAt: string
  duration: number
  outputs: IntelligenceProductionOutput[]
  warnings: IntelligenceProductionMessage[]
  errors: IntelligenceProductionMessage[]
}

export interface IntelligenceProductionReport {
  schemaVersion: typeof INTELLIGENCE_PRODUCTION_SCHEMA_VERSION
  status: IntelligenceProductionStageStatus
  startedAt: string
  completedAt: string
  totalDuration: number
  stages: IntelligenceProductionStageResult[]
  outputsGenerated: number
  warningCount: number
  failureCount: number
}
