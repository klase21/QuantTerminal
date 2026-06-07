import type {
  ReplayAgentSummary,
  ReplayCase,
  ReplayEvent,
  ReplayFrame,
  ReplayMarketSnapshot,
  ReplayNarrativeSnapshot,
  ReplayRiskSnapshot,
  ReplayVerdict,
} from "@/core/replay/replayTypes"

export type HistoricalEventCategory =
  | "price"
  | "funding"
  | "open_interest"
  | "liquidation"
  | "etf_flow"
  | "news"
  | "narrative"
  | "prediction_market"
  | "macro"
  | "tactical_verdict"
  | "setup_outcome"

export type HistoricalEventSeverity = "LOW" | "MEDIUM" | "HIGH"
export type HistoricalEventImpactDirection = "bullish" | "bearish" | "mixed" | "neutral"
export type HistoricalEventImpactWindow = "minutes" | "hours" | "days" | "weeks"

export type HistoricalEventVenue =
  | "binance"
  | "bybit"
  | "hyperliquid"
  | "coinbase"
  | "okx"
  | "deribit"
  | "polymarket"
  | "kalshi"
  | "macro_calendar"
  | "manual"
  | string

export interface HistoricalEventImpact {
  direction: HistoricalEventImpactDirection
  affectedAssets: string[]
  expectedImpactWindow: HistoricalEventImpactWindow
  realizedMovePct?: number
  realizedVolatilityPct?: number
  tacticalRead?: string
}

export interface HistoricalEventNarrative {
  claim?: string
  support?: string[]
  contradiction?: string[]
  conclusion?: string
  narrativeTags?: string[]
}

export interface HistoricalEvent {
  id: string
  timestamp: string
  category: HistoricalEventCategory
  symbol?: string
  venue?: HistoricalEventVenue
  source: string
  title: string
  summary: string
  severity: HistoricalEventSeverity
  confidence: number
  data: Record<string, unknown>
  tags: string[]
  relatedCaseIds?: string[]
  sourceUrl?: string
  ingestedAt: string
  impact?: HistoricalEventImpact
  narrative?: HistoricalEventNarrative
}

export interface ReplaySourceReference {
  id: string
  source: string
  category: HistoricalEventCategory | "manual_case_note"
  title: string
  url?: string
  providerId?: string
  capturedAt?: string
  confidence?: number
}

export interface ReplayCaseStorageRecord {
  id: string
  title: string
  symbol: string
  window: string
  setup: string
  outcome: string
  verdict: ReplayVerdict
  verdictSummary: string
  realityCheck: string
  eventType?: "macro" | "crypto_policy" | "liquidity" | "narrative_shock" | "mixed"
  shockLevel?: "low" | "medium" | "high"
  eventWindow?: {
    start: string
    peak?: string
    end: string
  }
  tags: string[]
  sources: ReplaySourceReference[]
  createdAt: string
  updatedAt: string
}

export interface ReplayFrameStorageRecord {
  id: string
  caseId: string
  index: number
  timestamp: string
  label: string
  eventIds: string[]
  market: ReplayMarketSnapshot
  expectation: ReplayFrame["expectation"]
  narrative: ReplayNarrativeSnapshot
  risk: ReplayRiskSnapshot
  agents: ReplayAgentSummary[]
  sourceIds?: string[]
}

export interface ReplayCaseEventLink {
  caseId: string
  eventId: string
  frameId?: string
  role: "primary_catalyst" | "supporting_evidence" | "contradicting_evidence" | "market_reaction" | "context"
  weight: number
  note?: string
}

export type SimilarEventMatchReason =
  | "same_event_type"
  | "same_symbol"
  | "same_market_regime"
  | "similar_funding"
  | "similar_open_interest"
  | "similar_liquidation_profile"
  | "similar_narrative"
  | "similar_macro_context"
  | "similar_prediction_market_expectation"
  | "similar_outcome"
  | "similar_shock_level"
  | "similar_driver_ranking"
  | "similar_verdict"

export interface SimilarEventMatch {
  caseId: string
  title: string
  symbol: string
  timestamp: string
  similarityScore: number
  reasons: SimilarEventMatchReason[]
  matchedTags: string[]
  outcome: string
  verdict: ReplayVerdict
  operatorRead: string
  keyDifferences: string[]
  takeaway: string
}

export interface SimilarEventQuery {
  symbol?: string
  eventType?: ReplayCaseStorageRecord["eventType"]
  category?: HistoricalEventCategory
  tags?: string[]
  start?: string
  end?: string
  minSimilarityScore?: number
  limit?: number
}

export type TradeOutcome = "win" | "loss" | "breakeven" | "missed" | "avoided"

export interface SetupCondition {
  id: string
  label: string
  category: "technical" | "flow" | "narrative" | "expectation" | "risk" | "execution" | "macro"
  expectedState: string
  observedState: string
  matched: boolean
  weight: number
}

export interface OutcomeStatistics {
  sampleSize: number
  winRate: number
  averageReturnPct: number
  medianReturnPct?: number
  maxAdverseExcursionPct?: number
  maxFavorableExcursionPct?: number
  averageHoldMinutes?: number
  falseNarrativeRate?: number
}

export interface SetupOutcomeRecord {
  id: string
  caseId?: string
  symbol: string
  timestamp: string
  setupName: string
  thesis: string
  conditions: SetupCondition[]
  tradeOutcome: TradeOutcome
  realizedReturnPct?: number
  holdMinutes?: number
  mistakeTags: string[]
  lesson: string
  statistics?: OutcomeStatistics
  relatedEventIds: string[]
  createdAt: string
  updatedAt: string
}

export interface ReplayCaseRepository {
  listCases(query?: SimilarEventQuery): Promise<ReplayCaseStorageRecord[]>
  getCase(caseId: string): Promise<ReplayCaseStorageRecord | null>
  listFrames(caseId: string): Promise<ReplayFrameStorageRecord[]>
  listEventLinks(caseId: string): Promise<ReplayCaseEventLink[]>
}

export interface HistoricalEventRepository {
  listEvents(query?: SimilarEventQuery): Promise<HistoricalEvent[]>
  getEvent(eventId: string): Promise<HistoricalEvent | null>
  findSimilarEvents(query: SimilarEventQuery): Promise<SimilarEventMatch[]>
}

export interface SetupOutcomeRepository {
  listOutcomes(query?: SimilarEventQuery): Promise<SetupOutcomeRecord[]>
  getOutcome(outcomeId: string): Promise<SetupOutcomeRecord | null>
  getOutcomeStatistics(query?: SimilarEventQuery): Promise<OutcomeStatistics>
}

function replaySourceFromCategory(category: HistoricalEventCategory): ReplayEvent["source"] {
  if (category === "news" || category === "narrative") return "news"
  if (category === "macro") return "macro"
  if (category === "price") return "price"
  if (category === "funding" || category === "open_interest" || category === "liquidation") return "derivatives"
  if (category === "prediction_market") return "expectation"
  if (category === "setup_outcome") return "memory"
  return "manual"
}

export function mapHistoricalEventToReplayEvent(event: HistoricalEvent): ReplayEvent {
  return {
    id: event.id,
    timestamp: event.timestamp,
    title: event.title,
    severity: event.severity,
    description: event.summary,
    source: replaySourceFromCategory(event.category),
  }
}

export function mapStorageReplayCaseToReplayCase(
  record: ReplayCaseStorageRecord,
  frames: ReplayFrameStorageRecord[],
  events: HistoricalEvent[] = [],
): ReplayCase {
  return {
    id: record.id,
    title: record.title,
    symbol: record.symbol,
    window: record.window,
    setup: record.setup,
    outcome: record.outcome,
    verdict: record.verdict,
    verdictSummary: record.verdictSummary,
    realityCheck: record.realityCheck,
    events: events.map(mapHistoricalEventToReplayEvent),
    frames: frames
      .filter((frame) => frame.caseId === record.id)
      .sort((a, b) => a.index - b.index)
      .map((frame) => ({
        id: frame.id,
        index: frame.index,
        timestamp: frame.timestamp,
        label: frame.label,
        eventIds: frame.eventIds,
        market: frame.market,
        expectation: frame.expectation,
        narrative: frame.narrative,
        risk: frame.risk,
        agents: frame.agents,
      })),
  }
}
