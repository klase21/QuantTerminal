import { SECTOR_REGISTRY, findSectorForSymbol, type SectorId } from "@/core/registry/sectorRegistry"
import type { DerivativesAssetSnapshot, SectorDerivativesSnapshot, StructureState } from "@/core/market-structure/marketStructureTypes"

export interface BinanceOpenInterestPayload {
  symbol?: string
  openInterest?: string
}

export interface BinancePremiumIndexPayload {
  symbol?: string
  markPrice?: string
  lastFundingRate?: string
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stateFromCrowding(score: number): StructureState {
  if (score >= 82) return "CROWDED"
  if (score >= 64) return "EXPANDING"
  if (score >= 42) return "BUILDING"
  if (score >= 22) return "COOLING"
  return "QUIET"
}

export function buildDerivativesAssetSnapshots(
  openInterest: BinanceOpenInterestPayload[],
  premiumIndex: BinancePremiumIndexPayload[]
): DerivativesAssetSnapshot[] {
  const premiumMap = new Map(
    premiumIndex
      .filter((item) => item.symbol)
      .map((item) => [item.symbol as string, item])
  )

  const raw = openInterest
    .map((item) => {
      const symbol = item.symbol ?? ""
      const base = symbol.replace(/USDT$/, "")
      const sector = findSectorForSymbol(base)
      if (!sector) return null
      const premium = premiumMap.get(symbol)
      const openInterestValue = toNumber(item.openInterest)
      const markPrice = toNumber(premium?.markPrice)
      const fundingRate = toNumber(premium?.lastFundingRate)
      const openInterestUsd = openInterestValue * markPrice
      return {
        symbol,
        sector,
        openInterest: openInterestValue,
        openInterestUsd,
        fundingRate,
        markPrice,
        notionalWeight: 0,
      } satisfies DerivativesAssetSnapshot
    })
    .filter(Boolean) as DerivativesAssetSnapshot[]

  const totalOiUsd = raw.reduce((sum, item) => sum + item.openInterestUsd, 0)
  return raw.map((item) => ({
    ...item,
    notionalWeight: totalOiUsd > 0 ? item.openInterestUsd / totalOiUsd : 0,
  }))
}

export function aggregateDerivativesBySector(assets: DerivativesAssetSnapshot[]): SectorDerivativesSnapshot[] {
  const maxOi = Math.max(1, ...assets.map((asset) => asset.openInterestUsd))
  const totalOi = assets.reduce((sum, asset) => sum + asset.openInterestUsd, 0)

  return SECTOR_REGISTRY.map((sector) => {
    const sectorAssets = assets.filter((asset) => asset.sector === sector.id)
    const openInterestUsd = sectorAssets.reduce((sum, asset) => sum + asset.openInterestUsd, 0)
    const avgFundingRate = sectorAssets.length
      ? sectorAssets.reduce((sum, asset) => sum + asset.fundingRate, 0) / sectorAssets.length
      : 0
    const oiShare = totalOi > 0 ? (openInterestUsd / totalOi) * 100 : 0
    const sectorMaxOi = Math.max(0, ...sectorAssets.map((asset) => asset.openInterestUsd))
    const fundingHeat = clamp(Math.abs(avgFundingRate) * 100000)
    const notionalHeat = clamp((sectorMaxOi / maxOi) * 100)
    const leverageCrowding = clamp(notionalHeat * 0.62 + fundingHeat * 0.38)
    const state = stateFromCrowding(leverageCrowding)
    const evidence = [
      `${sectorAssets.length} futures symbols mapped`,
      `${oiShare.toFixed(2)}% OI share`,
      `${(avgFundingRate * 100).toFixed(4)}% avg funding`,
    ]
    return {
      sector: sector.id,
      assets: sectorAssets.length,
      openInterestUsd,
      avgFundingRate,
      oiShare,
      leverageCrowding,
      state,
      evidence,
    } satisfies SectorDerivativesSnapshot
  })
}

export function pickDerivativeSymbols(limitPerSector = 5) {
  return [...new Set(
    SECTOR_REGISTRY.flatMap((sector) => sector.symbols.slice(0, limitPerSector).map((symbol) => `${symbol}USDT`))
  )]
}
