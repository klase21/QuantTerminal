export const FLOW_REPLAY_SCHEMA_VERSION = 1

export const FLOW_REPLAY_SOURCE_QUALITY_STATES = [
  "verified",
  "degraded",
  "unavailable",
  "unknown",
] as const

export type FlowReplaySourceQuality =
  typeof FLOW_REPLAY_SOURCE_QUALITY_STATES[number]

export type FlowReplayEvidenceKind =
  | "price"
  | "funding"
  | "open_interest"
  | "liquidation"
  | "trades"
  | "orderbook_flow"

export const FLOW_REPLAY_COVERAGE_STATES = [
  "MINIMAL",
  "PARTIAL",
  "ENRICHED",
  "COMPREHENSIVE",
] as const

export type FlowReplayCoverageState =
  typeof FLOW_REPLAY_COVERAGE_STATES[number]

export interface FlowReplayContext {
  exchange: string
  symbol: string
  timeframe: string
  date: string
  hour: number
  windowStart: string
  windowEnd: string
}

export interface FlowReplayMetric {
  key: string
  label: string
  value: number
  unit: "price" | "percent" | "quantity" | "count"
}

export interface FlowReplayEvidenceSource {
  sourceId: string
  kind: FlowReplayEvidenceKind
  quality: FlowReplaySourceQuality
  source: string
  observedAt: string | null
  summary: string
  reason?: string
  metrics: FlowReplayMetric[]
}

export interface FlowReplayPriceMovement {
  direction: "up" | "down" | "flat"
  open: number
  high: number
  low: number
  close: number
  returnPercent: number
  rangePercent: number
  volume: number
}

export interface FlowReplayStructureObservation {
  observationId: string
  sourceId: string
  quality: FlowReplaySourceQuality
  statement: string
  metrics: FlowReplayMetric[]
}

export interface FlowReplayPositioningEvidence {
  availability: "available" | "unavailable" | "unknown"
  source: string | null
  coverage: {
    windowStart: string
    windowEnd: string
    pointCount: number
  }
  observedValue: number | null
  observedAt: string | null
  quality: FlowReplaySourceQuality
  reason?: string
}

export interface FlowReplayEvidence {
  schemaVersion: typeof FLOW_REPLAY_SCHEMA_VERSION
  flowReplayId: string
  context: FlowReplayContext
  generatedAt: string
  coverageState?: FlowReplayCoverageState
  whatMoved: FlowReplayPriceMovement | null
  fundingEvidence?: FlowReplayPositioningEvidence
  openInterestEvidence?: FlowReplayPositioningEvidence
  marketStructureChanges: FlowReplayStructureObservation[]
  sources: FlowReplayEvidenceSource[]
  supportingEvidence: FlowReplayEvidenceSource[]
  degradedEvidence: FlowReplayEvidenceSource[]
  unavailableEvidence: FlowReplayEvidenceSource[]
}

export interface FlowReplayArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  flowReplay: FlowReplayEvidence
}

export function flowReplayId(context: Pick<
  FlowReplayContext,
  "exchange" | "symbol" | "date" | "hour"
>) {
  return [
    "flow-replay",
    context.exchange.trim().toLowerCase(),
    context.symbol.trim().toUpperCase(),
    context.date,
    String(context.hour).padStart(2, "0"),
  ].join(":")
}
