export const FACT_RECORD_KINDS = [
  "HISTORICAL_MARKET",
  "HISTORICAL_FUNDING",
  "HISTORICAL_OPEN_INTEREST",
  "HISTORICAL_LIQUIDATION",
  "HISTORICAL_AGG_TRADE",
  "HISTORICAL_PROVIDER_METADATA",
  "HISTORICAL_DATASET_METADATA",
  "SIGNAL_SNAPSHOT",
  "CONTEXT_SNAPSHOT",
  "SIGNAL_TRACKING",
  "PRICE_OBSERVATION",
  "SIGNAL_EVALUATION",
  "SIGNAL_OUTCOME",
  "OUTCOME_EVENT",
  "HISTORICAL_MEMORY",
] as const

export const KNOWLEDGE_RECORD_KINDS = [
  "PATTERN",
  "LEARNING",
  "CONFIDENCE_CALIBRATION",
  "PLAYBOOK",
] as const

export const PROJECTION_RECORD_KINDS = [
  "HISTORICAL_COVERAGE_PROJECTION",
] as const

export const OPERATIONAL_RECORD_KINDS = [
  "SCHEDULER_RUN",
  "WORKER_LOCK",
  "RETRY_STATE",
  "JOB_STATE",
  "DEAD_LETTER",
] as const

export const STORAGE_RECORD_KINDS = [
  ...FACT_RECORD_KINDS,
  ...KNOWLEDGE_RECORD_KINDS,
  ...PROJECTION_RECORD_KINDS,
  ...OPERATIONAL_RECORD_KINDS,
] as const

export type FactRecordKind = typeof FACT_RECORD_KINDS[number]
export type KnowledgeRecordKind = typeof KNOWLEDGE_RECORD_KINDS[number]
export type OperationalRecordKind = typeof OPERATIONAL_RECORD_KINDS[number]
export type ProjectionRecordKind = typeof PROJECTION_RECORD_KINDS[number]
export type StorageRecordKind = typeof STORAGE_RECORD_KINDS[number]
export type StorageRecordCategory = "FACT" | "KNOWLEDGE" | "PROJECTION" | "OPERATIONAL"

const RECORD_KIND_SET = new Set<string>(STORAGE_RECORD_KINDS)
const FACT_KIND_SET = new Set<string>(FACT_RECORD_KINDS)
const KNOWLEDGE_KIND_SET = new Set<string>(KNOWLEDGE_RECORD_KINDS)
const PROJECTION_KIND_SET = new Set<string>(PROJECTION_RECORD_KINDS)

export function isStorageRecordKind(value: unknown): value is StorageRecordKind {
  return typeof value === "string" && RECORD_KIND_SET.has(value)
}

export function getStorageRecordCategory(
  recordKind: StorageRecordKind,
): StorageRecordCategory {
  if (FACT_KIND_SET.has(recordKind)) return "FACT"
  if (KNOWLEDGE_KIND_SET.has(recordKind)) return "KNOWLEDGE"
  if (PROJECTION_KIND_SET.has(recordKind)) return "PROJECTION"
  return "OPERATIONAL"
}
