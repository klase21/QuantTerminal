import { SECTOR_REGISTRY, findSectorForSymbol } from "@/core/registry/sectorRegistry"
import { clamp } from "@/core/shared/metrics"
import type { FuturesConnectorTelemetry, FuturesIntelligenceResponse, FuturesSymbolSnapshot, FundingBias, LeverageState, SectorFuturesSnapshot } from "@/core/futuresTypes"

export interface BuildFuturesIntelligenceInput {
  symbols: FuturesSymbolSnapshot[]
  requestedSymbols: number
  validSymbols: number
  invalidSymbols: string[]
  connectors: FuturesConnectorTelemetry[]
  maxSymbols: number
  concurrency: number
  updatedAt?: string
}

function fundingBiasFrom(avgFundingRate: number): FundingBias {
  if (avgFundingRate > 0.00008) return "LONGS_PAYING"
  if (avgFundingRate < -0.00008) return "SHORTS_PAYING"
  return "NEUTRAL"
}

function leverageStateFrom(crowdingScore: number): LeverageState {
  if (crowdingScore >= 82) return "OVERHEATED"
  if (crowdingScore >= 66) return "CROWDED"
  if (crowdingScore >= 48) return "BUILDING"
  return "LOW"
}

function buildEvidence(input: {
  oiShare: number
  avgFundingRate: number
  fundingAbs: number
  leveragePressure: number
  symbolCount: number
}) {
  const evidence: string[] = []
  if (input.oiShare >= 15) evidence.push("large futures notional share")
  if (input.leveragePressure >= 70) evidence.push("leverage pressure elevated")
  if (input.avgFundingRate > 0.00008) evidence.push("long leverage paying funding")
  if (input.avgFundingRate < -0.00008) evidence.push("short leverage paying funding")
  if (input.fundingAbs >= 0.00018) evidence.push("funding is stretched")
  if (input.symbolCount <= 2) evidence.push("thin derivatives coverage")
  if (!evidence.length) evidence.push("balanced derivatives positioning")
  return evidence
}

function buildOperatorRead(sector: string, state: LeverageState, bias: FundingBias, score: number) {
  if (state === "OVERHEATED") {
    return `${sector} leverage is crowded. Treat directional signals as squeeze-prone until funding and OI cool down.`
  }
  if (state === "CROWDED") {
    return `${sector} derivatives positioning is elevated. Confirm with spot breadth before chasing continuation.`
  }
  if (state === "BUILDING" && bias === "LONGS_PAYING") {
    return `${sector} long-side positioning is building. Watch for continuation if spot liquidity confirms.`
  }
  if (state === "BUILDING" && bias === "SHORTS_PAYING") {
    return `${sector} short-side positioning is building. Watch for squeeze risk if price starts leading.`
  }
  return `${sector} futures pressure is contained. Conviction score ${score.toFixed(0)} suggests derivatives are not the primary driver yet.`
}

export function buildFuturesIntelligence(input: BuildFuturesIntelligenceInput): FuturesIntelligenceResponse {
  const totalOi = input.symbols.reduce((sum, item) => sum + item.oiNotional, 0) || 1
  const maxSectorOi = Math.max(
    1,
    ...SECTOR_REGISTRY.map((sector) => input.symbols
      .filter((item) => item.sector === sector.id)
      .reduce((sum, item) => sum + item.oiNotional, 0)
    )
  )

  const sectors = SECTOR_REGISTRY.map((sector) => {
    const members = input.symbols.filter((item) => item.sector === sector.id)
    const oiNotional = members.reduce((sum, item) => sum + item.oiNotional, 0)
    const symbolCount = members.length
    const avgFundingRate = symbolCount ? members.reduce((sum, item) => sum + item.fundingRate, 0) / symbolCount : 0
    const fundingAbs = symbolCount ? members.reduce((sum, item) => sum + Math.abs(item.fundingRate), 0) / symbolCount : 0
    const oiShare = (oiNotional / totalOi) * 100
    const leveragePressure = clamp((oiNotional / maxSectorOi) * 100)
    const fundingPressure = clamp(Math.abs(avgFundingRate) * 350000)
    const coverageBoost = clamp(symbolCount * 10)
    const crowdingScore = clamp(leveragePressure * 0.56 + fundingPressure * 0.32 + coverageBoost * 0.12)
    const convictionScore = clamp(crowdingScore * 0.7 + Math.min(100, oiShare * 4) * 0.3)
    const leverageState = leverageStateFrom(crowdingScore)
    const fundingBias = fundingBiasFrom(avgFundingRate)
    const evidence = buildEvidence({ oiShare, avgFundingRate, fundingAbs, leveragePressure, symbolCount })
    const topSymbols = [...members]
      .sort((a, b) => b.oiNotional - a.oiNotional)
      .slice(0, 5)
      .map((item) => item.baseAsset)

    return {
      sector: sector.id,
      rank: 0,
      leverageState,
      fundingBias,
      oiNotional,
      oiShare,
      avgFundingRate,
      fundingAbs,
      crowdingScore,
      leveragePressure,
      convictionScore,
      symbolCount,
      topSymbols,
      evidence,
      operatorRead: buildOperatorRead(sector.id, leverageState, fundingBias, convictionScore),
    } satisfies SectorFuturesSnapshot
  })
    .filter((sector) => sector.symbolCount > 0)
    .sort((a, b) => b.crowdingScore - a.crowdingScore)
    .map((sector, index) => ({ ...sector, rank: index + 1 }))

  const errorCount = input.connectors.filter((item) => item.status === "error").length
  return {
    ok: sectors.length > 0,
    source: "binance-futures",
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    mode: sectors.length > 0 ? (errorCount ? "partial" : "futures-market") : "error",
    sectors,
    symbols: input.symbols,
    connectors: input.connectors,
    coverage: {
      requestedSymbols: input.requestedSymbols,
      validSymbols: input.validSymbols,
      mappedSymbols: input.symbols.length,
      sectors: sectors.length,
    },
    validation: {
      invalidSymbols: input.invalidSymbols,
      maxSymbols: input.maxSymbols,
      concurrency: input.concurrency,
    },
    notes: sectors.length ? [] : ["No mapped Binance Futures symbols returned usable OI/funding data."],
  }
}

export function mapFuturesSymbol(symbol: string) {
  const baseAsset = symbol.replace(/USDT$/, "").toUpperCase()
  const sector = findSectorForSymbol(baseAsset)
  return sector ? { symbol, baseAsset, sector } : null
}
