import {
  MARKET_DRIVER_CATEGORIES,
  MARKET_DRIVER_SCHEMA_VERSION,
  aggregateQuality,
  boundedScore,
  evidenceConfidence,
  evidenceDirection,
  rankedDrivers,
  type MarketDriver,
  type MarketDriverCategory,
  type MarketDriverQuality,
  type MarketDriverSummary,
} from "@/core/market-driver-engine"
import type {
  EtfArtifactMetadata,
  EtfSnapshot,
} from "@/core/etf-intelligence"
import type {
  ExchangeFlowArtifactMetadata,
  ExchangeFlowSnapshot,
} from "@/core/exchange-flow"
import type {
  FlowReplayArtifactMetadata,
  FlowReplayEvidence,
} from "@/core/flow-replay"
import type {
  EventImpactArtifactMetadata,
  HistoricalAnalogArtifactMetadata,
  IntelligenceArtifact,
} from "@/core/intelligence-artifacts"
import type {
  TreasuryArtifactMetadata,
  TreasurySnapshot,
} from "@/core/treasury-intelligence"
import {
  readLatestLiquidationEvidence,
  type LiquidationEvidence,
} from "@/core/liquidation-intelligence"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

const BINANCE_FAPI = "https://fapi.binance.com"
const CURRENT_EVIDENCE_TOLERANCE_MS = 48 * 60 * 60 * 1000

interface BinanceCurrentEvidence {
  fundingRate: number | null
  fundingObservedAt: string | null
  openInterestChangePercent: number | null
  priceChangePercent: number | null
  openInterestObservedAt: string | null
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function baseAsset(symbol: string) {
  return symbol.trim().toUpperCase().replace(/(?:USDT|USDC|USD|BUSD)$/, "")
}

function qualityFromArtifact(
  artifact: IntelligenceArtifact,
  declared?: string,
): MarketDriverQuality {
  if (declared === "unavailable") return "unavailable"
  if (
    artifact.validity.coverageStatus === "UNAVAILABLE"
    || artifact.validity.freshnessStatus === "EXPIRED"
  ) return "unavailable"
  if (
    declared === "degraded"
    || artifact.validity.coverageStatus === "PARTIAL"
    || artifact.validity.freshnessStatus === "STALE"
  ) return "degraded"
  if (declared === "unknown" || artifact.validity.freshnessStatus === "UNKNOWN") {
    return declared === "verified" ? "verified" : "unknown"
  }
  return "verified"
}

function latest(artifacts: IntelligenceArtifact[]) {
  return [...artifacts].sort((left, right) => (
    Date.parse(right.generatedAt) - Date.parse(left.generatedAt)
  ))[0]
}

function observedAt(artifact: IntelligenceArtifact) {
  const timestamp = Date.parse(artifact.validity.observedAt ?? "")
  return Number.isFinite(timestamp) ? timestamp : null
}

function temporallyAligned(
  artifact: IntelligenceArtifact,
  anchorTimestamp: number | null,
  toleranceMs = CURRENT_EVIDENCE_TOLERANCE_MS,
) {
  if (anchorTimestamp === null) return true
  const timestamp = observedAt(artifact)
  return timestamp !== null && Math.abs(anchorTimestamp - timestamp) <= toleranceMs
}

function usableCurrentArtifact(
  artifact: IntelligenceArtifact,
  anchorTimestamp: number | null,
) {
  return (
    artifact.validity.freshnessStatus !== "STALE"
    && artifact.validity.freshnessStatus !== "EXPIRED"
    && temporallyAligned(artifact, anchorTimestamp)
  )
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, { cache: "no-store", signal })
  if (!response.ok) throw new Error(`Binance returned HTTP ${response.status}.`)
  return response.json() as Promise<unknown>
}

async function fetchBinanceCurrentEvidence(
  symbol: string,
): Promise<BinanceCurrentEvidence | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6_000)
  try {
    const premiumUrl = new URL(`${BINANCE_FAPI}/fapi/v1/premiumIndex`)
    premiumUrl.searchParams.set("symbol", symbol)
    const oiUrl = new URL(`${BINANCE_FAPI}/futures/data/openInterestHist`)
    oiUrl.searchParams.set("symbol", symbol)
    oiUrl.searchParams.set("period", "5m")
    oiUrl.searchParams.set("limit", "3")
    const klineUrl = new URL(`${BINANCE_FAPI}/fapi/v1/klines`)
    klineUrl.searchParams.set("symbol", symbol)
    klineUrl.searchParams.set("interval", "5m")
    klineUrl.searchParams.set("limit", "3")

    const [premiumResult, oiResult, klineResult] = await Promise.allSettled([
      fetchJson(premiumUrl.toString(), controller.signal),
      fetchJson(oiUrl.toString(), controller.signal),
      fetchJson(klineUrl.toString(), controller.signal),
    ])
    const premium = premiumResult.status === "fulfilled"
      && premiumResult.value && typeof premiumResult.value === "object"
      && !Array.isArray(premiumResult.value)
      ? premiumResult.value as Record<string, unknown>
      : null
    const oiRows = oiResult.status === "fulfilled" && Array.isArray(oiResult.value)
      ? oiResult.value.filter((row): row is Record<string, unknown> => (
          Boolean(row) && typeof row === "object" && !Array.isArray(row)
        ))
      : []
    const klines = klineResult.status === "fulfilled" && Array.isArray(klineResult.value)
      ? klineResult.value.filter(Array.isArray)
      : []

    const firstOi = numberValue(oiRows[0]?.sumOpenInterest)
    const lastOi = numberValue(oiRows.at(-1)?.sumOpenInterest)
    const oiTimestamp = numberValue(oiRows.at(-1)?.timestamp)
    const firstPrice = numberValue(klines[0]?.[1])
    const lastPrice = numberValue(klines.at(-1)?.[4])
    const fundingTimestamp = numberValue(premium?.time)
    const fundingRate = numberValue(premium?.lastFundingRate)
    const openInterestChangePercent = firstOi !== null && lastOi !== null && firstOi > 0
      ? ((lastOi - firstOi) / firstOi) * 100
      : null
    const priceChangePercent = firstPrice !== null && lastPrice !== null && firstPrice > 0
      ? ((lastPrice - firstPrice) / firstPrice) * 100
      : null

    if (
      fundingRate === null
      && openInterestChangePercent === null
      && priceChangePercent === null
    ) return null
    return {
      fundingRate,
      fundingObservedAt: fundingTimestamp === null
        ? null
        : new Date(fundingTimestamp).toISOString(),
      openInterestChangePercent,
      priceChangePercent,
      openInterestObservedAt: oiTimestamp === null
        ? null
        : new Date(oiTimestamp).toISOString(),
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function currentFundingDriver(
  symbol: string,
  evidence: BinanceCurrentEvidence,
): MarketDriver | null {
  if (!finite(evidence.fundingRate)) return null
  return {
    category: "funding",
    title: `${symbol} current funding`,
    evidence: {
      sourceArtifactId: `binance-current-funding:${symbol}`,
      source: "binance-futures-premium-index",
      observedAt: evidence.fundingObservedAt,
      value: evidence.fundingRate,
      unit: "rate",
      direction: percentDirection(evidence.fundingRate),
      summary: `Current Binance Futures funding rate was ${evidence.fundingRate}.`,
    },
    impactScore: boundedScore(Math.abs(evidence.fundingRate) * 1_000_000),
    quality: evidence.fundingObservedAt ? "verified" : "degraded",
  }
}

function currentOpenInterestDriver(
  symbol: string,
  evidence: BinanceCurrentEvidence,
): MarketDriver | null {
  const oiChange = evidence.openInterestChangePercent
  const priceChange = evidence.priceChangePercent
  if (!finite(oiChange) || !finite(priceChange)) return null
  const direction = oiChange > 0
    ? priceChange > 0
      ? "positive" as const
      : priceChange < 0
        ? "negative" as const
        : "neutral" as const
    : "neutral" as const
  return {
    category: "open_interest",
    title: `${symbol} open interest and price`,
    evidence: {
      sourceArtifactId: `binance-current-open-interest:${symbol}`,
      source: "binance-futures-open-interest-history",
      observedAt: evidence.openInterestObservedAt,
      value: oiChange,
      unit: "percent change",
      direction,
      summary: `Open interest changed ${oiChange.toFixed(4)}% while price changed ${priceChange.toFixed(4)}% over the sampled 5m observations.`,
    },
    impactScore: boundedScore(
      Math.abs(oiChange) * 20 + Math.abs(priceChange) * 10,
    ),
    quality: evidence.openInterestObservedAt ? "verified" : "degraded",
  }
}

function percentDirection(value: number) {
  return value > 0 ? "positive" as const : value < 0 ? "negative" as const : "neutral" as const
}

function etfDriver(artifact: IntelligenceArtifact): MarketDriver | null {
  const snapshot = (artifact.metadata as Partial<EtfArtifactMetadata>).snapshot
  if (!snapshot || !finite(snapshot.netInflowUsd)) return null
  const quality = qualityFromArtifact(artifact, snapshot.quality)
  const direction = percentDirection(snapshot.netInflowUsd)
  return {
    category: "etf",
    title: `${snapshot.asset} ETF net flow`,
    evidence: {
      sourceArtifactId: artifact.id,
      source: snapshot.source,
      observedAt: snapshot.timestamp,
      value: snapshot.netInflowUsd,
      unit: "USD",
      direction,
      summary: `${snapshot.asset} ETF net flow was ${snapshot.netInflowUsd} USD.`,
    },
    impactScore: boundedScore(
      Math.log10(1 + Math.abs(snapshot.netInflowUsd)) / 8 * 100,
    ),
    quality,
  }
}

function exchangeFlowDriver(artifact: IntelligenceArtifact): MarketDriver | null {
  const snapshot = (artifact.metadata as Partial<ExchangeFlowArtifactMetadata>).snapshot
  if (!snapshot || !finite(snapshot.netFlow)) return null
  const ratio = snapshot.holdings > 0
    ? Math.abs(snapshot.netFlow) / snapshot.holdings
    : null
  const direction = snapshot.netFlow < 0
    ? "positive" as const
    : snapshot.netFlow > 0
      ? "negative" as const
      : "neutral" as const
  return {
    category: "exchange_flow",
    title: `${snapshot.exchange} ${snapshot.asset} net exchange flow`,
    evidence: {
      sourceArtifactId: artifact.id,
      source: snapshot.source,
      observedAt: snapshot.timestamp,
      value: snapshot.netFlow,
      unit: "provider asset units",
      direction,
      summary: `Net exchange flow was ${snapshot.netFlow}; negative values represent net outflow.`,
    },
    impactScore: ratio === null
      ? 10
      : boundedScore(ratio * 1_000),
    quality: qualityFromArtifact(artifact, snapshot.sourceQuality),
  }
}

function treasuryDriver(artifact: IntelligenceArtifact): MarketDriver | null {
  const snapshot = (artifact.metadata as Partial<TreasuryArtifactMetadata>).snapshot
  if (!snapshot || !finite(snapshot.changeAmount) || snapshot.changeAmount === 0) return null
  const ratio = snapshot.holdings > 0
    ? Math.abs(snapshot.changeAmount) / snapshot.holdings
    : null
  return {
    category: "treasury",
    title: `${snapshot.holder} ${snapshot.asset} treasury change`,
    evidence: {
      sourceArtifactId: artifact.id,
      source: snapshot.source,
      observedAt: snapshot.timestamp,
      value: snapshot.changeAmount,
      unit: snapshot.asset,
      direction: percentDirection(snapshot.changeAmount),
      summary: `${snapshot.holder} treasury holdings changed by ${snapshot.changeAmount} ${snapshot.asset}.`,
    },
    impactScore: ratio === null ? 10 : boundedScore(ratio * 1_000),
    quality: qualityFromArtifact(artifact, snapshot.quality),
  }
}

function liquidationDriver(evidence: LiquidationEvidence): MarketDriver | null {
  const { longLiquidation, shortLiquidation, totalLiquidation } = evidence.totals
  if (
    !finite(longLiquidation)
    || !finite(shortLiquidation)
    || !finite(totalLiquidation)
    || totalLiquidation <= 0
  ) return null
  const direction = shortLiquidation > longLiquidation
    ? "positive" as const
    : longLiquidation > shortLiquidation
      ? "negative" as const
      : "neutral" as const
  return {
    category: "liquidation",
    title: `${evidence.symbol ?? "Market"} liquidation activity`,
    evidence: {
      sourceArtifactId: evidence.evidenceId,
      source: evidence.source,
      observedAt: evidence.symbols[0]?.lastTimestamp ?? evidence.window.end,
      value: totalLiquidation,
      unit: "USD",
      direction,
      summary: `Long liquidations were ${longLiquidation} USD; short liquidations were ${shortLiquidation} USD.`,
    },
    impactScore: boundedScore(
      Math.log10(1 + Math.abs(totalLiquidation)) / 8 * 100,
    ),
    quality: evidence.sourceQuality,
  }
}

function historicalAnalogDriver(artifact: IntelligenceArtifact): MarketDriver | null {
  const metadata = artifact.metadata as Partial<HistoricalAnalogArtifactMetadata>
  const stats = metadata.statistics?.byHorizon?.["24h"]
  if (!stats || !finite(stats.averageReturn)) return null
  const quality = qualityFromArtifact(artifact)
  return {
    category: "historical_analog",
    title: "Historical analog context",
    evidence: {
      sourceArtifactId: artifact.id,
      source: artifact.source.dataset ?? artifact.source.system,
      observedAt: artifact.validity.observedAt,
      value: stats.averageReturn,
      unit: "percent",
      direction: percentDirection(stats.averageReturn),
      summary: `${stats.caseCount} comparable cases averaged ${stats.averageReturn}% over 24h.`,
    },
    impactScore: boundedScore(
      Math.abs(stats.averageReturn) * 20 * Math.min(1, stats.caseCount / 20),
    ),
    quality,
  }
}

function eventImpactDriver(artifact: IntelligenceArtifact): MarketDriver | null {
  const metadata = artifact.metadata as Partial<EventImpactArtifactMetadata>
  const stats = metadata.statistics?.byHorizon?.["24h"]
  if (!stats || !finite(stats.averageReturn)) return null
  return {
    category: "event_impact",
    title: `${metadata.category ?? "Verified"} event context`,
    evidence: {
      sourceArtifactId: artifact.id,
      source: artifact.source.dataset ?? artifact.source.system,
      observedAt: artifact.validity.observedAt,
      value: stats.averageReturn,
      unit: "percent",
      direction: percentDirection(stats.averageReturn),
      summary: `${stats.sampleCount} verified event outcomes averaged ${stats.averageReturn}% over 24h.`,
    },
    impactScore: boundedScore(
      Math.abs(stats.averageReturn) * 20 * Math.min(1, stats.sampleCount / 10),
    ),
    quality: qualityFromArtifact(artifact),
  }
}

function replayDrivers(artifact: IntelligenceArtifact): MarketDriver[] {
  const flowReplay = (artifact.metadata as Partial<FlowReplayArtifactMetadata>).flowReplay
  if (!flowReplay) return []
  const drivers: MarketDriver[] = []
  const funding = positioningDriver(artifact, flowReplay, "funding")
  const openInterest = positioningDriver(artifact, flowReplay, "open_interest")
  if (funding) drivers.push(funding)
  if (openInterest) drivers.push(openInterest)
  const liquidation = sourceDriver(artifact, flowReplay, "liquidation")
  if (liquidation) drivers.push(liquidation)
  return drivers
}

function positioningDriver(
  artifact: IntelligenceArtifact,
  flowReplay: FlowReplayEvidence,
  category: "funding" | "open_interest",
): MarketDriver | null {
  const evidence = category === "funding"
    ? flowReplay.fundingEvidence
    : flowReplay.openInterestEvidence
  if (!evidence || evidence.availability !== "available" || !finite(evidence.observedValue)) {
    return null
  }
  const isFunding = category === "funding"
  return {
    category,
    title: isFunding ? "Observed funding level" : "Observed open interest level",
    evidence: {
      sourceArtifactId: artifact.id,
      source: evidence.source ?? artifact.source.system,
      observedAt: evidence.observedAt,
      value: evidence.observedValue,
      unit: isFunding ? "rate" : "quantity",
      direction: "neutral",
      summary: `${isFunding ? "Funding" : "Open interest"} was observed at ${evidence.observedValue}; no baseline change is available.`,
    },
    impactScore: isFunding
      ? boundedScore(Math.abs(evidence.observedValue) * 1_000_000)
      : boundedScore(10 + evidence.coverage.pointCount),
    quality: qualityFromArtifact(artifact, evidence.quality),
  }
}

function sourceDriver(
  artifact: IntelligenceArtifact,
  flowReplay: FlowReplayEvidence,
  category: "liquidation",
): MarketDriver | null {
  const source = flowReplay.sources.find((item) => item.kind === category)
  if (!source || source.quality === "unavailable") return null
  const total = source.metrics.find((metric) => (
    metric.key === "notional"
    || metric.key === "total_liquidation"
    || metric.key === "total"
  ))?.value
  if (!finite(total)) return null
  const longLiquidation = source.metrics.find((metric) => (
    metric.key === "long_notional"
  ))?.value
  const shortLiquidation = source.metrics.find((metric) => (
    metric.key === "short_notional"
  ))?.value
  const direction = finite(shortLiquidation) && finite(longLiquidation)
    ? shortLiquidation > longLiquidation
      ? "positive" as const
      : longLiquidation > shortLiquidation
        ? "negative" as const
        : "neutral" as const
    : "neutral" as const
  return {
    category,
    title: "Liquidation activity",
    evidence: {
      sourceArtifactId: artifact.id,
      source: source.source,
      observedAt: source.observedAt,
      value: total,
      unit: "USD",
      direction,
      summary: finite(longLiquidation) && finite(shortLiquidation)
        ? `${source.summary} Long liquidations were ${longLiquidation}; short liquidations were ${shortLiquidation}.`
        : source.summary,
    },
    impactScore: boundedScore(Math.log10(1 + Math.abs(total)) / 8 * 100),
    quality: qualityFromArtifact(artifact, source.quality),
  }
}

function staleArtifactCategories(input: {
  replay?: IntelligenceArtifact
  exchange?: IntelligenceArtifact
  treasury?: IntelligenceArtifact
  liquidation?: LiquidationEvidence | null
  anchorTimestamp: number | null
}) {
  const stale = new Set<MarketDriverCategory>()
  if (input.replay && !temporallyAligned(input.replay, input.anchorTimestamp)) {
    const replay = (input.replay.metadata as Partial<FlowReplayArtifactMetadata>).flowReplay
    if (replay?.fundingEvidence?.availability === "available") stale.add("funding")
    if (replay?.openInterestEvidence?.availability === "available") stale.add("open_interest")
    if (replay?.sources.some((source) => (
      source.kind === "liquidation" && source.quality !== "unavailable"
    ))) stale.add("liquidation")
  }
  if (input.exchange && !usableCurrentArtifact(input.exchange, input.anchorTimestamp)) {
    stale.add("exchange_flow")
  }
  if (input.treasury && !usableCurrentArtifact(input.treasury, input.anchorTimestamp)) {
    stale.add("treasury")
  }
  const liquidationObservedAt = Date.parse(
    input.liquidation?.symbols[0]?.lastTimestamp
      ?? input.liquidation?.window.end
      ?? "",
  )
  if (
    input.liquidation
    && (
      !Number.isFinite(liquidationObservedAt)
      || (
        input.anchorTimestamp !== null
        && Math.abs(input.anchorTimestamp - liquidationObservedAt) > CURRENT_EVIDENCE_TOLERANCE_MS
      )
    )
  ) stale.add("liquidation")
  return stale
}

function relevant(
  artifact: IntelligenceArtifact,
  symbol: string,
) {
  const expected = symbol.toUpperCase()
  const base = baseAsset(expected)
  return (artifact.subjects?.symbols ?? []).some((candidate) => {
    const normalized = candidate.toUpperCase()
    return normalized === expected || normalized === base
  })
}

export async function buildMarketDrivers(input: {
  symbol: string
  registry?: FileBackedIntelligenceArtifactRegistry
}): Promise<MarketDriverSummary> {
  const symbol = input.symbol.trim().toUpperCase()
  if (!symbol) throw new Error("Market Driver symbol is required.")
  const registry = input.registry ?? new FileBackedIntelligenceArtifactRegistry()
  const artifacts = (await registry.list()).filter((artifact) => relevant(artifact, symbol))
  const drivers: MarketDriver[] = []
  const currentDerivativesPromise = fetchBinanceCurrentEvidence(symbol)
  const liquidationPromise = readLatestLiquidationEvidence({
    exchange: "binance_futures",
    symbol,
  })

  const newestEtf = latest(artifacts.filter((artifact) => artifact.type === "etf_snapshot"))
  const newestExchange = latest(artifacts.filter((artifact) => artifact.type === "exchange_flow"))
  const newestTreasury = latest(artifacts.filter((artifact) => artifact.type === "treasury_snapshot"))
  const newestAnalog = latest(artifacts.filter((artifact) => artifact.type === "historical_analog"))
  const newestEvent = latest(artifacts.filter((artifact) => artifact.type === "event_impact"))
  const newestReplay = latest(artifacts.filter((artifact) => artifact.type === "replay_intelligence"))
  const currentEvidenceTimestamps = [
    newestEtf,
    newestExchange,
    newestTreasury,
  ]
    .filter((artifact): artifact is IntelligenceArtifact => Boolean(artifact))
    .map(observedAt)
    .filter((timestamp): timestamp is number => timestamp !== null)
  const currentEvidenceAnchor = currentEvidenceTimestamps.length
    ? Math.max(...currentEvidenceTimestamps)
    : Date.now()
  const newestLiquidation = await liquidationPromise
  const liquidationObservedAt = Date.parse(
    newestLiquidation?.symbols[0]?.lastTimestamp
      ?? newestLiquidation?.window.end
      ?? "",
  )
  const liquidationIsCurrent = (
    newestLiquidation !== null
    && Number.isFinite(liquidationObservedAt)
    && Math.abs(currentEvidenceAnchor - liquidationObservedAt) <= CURRENT_EVIDENCE_TOLERANCE_MS
  )

  for (const candidate of [
    newestEtf && etfDriver(newestEtf),
    newestExchange
      && usableCurrentArtifact(newestExchange, currentEvidenceAnchor)
      && exchangeFlowDriver(newestExchange),
    newestTreasury
      && usableCurrentArtifact(newestTreasury, currentEvidenceAnchor)
      && treasuryDriver(newestTreasury),
    liquidationIsCurrent
      && newestLiquidation
      && liquidationDriver(newestLiquidation),
    newestAnalog && historicalAnalogDriver(newestAnalog),
    newestEvent && eventImpactDriver(newestEvent),
  ]) {
    if (candidate) drivers.push(candidate)
  }
  if (newestReplay && temporallyAligned(newestReplay, currentEvidenceAnchor)) {
    for (const driver of replayDrivers(newestReplay)) {
      if (drivers.some((candidate) => candidate.category === driver.category)) continue
      drivers.push(driver)
    }
  }
  const currentDerivatives = await currentDerivativesPromise
  if (currentDerivatives) {
    const funding = currentFundingDriver(symbol, currentDerivatives)
    const openInterest = currentOpenInterestDriver(symbol, currentDerivatives)
    if (funding) {
      const existing = drivers.findIndex((driver) => driver.category === "funding")
      if (existing >= 0) drivers.splice(existing, 1)
      drivers.push(funding)
    }
    if (openInterest) {
      const existing = drivers.findIndex((driver) => driver.category === "open_interest")
      if (existing >= 0) drivers.splice(existing, 1)
      drivers.push(openInterest)
    }
  }

  const ranked = rankedDrivers(drivers)
  const availableCategories = [
    ...new Set(ranked.map((driver) => driver.category)),
  ]
  const missingCategories = MARKET_DRIVER_CATEGORIES.filter(
    (category) => !availableCategories.includes(category),
  )
  const staleCategories = [
    ...staleArtifactCategories({
      replay: newestReplay,
      exchange: newestExchange,
      treasury: newestTreasury,
      liquidation: newestLiquidation,
      anchorTimestamp: currentEvidenceAnchor,
    }),
  ].filter((category) => !availableCategories.includes(category))
  const timestamps = ranked
    .map((driver) => Date.parse(driver.evidence.observedAt ?? ""))
    .filter(Number.isFinite)
  return {
    schemaVersion: MARKET_DRIVER_SCHEMA_VERSION,
    symbol,
    timestamp: timestamps.length
      ? new Date(Math.max(...timestamps)).toISOString()
      : new Date().toISOString(),
    marketDirection: evidenceDirection(ranked),
    confidence: evidenceConfidence({
      drivers: ranked,
      totalCategories: MARKET_DRIVER_CATEGORIES.length,
    }),
    drivers: ranked,
    availableCategories,
    missingCategories,
    staleCategories,
    quality: aggregateQuality(ranked),
  }
}

export async function discoverMarketDriverSymbols(
  registry = new FileBackedIntelligenceArtifactRegistry(),
) {
  const artifacts = await registry.list()
  const symbols = new Set<string>()
  for (const artifact of artifacts) {
    for (const subject of artifact.subjects?.symbols ?? []) {
      const normalized = subject.trim().toUpperCase()
      if (!normalized) continue
      symbols.add(/(?:USDT|USDC|USD|BUSD)$/.test(normalized)
        ? normalized
        : `${normalized}USDT`)
    }
  }
  return [...symbols].sort()
}
