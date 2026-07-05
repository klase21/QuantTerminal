export const FUNDING_PROVIDER_IDS = ["binance-vision", "binance-official-rest-funding-rate", "coinalyze"] as const
export type FundingProviderId = typeof FUNDING_PROVIDER_IDS[number]
export type FundingCapabilityStatus = "AVAILABLE" | "UNAVAILABLE"

export interface FundingSourceDefinition {
  readonly providerId: FundingProviderId
  readonly displayName: string
  readonly role: "PRIMARY" | "RECENT_GAP_PRIMARY" | "SECONDARY_CROSS_CHECK"
  readonly boundary: "DIRECT_PROVIDER_ARCHIVE" | "DIRECT_OFFICIAL_REST" | "EXPLICIT_PROVIDER_ADAPTER_REQUIRED"
  readonly productionApproved: boolean
  readonly authoritative: boolean
}

export interface FundingSymbolCapability {
  readonly providerId: FundingProviderId
  readonly symbol: string
  readonly providerSymbol: string | null
  readonly status: FundingCapabilityStatus
  readonly reason: string | null
}

export interface FundingSymbolCapabilityMap {
  readonly symbol: string
  readonly primary: FundingSymbolCapability
  readonly crossCheck: FundingSymbolCapability
}

export const FUNDING_SOURCES: readonly FundingSourceDefinition[] = Object.freeze([
  Object.freeze({ providerId: "binance-vision", displayName: "Binance Vision", role: "PRIMARY", boundary: "DIRECT_PROVIDER_ARCHIVE", productionApproved: true, authoritative: true }),
  Object.freeze({ providerId: "binance-official-rest-funding-rate", displayName: "Binance Official REST Funding Rate", role: "RECENT_GAP_PRIMARY", boundary: "DIRECT_OFFICIAL_REST", productionApproved: true, authoritative: true }),
  Object.freeze({ providerId: "coinalyze", displayName: "Coinalyze", role: "SECONDARY_CROSS_CHECK", boundary: "EXPLICIT_PROVIDER_ADAPTER_REQUIRED", productionApproved: false, authoritative: false }),
])

function canonicalSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

export function createBinanceFundingCapability(symbol: string): FundingSymbolCapability {
  const normalized = canonicalSymbol(symbol)
  if (!/^[A-Z0-9]{5,30}$/.test(normalized)) {
    return Object.freeze({ providerId: "binance-vision", symbol: normalized, providerSymbol: null, status: "UNAVAILABLE", reason: "Symbol is not a canonical Binance Futures symbol." })
  }
  return Object.freeze({ providerId: "binance-vision", symbol: normalized, providerSymbol: normalized, status: "AVAILABLE", reason: null })
}

export function createCoinalyzeFundingCapability(
  symbol: string,
  providerSymbols?: ReadonlyMap<string, string>,
): FundingSymbolCapability {
  const normalized = canonicalSymbol(symbol)
  const providerSymbol = providerSymbols?.get(normalized)?.trim()
  return providerSymbol
    ? Object.freeze({ providerId: "coinalyze", symbol: normalized, providerSymbol, status: "AVAILABLE", reason: null })
    : Object.freeze({ providerId: "coinalyze", symbol: normalized, providerSymbol: null, status: "UNAVAILABLE", reason: "Coinalyze has no explicit provider instrument mapping for this Binance Futures symbol." })
}

export function createFundingSymbolCapabilityMap(
  binanceSymbols: readonly string[],
  coinalyzeSymbols?: ReadonlyMap<string, string>,
): readonly FundingSymbolCapabilityMap[] {
  const unique = [...new Set(binanceSymbols.map(canonicalSymbol))].sort()
  return Object.freeze(unique.map((symbol) => Object.freeze({
    symbol,
    primary: createBinanceFundingCapability(symbol),
    crossCheck: createCoinalyzeFundingCapability(symbol, coinalyzeSymbols),
  })))
}
