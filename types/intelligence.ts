export type MarketRegimeName =
  | "BTC_DEFENSIVE"
  | "ALT_EXPANSION"
  | "ALT_EUPHORIA"
  | "KOREAN_RETAIL_FOMO"
  | "RISK_OFF"
  | "NEUTRAL_ROTATION"

export type TrendState = "UP" | "DOWN" | "FLAT"
export type VolatilityState = "LOW" | "MID" | "HIGH" | "EXTREME"
export type RiskState = "RISK_ON" | "RISK_OFF" | "NEUTRAL"

export interface UpbitDataLabSnapshot {
  timestamp: number
  marketCapT: number
  marketCapChange24h: number
  tradeVolume24hT: number
  tradeVolumeChange24h: number
  fearGreed: number
  fearGreedChange: number
  btcDominance: number
  ethDominance: number
  stableDominance: number
  altSeasonIndex: number
  technicalScore: number
  marketReturn: number
  risingAssetRatio: number
  upbitPremium: number
  upbitPremiumChange: number
  volatility: number
  volatilityChange: number
}

export interface RegimeInput {
  snapshot?: Partial<UpbitDataLabSnapshot>
  sectorScores?: SectorRotationScore[]
  tickerStats?: {
    risingRatio: number
    volumeTrend: TrendState
    avgChange24h: number
    topVolumeSymbols: string[]
  }
}

export interface RegimeSignal {
  label: string
  value: string | number
  weight: number
  direction: "bullish" | "bearish" | "neutral"
}

export interface MarketRegime {
  regime: MarketRegimeName
  confidence: number
  riskState: RiskState
  riskOnScore: number
  altStrength: number
  btcStrength: number
  retailFomoScore: number
  volatilityState: VolatilityState
  liquidityState: TrendState
  summary: string
  signals: RegimeSignal[]
  updatedAt: number
}

export interface SectorRotationScore {
  sector: string
  marketCap: number
  volume: number
  dominance: number
  delta: number
  momentumScore: number
  volumeScore: number
  breadthScore: number
  volatilityScore: number
  rotationScore: number
  confidence: number
  state: "LEADING" | "ACCUMULATING" | "COOLING" | "LAGGING" | "NEUTRAL"
}
