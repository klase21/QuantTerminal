export interface PolymarketLiveValidationIssue {
  level: "info" | "warning" | "error"
  code: string
  message: string
  marketId?: string
  field?: string
}

export interface PolymarketLiveValidationSample {
  marketId: string
  title: string
  status: string
  hasOutcomes: boolean
  hasPrices: boolean
  hasVolume: boolean
  hasLiquidity: boolean
  warningCount: number
  confidence: number
  sourceUrl?: string
  normalizedEventId?: string
}

export interface PolymarketLiveValidationSummary {
  sampleCount: number
  normalizedCount: number
  errorCount: number
  warningCount: number
  averageConfidence: number
  activeCount: number
  closedCount: number
  unknownStatusCount: number
  missingOutcomeCount: number
  missingPriceCount: number
  missingVolumeCount: number
  missingLiquidityCount: number
}

export interface PolymarketLiveValidationResult {
  samples: PolymarketLiveValidationSample[]
  issues: PolymarketLiveValidationIssue[]
  summary: PolymarketLiveValidationSummary
  caveat: string
}
