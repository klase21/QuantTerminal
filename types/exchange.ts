export type ExchangeId =
  | "binance"
  | "bybit"
  | "hyperliquid"
  | "deribit"
  | "polymarket"
  | "unknown"

export type ExchangeSymbol = {
  exchange: ExchangeId
  symbol: string
}

export type ExchangeAwareInstrument = ExchangeSymbol & {
  displaySymbol: string
  marketType?: "spot" | "perp" | "option" | "prediction" | "unknown"
}
