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
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

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
  toleranceMs = 48 * 60 * 60 * 1000,
) {
  if (anchorTimestamp === null) return true
  const timestamp = observedAt(artifact)
  return timestamp !== null && Math.abs(anchorTimestamp - timestamp) <= toleranceMs
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
    metric.key === "total_liquidation" || metric.key === "total"
  ))?.value
  if (!finite(total)) return null
  return {
    category,
    title: "Liquidation activity",
    evidence: {
      sourceArtifactId: artifact.id,
      source: source.source,
      observedAt: source.observedAt,
      value: total,
      unit: "USD",
      direction: "neutral",
      summary: source.summary,
    },
    impactScore: boundedScore(Math.log10(1 + Math.abs(total)) / 8 * 100),
    quality: qualityFromArtifact(artifact, source.quality),
  }
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
    : null

  for (const candidate of [
    newestEtf && etfDriver(newestEtf),
    newestExchange && exchangeFlowDriver(newestExchange),
    newestTreasury && treasuryDriver(newestTreasury),
    newestAnalog && historicalAnalogDriver(newestAnalog),
    newestEvent && eventImpactDriver(newestEvent),
  ]) {
    if (candidate) drivers.push(candidate)
  }
  if (newestReplay && temporallyAligned(newestReplay, currentEvidenceAnchor)) {
    drivers.push(...replayDrivers(newestReplay))
  }

  const ranked = rankedDrivers(drivers)
  const availableCategories = [
    ...new Set(ranked.map((driver) => driver.category)),
  ]
  const missingCategories = MARKET_DRIVER_CATEGORIES.filter(
    (category) => !availableCategories.includes(category),
  )
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
