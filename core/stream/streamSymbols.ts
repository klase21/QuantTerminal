import { SECTOR_REGISTRY } from "@/core/registry/sectorRegistry"

export function getRegistryBaseSymbols() {
  return [...new Set(SECTOR_REGISTRY.flatMap((sector) => sector.symbols.map((symbol) => symbol.toUpperCase())))]
}

export function getRegistryBinanceSpotSymbols() {
  return getRegistryBaseSymbols().map((symbol) => `${symbol}USDT`)
}

export function getRegistryUpbitKrwMarkets() {
  return getRegistryBaseSymbols().map((symbol) => `KRW-${symbol}`)
}
