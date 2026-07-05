import type { HistoricalProviderTier } from "@/lib/persistence/repository/types"

export const LIQUIDATION_PROVIDER_IDS = ["binance-vision", "coinalyze-internal-web"] as const
export type LiquidationProviderId = typeof LIQUIDATION_PROVIDER_IDS[number]
export type LiquidationCapabilityStatus = "AVAILABLE" | "UNAVAILABLE"

export interface LiquidationSourceDefinition {
  readonly providerId: LiquidationProviderId
  readonly displayName: string
  readonly role: "PRIMARY" | "SUPPLEMENTAL_VISIBLE_DATA"
  readonly boundary: "DIRECT_PROVIDER_ARCHIVE" | "PUBLIC_VISIBLE_CHART_DATAFEED"
  readonly providerTier: HistoricalProviderTier
  readonly canonical: boolean
  readonly verified: boolean
  readonly confidence: number
}

export interface CoinalyzeInternalLiquidationMapping {
  readonly marketSymbol: string
  readonly longLiquidationSymbol: string
  readonly shortLiquidationSymbol: string
}

export interface LiquidationSymbolCapability {
  readonly providerId: LiquidationProviderId
  readonly symbol: string
  readonly providerSymbol: string | null
  readonly status: LiquidationCapabilityStatus
  readonly reason: string | null
}

export interface LiquidationSymbolCapabilityMap {
  readonly symbol: string
  readonly primary: LiquidationSymbolCapability
  readonly supplemental: LiquidationSymbolCapability
}

export const LIQUIDATION_SOURCES: readonly LiquidationSourceDefinition[] = Object.freeze([
  Object.freeze({ providerId: "binance-vision", displayName: "Binance Vision", role: "PRIMARY", boundary: "DIRECT_PROVIDER_ARCHIVE", providerTier: "CANONICAL", canonical: true, verified: true, confidence: 1 }),
  Object.freeze({ providerId: "coinalyze-internal-web", displayName: "Coinalyze Internal Web", role: "SUPPLEMENTAL_VISIBLE_DATA", boundary: "PUBLIC_VISIBLE_CHART_DATAFEED", providerTier: "EXPERIMENTAL", canonical: false, verified: false, confidence: 0.65 }),
])

export const VERIFIED_COINALYZE_INTERNAL_LIQUIDATION_SYMBOLS: ReadonlyMap<string, CoinalyzeInternalLiquidationMapping> = new Map([
  ["BTCUSDT", Object.freeze({ marketSymbol: "BTCUSDT_PERP.A", longLiquidationSymbol: "BTCUSDT_PERP_LQS.A", shortLiquidationSymbol: "BTCUSDT_PERP_LQB.A" })],
])

export function canonicalLiquidationSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

export function createBinanceLiquidationCapability(symbol: string): LiquidationSymbolCapability {
  const normalized = canonicalLiquidationSymbol(symbol)
  if (!/^[A-Z0-9]{5,30}$/.test(normalized)) {
    return Object.freeze({ providerId: "binance-vision", symbol: normalized, providerSymbol: null, status: "UNAVAILABLE", reason: "Symbol is not a canonical Binance Futures symbol." })
  }
  return Object.freeze({ providerId: "binance-vision", symbol: normalized, providerSymbol: normalized, status: "AVAILABLE", reason: null })
}

export function createCoinalyzeInternalLiquidationCapability(
  symbol: string,
  providerSymbols: ReadonlyMap<string, CoinalyzeInternalLiquidationMapping> = VERIFIED_COINALYZE_INTERNAL_LIQUIDATION_SYMBOLS,
): LiquidationSymbolCapability {
  const normalized = canonicalLiquidationSymbol(symbol)
  const mapping = providerSymbols.get(normalized)
  return mapping
    ? Object.freeze({ providerId: "coinalyze-internal-web", symbol: normalized, providerSymbol: mapping.marketSymbol, status: "AVAILABLE", reason: null })
    : Object.freeze({ providerId: "coinalyze-internal-web", symbol: normalized, providerSymbol: null, status: "UNAVAILABLE", reason: "Coinalyze Internal Web has no explicit visible-data mapping for this Binance Futures symbol." })
}

export function createLiquidationSymbolCapabilityMap(
  binanceSymbols: readonly string[],
  coinalyzeSymbols: ReadonlyMap<string, CoinalyzeInternalLiquidationMapping> = VERIFIED_COINALYZE_INTERNAL_LIQUIDATION_SYMBOLS,
): readonly LiquidationSymbolCapabilityMap[] {
  const unique = [...new Set(binanceSymbols.map(canonicalLiquidationSymbol))].sort()
  return Object.freeze(unique.map((symbol) => Object.freeze({
    symbol,
    primary: createBinanceLiquidationCapability(symbol),
    supplemental: createCoinalyzeInternalLiquidationCapability(symbol, coinalyzeSymbols),
  })))
}
