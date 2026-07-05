export const AGG_TRADE_SOURCE_ID = "binance-vision" as const
export const AGG_TRADE_PROVIDER = "Binance Vision" as const
export const AGG_TRADE_EXCHANGE = "BINANCE" as const
export const AGG_TRADE_PROVIDER_TIER = "CANONICAL" as const
export const AGG_TRADE_CONFIDENCE = 1 as const

export interface AggTradeSymbolCapability {
  readonly symbol: string
  readonly providerSymbol: string | null
  readonly status: "AVAILABLE" | "UNAVAILABLE"
  readonly reason: string | null
}

export const AGG_TRADE_SUPPORTED_SYMBOLS: ReadonlySet<string> = new Set(["BTCUSDT"])

export function canonicalAggTradeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

export function createBinanceVisionAggTradeCapability(symbol: string): AggTradeSymbolCapability {
  const normalized = canonicalAggTradeSymbol(symbol)
  return AGG_TRADE_SUPPORTED_SYMBOLS.has(normalized)
    ? Object.freeze({ symbol: normalized, providerSymbol: normalized, status: "AVAILABLE", reason: null })
    : Object.freeze({ symbol: normalized, providerSymbol: null, status: "UNAVAILABLE", reason: "Symbol is not in the explicitly approved Binance Vision AggTrade backfill capability map." })
}
