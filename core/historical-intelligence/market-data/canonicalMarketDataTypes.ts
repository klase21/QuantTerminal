export type CanonicalMarketDataSource =
  | "binance-vision"
  | "binance-historical-api"
  | "binance-funding-api"
  | "binance-open-interest-api"
  | "cryptohftdata"

export type CanonicalExchange =
  | "binance_futures"
  | "binance_spot"
  | "bybit"
  | "hyperliquid"
  | "deribit"

export type CanonicalMarketInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d"

export interface CanonicalOhlcvCandle {
  exchange: CanonicalExchange
  symbol: string
  interval: CanonicalMarketInterval
  openTime: number
  closeTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  source: CanonicalMarketDataSource
  downloadedAt: string
}

export interface CanonicalFundingPoint {
  exchange: CanonicalExchange
  symbol: string
  fundingTime: number
  fundingRate: number
  markPrice: number | null
  source: CanonicalMarketDataSource
}

export interface CanonicalOpenInterestPoint {
  exchange: CanonicalExchange
  symbol: string
  timestamp: number
  openInterest: number
  openInterestValue: number | null
  source: CanonicalMarketDataSource
}

export interface CanonicalLiquidationEvent {
  exchange: CanonicalExchange
  symbol: string
  timestamp: number
  side: "long" | "short" | "unknown"
  price: number
  quantity: number
  notional: number
  source: CanonicalMarketDataSource
}

export type CanonicalOrderbookLevel = [price: number, quantity: number]

export interface CanonicalOrderbookSnapshot {
  exchange: CanonicalExchange
  symbol: string
  timestamp: number
  bestBid: number
  bestAsk: number
  spread: number
  imbalance: number
  bidLiquidity: number
  askLiquidity: number
  bids: CanonicalOrderbookLevel[]
  asks: CanonicalOrderbookLevel[]
  source: CanonicalMarketDataSource
}

export type CanonicalMarketDataDataset =
  | "ohlcv"
  | "funding"
  | "open-interest"
  | "liquidations"
  | "orderbook-snapshots"

export interface CanonicalMarketDataPayload<TRecord> {
  dataset: CanonicalMarketDataDataset
  exchange: CanonicalExchange
  symbol: string
  interval?: CanonicalMarketInterval
  records: TRecord[]
}
