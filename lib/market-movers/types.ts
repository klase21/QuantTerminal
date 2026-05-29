export type BinanceFuturesTicker24h = {
  symbol: string
  priceChange?: string
  priceChangePercent?: string
  weightedAvgPrice?: string
  lastPrice?: string
  lastQty?: string
  openPrice?: string
  highPrice?: string
  lowPrice?: string
  volume?: string
  quoteVolume?: string
  openTime?: number
  closeTime?: number
  firstId?: number
  lastId?: number
  count?: number
}

export type MarketMoverAction = "WATCH" | "WAIT" | "AVOID"
export type MarketMoverDirection = "LONG" | "SHORT" | "NEUTRAL"
export type MarketMoverSetup = "Pullback continuation" | "Breakout continuation" | "Mean reversion watch" | "Liquid large-cap watch" | "No clean setup"
export type MarketMoverCapTier = "MAJOR" | "LARGE_LIQUID" | "SPECULATIVE"
export type MarketMoverQualityState = "ACTIONABLE" | "WATCHLIST" | "TOO_LATE" | "LOW_LIQUIDITY" | "NO_DIRECTION"
export type MarketMoverConfidence = "HIGH" | "MEDIUM" | "LOW"
export type MarketMoverFreshness = "FRESH" | "DEVELOPING" | "MATURE" | "LATE"
export type MarketMoverPlanQuality = "BALANCED" | "SL_TOO_TIGHT" | "POOR_RR" | "WIDE_RISK" | "NO_TRADE"
export type MarketMoverRegime = "TRENDING" | "HIGH_VOL" | "CHOPPY" | "BREAKOUT" | "EXHAUSTED"

export type MarketMoverScoreBreakdown = {
  label: string
  value: number
  polarity: "positive" | "negative" | "neutral"
}

export type MarketMoverNumericPlan = {
  side: MarketMoverDirection
  detectedPrice: number
  entryLow: number
  entryHigh: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
}

export type MarketMoverCandidate = {
  symbol: string
  direction: MarketMoverDirection
  action: MarketMoverAction
  setup: MarketMoverSetup
  score: number
  grade: "A" | "B" | "C"
  confidence: MarketMoverConfidence
  freshness: MarketMoverFreshness
  scoreBreakdown: MarketMoverScoreBreakdown[]
  trustSummary: string
  qualityState: MarketMoverQualityState
  qualityReason: string
  priceChangePercent: number
  quoteVolume: number
  volume: number
  tradeCount: number
  lastPrice: number
  liquidityRank: number
  capTier: MarketMoverCapTier
  isLargeCapWatch: boolean
  volatilityRank: number
  participationRank: number
  attentionScore: number
  chaseRisk: number
  tradeabilityScore: number
  bias: string
  entryZone: string
  stopLoss: string
  takeProfit1: string
  takeProfit2: string
  numericPlan: MarketMoverNumericPlan
  planQuality: MarketMoverPlanQuality
  riskReward: string
  slDistancePct: number
  volatilityNote: string
  marketRegime: MarketMoverRegime
  regimeNote: string
  riskPct: number
  suggestedPositionPct: number
  maxLossPlan: string
  setupSnapshotText: string
  pullbackGuide: string
  entryPlan: string
  sizePlan: string
  trigger: string
  invalidation: string
  reason: string
  suppressedReason?: string
}

export type MarketMoversResponse = {
  ok: boolean
  source: "binance-usdm-24hr-ticker"
  mode: "live-discovery" | "fallback"
  updatedAt: string
  scanIntervalMs: number
  candidates: MarketMoverCandidate[]
  suppressed: MarketMoverCandidate[]
  focusSymbol?: string | null
  focusCandidate?: MarketMoverCandidate | null
  summary: {
    scanned: number
    tradable: number
    strongestSymbol: string | null
    attention: string
    largeCapWatch: number
    filterMode: "quality-first"
  }
  notes: string[]
}
