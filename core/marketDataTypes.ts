export type RotationDirection = "INFLOW" | "OUTFLOW" | "CHURN" | "QUIET"

export interface MarketAssetSnapshot {
  symbol: string
  sector: string
  price: number
  priceChange24h: number
  quoteVolume24h: number
  volatilityProxy: number
  source: "binance" | "upbit" | "merged"
  upbitKrwVolume24h?: number
  upbitPriceChange24h?: number
}

export interface SectorScoreBreakdown {
  volumePressure: number
  volatilityExpansion: number
  priceMomentum: number
  breadth: number
  premiumBoost: number
  regimeFit: number
}

export interface SectorCoverageAudit {
  sector: string
  registrySymbols: number
  activeAssets: number
  binanceAssets: number
  upbitAssets: number
  coverageRatio: number
  quality: "strong" | "medium" | "thin"
}

export interface ConnectorQualityStatus {
  name: "binance" | "binance-exchange-info" | "upbit-markets" | "upbit-ticker" | "datalab"
  status: "connected" | "partial" | "stale" | "error" | "idle"
  latencyMs?: number
  records?: number
  message?: string
}

export interface RealMarketDataQuality {
  status: "healthy" | "partial" | "degraded" | "error"
  stale: boolean
  generatedAt: string
  connectors: ConnectorQualityStatus[]
}

export interface SectorRotationSnapshot {
  sector: string
  rank: number
  direction: RotationDirection
  rotationScore: number
  confidence: number
  volumeShare: number
  volumePressure: number
  avgPriceChange: number
  breadth: number
  volatility: number
  premiumBoost: number
  regimeFit: number
  assetCount: number
  positiveCount: number
  topSymbols: string[]
  evidence: string[]
  story: string
  scoreBreakdown?: SectorScoreBreakdown
}

export interface RealMarketRotationResponse {
  ok: boolean
  source: string
  updatedAt: string
  mode: "real-market" | "partial" | "error"
  sectors: SectorRotationSnapshot[]
  assets: MarketAssetSnapshot[]
  endpoints: Record<string, string>
  coverage: {
    binanceSymbols: number
    upbitSymbols: number
    mappedAssets: number
    sectors: number
  }
  coverageAudit?: SectorCoverageAudit[]
  dataQuality?: RealMarketDataQuality
  notes: string[]
  binanceValidation?: {
    requestedSymbols: number
    validSymbols: number
    invalidSymbols: string[]
    chunkSize: number
    chunkCount: number
  }
}
