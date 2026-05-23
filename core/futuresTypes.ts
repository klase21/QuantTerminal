export type FuturesConnectorStatus = "connected" | "partial" | "stale" | "error" | "idle"

export interface FuturesConnectorTelemetry {
  name: "binance-futures-exchange-info" | "binance-futures-open-interest" | "binance-futures-funding"
  status: FuturesConnectorStatus
  latencyMs?: number
  records?: number
  message?: string
}

export interface FuturesSymbolSnapshot {
  symbol: string
  baseAsset: string
  sector: string
  openInterest: number
  markPrice: number
  oiNotional: number
  fundingRate: number
  nextFundingTime?: number
}

export type LeverageState = "LOW" | "BUILDING" | "CROWDED" | "OVERHEATED"
export type FundingBias = "LONGS_PAYING" | "SHORTS_PAYING" | "NEUTRAL"

export interface SectorFuturesSnapshot {
  sector: string
  rank: number
  leverageState: LeverageState
  fundingBias: FundingBias
  oiNotional: number
  oiShare: number
  avgFundingRate: number
  fundingAbs: number
  crowdingScore: number
  leveragePressure: number
  convictionScore: number
  symbolCount: number
  topSymbols: string[]
  evidence: string[]
  operatorRead: string
}

export interface FuturesIntelligenceResponse {
  ok: boolean
  source: "binance-futures"
  updatedAt: string
  mode: "futures-market" | "partial" | "error"
  sectors: SectorFuturesSnapshot[]
  symbols: FuturesSymbolSnapshot[]
  connectors: FuturesConnectorTelemetry[]
  coverage: {
    requestedSymbols: number
    validSymbols: number
    mappedSymbols: number
    sectors: number
  }
  validation: {
    invalidSymbols: string[]
    maxSymbols: number
    concurrency: number
  }
  notes: string[]
}
