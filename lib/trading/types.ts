import type {
  MarketMoverConfidence,
  MarketMoverDirection,
  MarketMoverFreshness,
  MarketMoverPlanQuality,
  MarketMoverRegime,
  MarketMoverSetup,
} from "@/lib/market-movers/types"

export type TradingRecordSource = "market-discovery" | "focus-pair" | "manual" | "event"

export type SetupRecordStatus =
  | "DETECTED"
  | "NEW"
  | "ACTIVE"
  | "STRENGTHENING"
  | "WEAKENING"
  | "COMPLETED"
  | "INVALIDATED"
  | "EXPIRED"

export type SetupOutcomeStatus = "OPEN" | "TP1_HIT" | "TP2_HIT" | "STOPPED" | "EXPIRED" | "MANUAL"

export type DemoTradeStatus = "OPEN" | "CLOSED" | "CANCELLED"
export type DemoTradeExitReason = "TP1" | "TP2" | "SL" | "MANUAL" | "EXPIRED" | "NONE"

export type EventRecordCategory =
  | "MACRO"
  | "ETF_FLOW"
  | "CRYPTO_EVENT"
  | "NARRATIVE"
  | "MARKET_STRUCTURE"
  | "SYSTEM"

export type EventRecordType =
  | "CPI"
  | "FOMC"
  | "NFP"
  | "ETF_INFLOW"
  | "ETF_OUTFLOW"
  | "TOKEN_UNLOCK"
  | "LISTING"
  | "NARRATIVE_ROTATION"
  | "SETUP_DETECTED"
  | "TRADE_OPENED"
  | "TRADE_CLOSED"
  | "CUSTOM"

export type ExecutionPlanSnapshot = {
  side: MarketMoverDirection
  detectedPrice: number
  entryLow: number
  entryHigh: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  riskReward: string
  planQuality: MarketMoverPlanQuality
  slDistancePct: number
  riskPct?: number
  suggestedPositionPct?: number
}

export type SetupRecord = {
  id: string
  symbol: string
  setup: MarketMoverSetup | string
  source: TradingRecordSource
  direction: MarketMoverDirection
  bias: string
  grade: "A" | "B" | "C"
  confidence: MarketMoverConfidence
  freshness: MarketMoverFreshness
  regime?: MarketMoverRegime
  score: number
  trustSummary?: string
  qualityReason?: string
  plan: ExecutionPlanSnapshot
  firstSeenAt: number
  lastSeenAt: number
  status: SetupRecordStatus
  outcome: SetupOutcomeStatus
  linkedEventIds: string[]
  metadata?: Record<string, unknown>
}

export type SetupOutcomeRecord = {
  id: string
  setupId: string
  symbol: string
  direction: MarketMoverDirection
  status: SetupOutcomeStatus
  detectedPrice: number
  latestPrice: number
  bestPrice: number
  worstPrice: number
  bestMovePct: number
  worstMovePct: number
  resultText: string
  firstSeenAt: number
  resolvedAt?: number
  durationMs?: number
}

export type DemoTradeRecord = {
  id: string
  setupId?: string
  symbol: string
  side: Extract<MarketMoverDirection, "LONG" | "SHORT">
  status: DemoTradeStatus
  entryPrice: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  sizePct?: number
  riskPct?: number
  openedAt: number
  closedAt?: number
  exitPrice?: number
  exitReason: DemoTradeExitReason
  realizedPnlPct?: number
  unrealizedPnlPct?: number
  source: TradingRecordSource
  linkedEventIds: string[]
  notes?: string
}

export type EventRecord = {
  id: string
  type: EventRecordType
  category: EventRecordCategory
  title: string
  timestamp: number
  source?: string
  importance: "LOW" | "MEDIUM" | "HIGH" | "TIER_1"
  linkedSetupIds: string[]
  linkedTradeIds: string[]
  metadata?: Record<string, unknown>
}

export type TradingDatabaseSnapshot = {
  version: 1
  setups: SetupRecord[]
  outcomes: SetupOutcomeRecord[]
  demoTrades: DemoTradeRecord[]
  events: EventRecord[]
  updatedAt: number
}
