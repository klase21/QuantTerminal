export type MarketStateDirection = "bullish" | "bearish" | "neutral"
export type LiquidityState = "improving" | "weakening" | "stable" | "unknown"
export type FlowState = "positive" | "negative" | "neutral" | "unknown"
export type PredictionBias = "bullish" | "bearish" | "neutral" | "unknown"

export type HistoricalInterval = "1h" | "4h" | "1d"
export type DominantOutcome = "bullish_continuation" | "bearish_continuation" | "range_continuation" | "mixed"
export type VerdictHorizon = "1h" | "4h" | "24h" | "7d"
export type MarketMemoryEventCategory =
  | "ETF"
  | "AI"
  | "BITCOIN"
  | "ETHEREUM"
  | "STABLECOIN"
  | "MEME"
  | "LAYER1"
  | "DEFI"
  | "RISK_ON"
  | "RISK_OFF"
  | "MACRO"
  | "MARKET"

export type MarketOhlcvRow = {
  id: string
  source: "binance-vision"
  symbol: string
  interval: HistoricalInterval
  openTime: number
  closeTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  quoteVolume: number
  tradeCount: number
  takerBuyVolume: number
  takerBuyQuoteVolume: number
  createdAt: string
}

export type IngestionJobStatus = "pending" | "downloading" | "parsing" | "completed" | "failed" | "skipped"

export type IngestionJob = {
  id: string
  source: "binance-vision"
  dataset: "futures-um-monthly-klines"
  symbol: string
  interval: HistoricalInterval
  period: string
  status: IngestionJobStatus
  fileUrl: string
  rowsInserted: number
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export type HistoricalMarketSnapshot = {
  id: string
  symbol: string
  interval: HistoricalInterval
  timestamp: number
  close: number
  priceChange1h: number | null
  priceChange4h: number | null
  priceChange1d: number | null
  priceChange7d: number | null
  volatilityState: "high_volatility" | "normal_volatility" | "low_volatility"
  momentumState: "bullish_momentum" | "bearish_momentum" | "neutral_momentum"
  rangeState: "upper_range" | "lower_range" | "range_middle"
  breakoutState: "testing_upper_range" | "testing_lower_range" | "range_middle"
  marketDirection: "bullish" | "bearish" | "neutral"
  forwardReturn1d: number | null
  forwardReturn7d: number | null
  forwardReturn30d: number | null
  createdAt: string
}

export type DashboardMarketStateSnapshot = {
  id: string
  timestamp: string
  symbol: string
  direction: MarketStateDirection
  confidence: number | null
  bullFactors: number
  bearFactors: number
  driversJson: string
  liquidityState: LiquidityState
  narrativesJson: string
  narrativeHeat?: "very_hot" | "hot" | "neutral" | "quiet" | "unknown"
  dominantNarrative?: string | null
  sectorRotationState?: "improving" | "weakening" | "mixed" | "unknown"
  predictionState: PredictionBias
  etfFlowState: FlowState
  createdAt: string
}

export type MarketMemoryEvent = {
  id: string
  eventDate: string
  title: string
  category: MarketMemoryEventCategory
  tags: string[]
  direction: MarketStateDirection
  description: string
  createdAt: string
}

export type MarketOutcome = {
  id: string
  snapshotId: string
  symbol: string
  interval: HistoricalInterval
  timestamp: number
  setupKey: string
  direction: MarketStateDirection
  momentumState: HistoricalMarketSnapshot["momentumState"]
  breakoutState: HistoricalMarketSnapshot["breakoutState"]
  volatilityState: HistoricalMarketSnapshot["volatilityState"]
  narrativeTagsJson: string
  liquidityState: LiquidityState
  sectorRotationState: NonNullable<DashboardMarketStateSnapshot["sectorRotationState"]>
  forwardReturn1d: number | null
  forwardReturn7d: number | null
  forwardReturn30d: number | null
  success1d: boolean | null
  success7d: boolean | null
  success30d: boolean | null
  dominantOutcome: DominantOutcome
  createdAt: string
}

export type MarketMemoryStats = {
  totalCases: number
  avgReturn1d: number | null
  avgReturn7d: number | null
  avgReturn30d: number | null
  successRate1d: number | null
  successRate7d: number | null
  successRate30d: number | null
  dominantOutcome: string | null
  strongestMatchedContext: string | null
  weakestMatchedContext: string | null
  bestPerformingSetup: string | null
  worstPerformingSetup: string | null
}

export type HistoricalAnalogRecord = {
  id: string
  createdAt: string
  currentSymbol: string
  currentTimestamp: string
  currentDirection: MarketStateDirection
  interval: HistoricalInterval
  matchedSymbol: string
  matchedSnapshotId: string
  matchedTimestamp: number
  matchedDate: string
  matchedConditionsJson: string
  source: "binance-vision" | "local-market-ohlcv-db" | "market-memory-snapshots"
  queryPath: string
}

export type VerdictRecordStatus = "completed" | "insufficient_data"

export type VerdictRecord = {
  id: string
  analogRecordId: string
  createdAt: string
  symbol: string
  direction: MarketStateDirection
  horizon: VerdictHorizon
  baseTimestamp: number
  basePrice: number
  targetTimestamp: number
  outcomeTimestamp: number | null
  forwardReturn: number | null
  success: boolean | null
  status: VerdictRecordStatus
}

export type VerdictHorizonStats = {
  total: number
  completed: number
  winRate: number | null
  avgForwardReturn: number | null
}

export type VerdictAccuracyStats = {
  status: "available" | "insufficient_cases"
  totalVerdicts: number
  completedOutcomes: number
  byHorizon: Record<VerdictHorizon, VerdictHorizonStats>
}

export type DashboardHistoricalAnalogResponse = {
  status: "available" | "unavailable"
  source?: "binance-vision" | "local-market-ohlcv-db" | "market-memory-snapshots"
  queryPath?: string
  requestedSymbol?: string
  sourceSymbol?: string
  benchmarkUsed?: string
  benchmarkReason?: string
  currentDirection?: MarketStateDirection
  recordCountSearched: number
  message?: "NO VERIFIED ANALOG" | "NO VERIFIED MEMORY"
  reason?: string
  stats?: {
    totalCases: number
    avgReturn7d: number | null
    avgReturn30d: number | null
    successRate: number | null
    dominantOutcome: string | null
  }
  similarCases?: number
  accuracyStats?: VerdictAccuracyStats
  match?: {
    symbol?: string
    date: string
    daysAgo?: number
    label: string
    matchedConditions: string[]
    outcomeSummary: string
    outcomeStats?: {
      found: number
      avg7d: number | null
      avg30d: number | null
      successRate: number | null
    }
  }
  alternatives?: Array<{
    symbol?: string
    date: string
    daysAgo?: number
    label: string
    outcomeSummary: string
  }>
}
