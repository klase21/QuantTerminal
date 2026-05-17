// ======================================================
// types/market.ts
// ======================================================

export interface Ticker {

  symbol: string

  price: number

  change24h: number

  volume: number

  exchange: string

  timestamp: number

  // ======================================================
  // OPTIONAL METRICS
  // ======================================================

  latency?: number

  quoteVolume?: number

}