import { validateProductContext } from "@/lib/product-context/schema"
import {
  PRODUCT_CONTEXT_SCHEMA_VERSION,
  type ContextValue,
  type EvidenceReference,
  type EvidenceSummary,
  type FreshnessContext,
  type MarketStructureContext,
  type OpportunityContext,
  type ProductContextResult,
  type ReplayResult,
  type ReplayTarget,
  type SharedProductContextV1,
  type SignalContext,
  type ThesisContext,
  type ValidationResult,
} from "@/lib/product-context/types"

export interface ProductContextHandoffBase {
  contextId: string
  symbol: string
  exchange?: string | null
  timeframe?: string | null
  revision?: number
  createdAt: string
  updatedAt?: string
  expiresAt: string
}

type OptionalHandoffFields = Partial<Pick<SharedProductContextV1,
  | "thesis"
  | "opportunityContext"
  | "signalContext"
  | "marketStructureContext"
  | "evidenceSummary"
  | "supportingEvidence"
  | "conflictingEvidence"
  | "confidenceContext"
  | "freshness"
  | "replayTarget"
  | "validationResult"
  | "replayResult"
  | "executionContext"
>>

export interface BasicHandoffInput extends ProductContextHandoffBase {
  context?: OptionalHandoffFields
}

export type ScannerToResearchHandoffInput = ProductContextHandoffBase & OptionalHandoffFields & (
  | { opportunityContext: ContextValue<OpportunityContext>; signalContext?: ContextValue<SignalContext> | null }
  | { opportunityContext?: ContextValue<OpportunityContext> | null; signalContext: ContextValue<SignalContext> }
)

export interface ResearchToReplayHandoffInput extends ProductContextHandoffBase, OptionalHandoffFields {
  thesis?: ContextValue<ThesisContext> | null
  replayTarget: ContextValue<ReplayTarget>
  evidenceSummary?: ContextValue<EvidenceSummary> | null
  supportingEvidence?: ContextValue<EvidenceReference[]> | null
  conflictingEvidence?: ContextValue<EvidenceReference[]> | null
  marketStructureContext?: ContextValue<MarketStructureContext> | null
  freshness?: ContextValue<FreshnessContext> | null
}

export interface ReplayToTradeHandoffInput extends ProductContextHandoffBase, OptionalHandoffFields {
  validationResult: ContextValue<ValidationResult>
  replayResult: ContextValue<ReplayResult>
}

function missingHandoffField(field: string): ProductContextResult<never> {
  return {
    success: false,
    error: { code: "missing_field", message: `${field} is required for this handoff.`, field },
  }
}

function contextFromInput(input: OptionalHandoffFields): OptionalHandoffFields {
  return {
    thesis: input.thesis,
    opportunityContext: input.opportunityContext,
    signalContext: input.signalContext,
    marketStructureContext: input.marketStructureContext,
    evidenceSummary: input.evidenceSummary,
    supportingEvidence: input.supportingEvidence,
    conflictingEvidence: input.conflictingEvidence,
    confidenceContext: input.confidenceContext,
    freshness: input.freshness,
    replayTarget: input.replayTarget,
    validationResult: input.validationResult,
    replayResult: input.replayResult,
    executionContext: input.executionContext,
  }
}

function createEnvelope(
  input: ProductContextHandoffBase,
  sourcePage: SharedProductContextV1["sourcePage"],
  destinationIntent: SharedProductContextV1["destinationIntent"],
  context: OptionalHandoffFields = {},
): ProductContextResult<SharedProductContextV1> {
  const candidate: SharedProductContextV1 = {
    schemaVersion: PRODUCT_CONTEXT_SCHEMA_VERSION,
    contextId: input.contextId,
    revision: input.revision ?? 1,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    expiresAt: input.expiresAt,
    symbol: input.symbol,
    exchange: input.exchange,
    timeframe: input.timeframe,
    ...context,
    sourcePage,
    destinationIntent,
  }

  return validateProductContext(candidate)
}

export function createDashboardToMarketsContext(input: BasicHandoffInput) {
  return createEnvelope(input, "dashboard", "explore_market", input.context)
}

export function createDashboardToScannerContext(input: BasicHandoffInput) {
  return createEnvelope(input, "dashboard", "triage_opportunities", input.context)
}

export function createMarketsToScannerContext(input: BasicHandoffInput) {
  return createEnvelope(input, "markets", "prioritize_symbol", input.context)
}

export function createMarketsToResearchContext(input: BasicHandoffInput) {
  return createEnvelope(input, "markets", "investigate_evidence", input.context)
}

export function createScannerToResearchContext(input: ScannerToResearchHandoffInput) {
  if (!input.opportunityContext && !input.signalContext) {
    return missingHandoffField("opportunityContext or signalContext")
  }
  return createEnvelope(input, "scanner", "evaluate_thesis", contextFromInput(input))
}

export function createResearchToReplayContext(input: ResearchToReplayHandoffInput) {
  if (!input.replayTarget) return missingHandoffField("replayTarget")
  return createEnvelope(input, "research", "validate_historically", contextFromInput(input))
}

export function createReplayToTradeContext(input: ReplayToTradeHandoffInput) {
  if (!input.validationResult) return missingHandoffField("validationResult")
  if (!input.replayResult) return missingHandoffField("replayResult")
  return createEnvelope(input, "replay", "prepare_execution", contextFromInput(input))
}

export function createTradeToDashboardContext(input: BasicHandoffInput) {
  return createEnvelope(input, "trade", "monitor_market", input.context)
}
