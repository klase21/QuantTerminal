export const OPEN_INTEREST_PROVIDER_IDS = ["binance-vision", "coinalyze"] as const
export type OpenInterestProviderId = typeof OPEN_INTEREST_PROVIDER_IDS[number]
export type OpenInterestCapabilityStatus = "AVAILABLE" | "UNAVAILABLE"

export interface OpenInterestSourceDefinition {
  readonly providerId: OpenInterestProviderId
  readonly displayName: string
  readonly role: "PRIMARY" | "SECONDARY_CROSS_CHECK"
  readonly boundary: "DIRECT_PROVIDER_ARCHIVE" | "EXPLICIT_PROVIDER_ADAPTER_REQUIRED"
  readonly productionApproved: boolean
  readonly authoritative: boolean
}

export interface OpenInterestSymbolCapability {
  readonly providerId: OpenInterestProviderId
  readonly symbol: string
  readonly providerSymbol: string | null
  readonly status: OpenInterestCapabilityStatus
  readonly reason: string | null
}

export interface OpenInterestSymbolCapabilityMap {
  readonly symbol: string
  readonly primary: OpenInterestSymbolCapability
  readonly crossCheck: OpenInterestSymbolCapability
}

export const OPEN_INTEREST_SOURCES: readonly OpenInterestSourceDefinition[] = Object.freeze([
  Object.freeze({ providerId: "binance-vision", displayName: "Binance Vision", role: "PRIMARY", boundary: "DIRECT_PROVIDER_ARCHIVE", productionApproved: true, authoritative: true }),
  Object.freeze({ providerId: "coinalyze", displayName: "Coinalyze", role: "SECONDARY_CROSS_CHECK", boundary: "EXPLICIT_PROVIDER_ADAPTER_REQUIRED", productionApproved: false, authoritative: false }),
])

export function canonicalOpenInterestSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

export function createBinanceOpenInterestCapability(symbol: string): OpenInterestSymbolCapability {
  const normalized = canonicalOpenInterestSymbol(symbol)
  if (!/^[A-Z0-9]{5,30}$/.test(normalized)) {
    return Object.freeze({ providerId: "binance-vision", symbol: normalized, providerSymbol: null, status: "UNAVAILABLE", reason: "Symbol is not a canonical Binance Futures symbol." })
  }
  return Object.freeze({ providerId: "binance-vision", symbol: normalized, providerSymbol: normalized, status: "AVAILABLE", reason: null })
}

export function createCoinalyzeOpenInterestCapability(
  symbol: string,
  providerSymbols?: ReadonlyMap<string, string>,
): OpenInterestSymbolCapability {
  const normalized = canonicalOpenInterestSymbol(symbol)
  const providerSymbol = providerSymbols?.get(normalized)?.trim()
  return providerSymbol
    ? Object.freeze({ providerId: "coinalyze", symbol: normalized, providerSymbol, status: "AVAILABLE", reason: null })
    : Object.freeze({ providerId: "coinalyze", symbol: normalized, providerSymbol: null, status: "UNAVAILABLE", reason: "Coinalyze has no explicit provider instrument mapping for this Binance Futures symbol." })
}

export function createOpenInterestSymbolCapabilityMap(
  binanceSymbols: readonly string[],
  coinalyzeSymbols?: ReadonlyMap<string, string>,
): readonly OpenInterestSymbolCapabilityMap[] {
  const unique = [...new Set(binanceSymbols.map(canonicalOpenInterestSymbol))].sort()
  return Object.freeze(unique.map((symbol) => Object.freeze({
    symbol,
    primary: createBinanceOpenInterestCapability(symbol),
    crossCheck: createCoinalyzeOpenInterestCapability(symbol, coinalyzeSymbols),
  })))
}
