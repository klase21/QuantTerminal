import { SECTOR_REGISTRY, findSectorForSymbol, type SectorId } from "@/core/registry/sectorRegistry"
import { clamp } from "@/core/shared/metrics"
import type { ConnectorQualityStatus, MarketAssetSnapshot, RealMarketDataQuality, RealMarketRotationResponse, RotationDirection, SectorCoverageAudit, SectorRotationSnapshot } from "@/core/marketDataTypes"

export interface BinanceTicker24h {
  symbol: string
  lastPrice?: string
  priceChangePercent?: string
  quoteVolume?: string
  highPrice?: string
  lowPrice?: string
}

export interface UpbitTicker {
  market: string
  trade_price?: number
  signed_change_rate?: number
  acc_trade_price_24h?: number
  high_price?: number
  low_price?: number
}

export interface BuildRealRotationInput {
  binanceTickers: BinanceTicker24h[]
  upbitTickers: UpbitTicker[]
  premium?: number | null
  updatedAt?: string
  connectorQuality?: ConnectorQualityStatus[]
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function baseSymbolFromMarket(market: string) {
  return market.replace(/^KRW-/, "").replace(/USDT$/, "").replace(/BUSD$/, "").replace(/FDUSD$/, "").toUpperCase()
}

function volatilityFromRange(high: number, low: number, last: number) {
  if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(last) || last <= 0) return 0
  return Math.abs((high - low) / last) * 100
}

function directionFrom(score: number, avgPriceChange: number, volumePressure: number, volatility: number): RotationDirection {
  if (score < 35 && volumePressure < 40) return "QUIET"
  if (volumePressure >= 58 && volatility >= 45 && avgPriceChange >= 2) return "INFLOW"
  if (volumePressure >= 58 && volatility >= 45 && avgPriceChange <= -2) return "OUTFLOW"
  if (volumePressure >= 52 && volatility >= 35 && Math.abs(avgPriceChange) < 2.5) return "CHURN"
  if (score >= 62 && avgPriceChange > 0) return "INFLOW"
  if (score >= 62 && avgPriceChange < 0) return "OUTFLOW"
  return "CHURN"
}

function buildEvidence(input: {
  volumePressure: number
  volatility: number
  avgPriceChange: number
  breadth: number
  premiumBoost: number
  regimeFit: number
}) {
  const evidence: string[] = []
  if (input.volumePressure >= 65) evidence.push("volume pressure expanding")
  if (input.volatility >= 55) evidence.push("volatility expansion")
  if (input.avgPriceChange >= 2) evidence.push("positive price momentum")
  if (input.avgPriceChange <= -2) evidence.push("negative price momentum")
  if (input.breadth >= 60) evidence.push("sector breadth positive")
  if (input.premiumBoost >= 55) evidence.push("Korea premium supportive")
  if (input.regimeFit >= 60) evidence.push("regime fit confirmed")
  if (!evidence.length) evidence.push("low-conviction mixed signal")
  return evidence
}

function buildStory(sector: string, direction: RotationDirection, score: number, evidence: string[]) {
  const lead = direction === "INFLOW"
    ? `${sector} is attracting liquidity`
    : direction === "OUTFLOW"
      ? `${sector} is seeing risk exit`
      : direction === "CHURN"
        ? `${sector} is in high-rotation handoff`
        : `${sector} is quiet`
  return `${lead}. Score ${score.toFixed(2)} with ${evidence.slice(0, 3).join(", ")}.`
}

function buildDataQuality(connectors: ConnectorQualityStatus[] | undefined, ok: boolean): RealMarketDataQuality {
  const normalized = connectors?.length ? connectors : [
    { name: "binance", status: ok ? "connected" : "error" },
    { name: "upbit-markets", status: "idle" },
    { name: "upbit-ticker", status: "idle" },
    { name: "datalab", status: "idle" },
  ]
  const errorCount = normalized.filter((connector) => connector.status === "error").length
  const partialCount = normalized.filter((connector) => connector.status === "partial" || connector.status === "stale").length
  const connectedCount = normalized.filter((connector) => connector.status === "connected").length
  const status = !ok || connectedCount === 0
    ? "error"
    : errorCount > 1
      ? "degraded"
      : errorCount || partialCount
        ? "partial"
        : "healthy"

  return {
    status,
    stale: partialCount > 0,
    generatedAt: new Date().toISOString(),
    connectors: normalized,
  }
}

export function buildRealMarketRotation(input: BuildRealRotationInput): RealMarketRotationResponse {
  const upbitBySymbol = new Map<string, UpbitTicker>()
  for (const ticker of input.upbitTickers) {
    upbitBySymbol.set(baseSymbolFromMarket(ticker.market), ticker)
  }

  const assets: MarketAssetSnapshot[] = []
  const seen = new Set<string>()

  for (const ticker of input.binanceTickers) {
    if (!ticker.symbol.endsWith("USDT")) continue
    const symbol = baseSymbolFromMarket(ticker.symbol)
    const sector = findSectorForSymbol(symbol)
    if (!sector) continue

    const upbit = upbitBySymbol.get(symbol)
    const price = num(ticker.lastPrice)
    const high = num(ticker.highPrice)
    const low = num(ticker.lowPrice)
    const binanceVolume = num(ticker.quoteVolume)
    const upbitVolume = num(upbit?.acc_trade_price_24h)
    const priceChange24h = num(ticker.priceChangePercent)
    const upbitChange = typeof upbit?.signed_change_rate === "number" ? upbit.signed_change_rate * 100 : undefined

    assets.push({
      symbol,
      sector,
      price,
      priceChange24h,
      quoteVolume24h: binanceVolume,
      volatilityProxy: volatilityFromRange(high, low, price),
      source: upbit ? "merged" : "binance",
      upbitKrwVolume24h: upbitVolume || undefined,
      upbitPriceChange24h: upbitChange,
    })
    seen.add(symbol)
  }

  for (const upbit of input.upbitTickers) {
    const symbol = baseSymbolFromMarket(upbit.market)
    if (seen.has(symbol)) continue
    const sector = findSectorForSymbol(symbol)
    if (!sector) continue
    const price = num(upbit.trade_price)
    const change = typeof upbit.signed_change_rate === "number" ? upbit.signed_change_rate * 100 : 0
    assets.push({
      symbol,
      sector,
      price,
      priceChange24h: change,
      quoteVolume24h: 0,
      volatilityProxy: volatilityFromRange(num(upbit.high_price), num(upbit.low_price), price),
      source: "upbit",
      upbitKrwVolume24h: num(upbit.acc_trade_price_24h),
      upbitPriceChange24h: change,
    })
  }

  const totalVolume = assets.reduce((sum, asset) => sum + asset.quoteVolume24h, 0) || 1
  const maxSectorVolume = Math.max(
    1,
    ...SECTOR_REGISTRY.map((sector) =>
      assets.filter((asset) => asset.sector === sector.id).reduce((sum, asset) => sum + asset.quoteVolume24h, 0)
    )
  )
  const maxSectorKrwVolume = Math.max(
    1,
    ...SECTOR_REGISTRY.map((sector) =>
      assets.filter((asset) => asset.sector === sector.id).reduce((sum, asset) => sum + (asset.upbitKrwVolume24h ?? 0), 0)
    )
  )

  const sectors = SECTOR_REGISTRY.map((sector) => {
    const members = assets.filter((asset) => asset.sector === sector.id)
    const assetCount = members.length
    const positiveCount = members.filter((asset) => asset.priceChange24h > 0).length
    const sectorVolume = members.reduce((sum, asset) => sum + asset.quoteVolume24h, 0)
    const sectorKrwVolume = members.reduce((sum, asset) => sum + (asset.upbitKrwVolume24h ?? 0), 0)
    const volumeShare = (sectorVolume / totalVolume) * 100
    const volumePressure = clamp((sectorVolume / maxSectorVolume) * 80 + (sectorKrwVolume / maxSectorKrwVolume) * 20)
    const avgPriceChange = assetCount ? members.reduce((sum, asset) => sum + asset.priceChange24h, 0) / assetCount : 0
    const breadth = assetCount ? (positiveCount / assetCount) * 100 : 0
    const volatility = assetCount ? members.reduce((sum, asset) => sum + asset.volatilityProxy, 0) / assetCount : 0
    const premiumBoost = clamp(50 + (input.premium ?? 0) * 8 + (sectorKrwVolume / maxSectorKrwVolume) * 20)
    const regimeFit = clamp(50 + avgPriceChange * 3 + (breadth - 50) * 0.28 + (volatility - 5) * 1.6)
    const volatilityExpansion = clamp(50 + volatility * 4)
    const priceMomentum = clamp(50 + avgPriceChange * 5)
    const rotationScore = clamp(
      volumePressure * 0.35 +
        volatilityExpansion * 0.2 +
        priceMomentum * 0.2 +
        breadth * 0.15 +
        premiumBoost * 0.1
    )
    const confidence = clamp(rotationScore * 0.72 + Math.min(100, assetCount * 8) * 0.18 + regimeFit * 0.1)
    const direction = directionFrom(rotationScore, avgPriceChange, volumePressure, volatilityExpansion)
    const evidence = buildEvidence({ volumePressure, volatility: volatilityExpansion, avgPriceChange, breadth, premiumBoost, regimeFit })
    const topSymbols = [...members]
      .sort((a, b) => b.quoteVolume24h + (b.upbitKrwVolume24h ?? 0) / 1300 - (a.quoteVolume24h + (a.upbitKrwVolume24h ?? 0) / 1300))
      .slice(0, 5)
      .map((asset) => asset.symbol)

    return {
      sector: sector.id as SectorId,
      rank: 0,
      direction,
      rotationScore,
      confidence,
      volumeShare,
      volumePressure,
      avgPriceChange,
      breadth,
      volatility: volatilityExpansion,
      premiumBoost,
      regimeFit,
      scoreBreakdown: {
        volumePressure,
        volatilityExpansion,
        priceMomentum,
        breadth,
        premiumBoost,
        regimeFit,
      },
      assetCount,
      positiveCount,
      topSymbols,
      evidence,
      story: buildStory(sector.id, direction, rotationScore, evidence),
    } satisfies SectorRotationSnapshot
  })
    .filter((sector) => sector.assetCount > 0)
    .sort((a, b) => b.rotationScore - a.rotationScore)
    .map((sector, index) => ({ ...sector, rank: index + 1 }))

  const coverageAudit: SectorCoverageAudit[] = SECTOR_REGISTRY.map((sector) => {
    const members = assets.filter((asset) => asset.sector === sector.id)
    const activeAssets = members.length
    const registrySymbols = sector.symbols.length || 1
    const coverageRatio = clamp((activeAssets / registrySymbols) * 100)
    return {
      sector: sector.id,
      registrySymbols: sector.symbols.length,
      activeAssets,
      binanceAssets: members.filter((asset) => asset.source === "binance" || asset.source === "merged").length,
      upbitAssets: members.filter((asset) => asset.source === "upbit" || asset.source === "merged").length,
      coverageRatio,
      quality: coverageRatio >= 60 ? "strong" : coverageRatio >= 30 ? "medium" : "thin",
    }
  })

  const dataQuality = buildDataQuality(input.connectorQuality, sectors.length > 0)

  return {
    ok: sectors.length > 0,
    source: "binance-upbit-real-market",
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    mode: sectors.length > 0 ? "real-market" : "error",
    sectors,
    assets,
    endpoints: {
      binanceTicker24h: "https://api.binance.com/api/v3/ticker/24hr",
      upbitMarkets: "https://api.upbit.com/v1/market/all?isDetails=false",
      upbitTicker: "https://api.upbit.com/v1/ticker?markets=KRW-*",
    },
    coverage: {
      binanceSymbols: input.binanceTickers.length,
      upbitSymbols: input.upbitTickers.length,
      mappedAssets: assets.length,
      sectors: sectors.length,
    },
    coverageAudit,
    dataQuality,
    notes: sectors.length ? [] : ["No mapped sector assets were returned from live market APIs."],
  }
}
