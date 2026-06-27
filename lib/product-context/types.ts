export const PRODUCT_CONTEXT_SCHEMA_VERSION = 1 as const

export const PRODUCT_CONTEXT_PAGES = [
  "dashboard",
  "markets",
  "scanner",
  "research",
  "replay",
  "trade",
] as const

export const PRODUCT_CONTEXT_DESTINATION_INTENTS = [
  "explore_market",
  "triage_opportunities",
  "prioritize_symbol",
  "investigate_evidence",
  "evaluate_thesis",
  "validate_historically",
  "prepare_execution",
  "monitor_market",
] as const

export const PRODUCT_CONTEXT_FRESHNESS_STATES = [
  "CURRENT",
  "STALE",
  "MISSING",
  "UNAVAILABLE",
  "UNKNOWN",
] as const

export type ProductPage = typeof PRODUCT_CONTEXT_PAGES[number]
export type DestinationIntent = typeof PRODUCT_CONTEXT_DESTINATION_INTENTS[number]
export type ProductContextFreshness = typeof PRODUCT_CONTEXT_FRESHNESS_STATES[number]

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
export type JsonObject = { [key: string]: JsonValue }

export type ThesisContext = JsonObject
export type OpportunityContext = JsonObject
export type SignalContext = JsonObject
export type MarketStructureContext = JsonObject
export type EvidenceSummary = JsonObject
export type EvidenceReference = JsonObject
export type ConfidenceContext = JsonObject
export type FreshnessContext = JsonObject
export type ReplayTarget = JsonObject
export type ValidationResult = JsonObject
export type ReplayResult = JsonObject
export type ExecutionContext = JsonObject

export interface ContextValue<T extends JsonValue = JsonValue> {
  value: T
  owner: ProductPage
  source: string
  observedAt?: string | null
  generatedAt?: string | null
  freshness: ProductContextFreshness
  revision: number
}

export interface SharedProductContextV1 {
  schemaVersion: typeof PRODUCT_CONTEXT_SCHEMA_VERSION
  contextId: string
  revision: number
  createdAt: string
  updatedAt: string
  expiresAt: string

  symbol: string
  exchange?: string | null
  timeframe?: string | null

  thesis?: ContextValue<ThesisContext> | null
  opportunityContext?: ContextValue<OpportunityContext> | null
  signalContext?: ContextValue<SignalContext> | null
  marketStructureContext?: ContextValue<MarketStructureContext> | null
  evidenceSummary?: ContextValue<EvidenceSummary> | null
  supportingEvidence?: ContextValue<EvidenceReference[]> | null
  conflictingEvidence?: ContextValue<EvidenceReference[]> | null
  confidenceContext?: ContextValue<ConfidenceContext> | null
  freshness?: ContextValue<FreshnessContext> | null
  replayTarget?: ContextValue<ReplayTarget> | null
  validationResult?: ContextValue<ValidationResult> | null
  replayResult?: ContextValue<ReplayResult> | null
  executionContext?: ContextValue<ExecutionContext> | null

  sourcePage: ProductPage
  destinationIntent: DestinationIntent
}

export type SharedProductContext = SharedProductContextV1

export type ProductContextErrorCode =
  | "malformed_input"
  | "malformed_json"
  | "missing_field"
  | "invalid_field"
  | "malformed_timestamp"
  | "unsupported_schema_version"
  | "expired_context"
  | "serialization_failure"
  | "storage_unavailable"
  | "storage_failure"
  | "not_found"

export interface ProductContextError {
  code: ProductContextErrorCode
  message: string
  field?: string
  cause?: unknown
}

export type ProductContextResult<T> =
  | { success: true; value: T }
  | { success: false; error: ProductContextError }

