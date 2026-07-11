import type { SourceMetadataEnvelope } from "@/lib/data-governance"
import type {
  AvailabilityModel,
  CoverageModel,
  FreshnessModel,
  LifecycleState,
  MetricViewModel,
  ProvenanceViewModel,
} from "@/lib/design-system"
import type {
  CapitalFlowCategoryViewModel,
  DerivativesHeuristicViewModel,
  DerivativesVenueViewModel,
  MarketsV2ViewModel,
  SecondaryMoverViewModel,
  SectorItemViewModel,
} from "@/lib/markets-presentation/contracts"

export interface MarketsRequestObservation {
  readonly loading: boolean
  readonly error: string | null
  readonly hasPayload: boolean
}

export interface MarketsPresentationInput {
  readonly symbol: string
  readonly exchange: string
  readonly timeframe: string
  readonly inheritedDashboard: {
    readonly label: string
    readonly detail: string
    readonly direction: string | null
    readonly driverCount: number | null
    readonly evidenceCount: number | null
    readonly freshness: string | null
  }
  readonly summaryMetrics: readonly {
    readonly id: string
    readonly label: string
    readonly value: string | number | null
    readonly unit?: string | null
    readonly available: boolean
    readonly source?: string | null
  }[]
  readonly moduleAvailability: readonly boolean[]
  readonly sectorRotation: {
    readonly request: MarketsRequestObservation
    readonly source: SourceMetadataEnvelope | null
    readonly mappedAssets: number | null
    readonly registryAssets: number | null
    readonly sectors: readonly {
      readonly sector: string
      readonly rank: number
      readonly rotationScore: number
      readonly direction: string
      readonly volumeShare?: number | null
      readonly avgPriceChange?: number | null
      readonly breadth?: number | null
      readonly assetCount?: number | null
      readonly positiveCount?: number | null
      readonly topSymbols: readonly string[]
    }[]
  }
  readonly etf: {
    readonly request: MarketsRequestObservation
    readonly source: SourceMetadataEnvelope | null
    readonly row: {
      readonly asset: string
      readonly netFlow: number
      readonly unit: string
      readonly sourceDate: string
      readonly sourceTimestamp?: string | null
    } | null
  }
  readonly reserve: {
    readonly request: MarketsRequestObservation
    readonly freshness: string | null
    readonly observedAt: string | null
    readonly row: {
      readonly asset: string
      readonly observationType: string
      readonly currentBalance?: number | null
      readonly currentBalanceUsd?: number | null
      readonly balanceChange?: number | null
      readonly balanceUsdChange?: number | null
    } | null
  }
  readonly derivatives: {
    readonly fundingRate: number | null
    readonly fundingSource: string | null
    readonly openInterestNotional: number | null
    readonly openInterestSource: string | null
    readonly liquidationState: string
    readonly longLiquidationNotional: number | null
    readonly shortLiquidationNotional: number | null
    readonly venues: readonly {
      readonly name: string
      readonly ok: boolean
      readonly source?: string | null
      readonly fundingRate?: number | null
      readonly openInterestNotional?: number | null
      readonly reason?: string | null
    }[]
    readonly relationships: readonly { readonly label: string; readonly value: string | null }[]
    readonly heuristics: readonly { readonly id: string; readonly label: string; readonly value: string | null; readonly available: boolean; readonly basis: string; readonly qualification?: "LOCAL_HEURISTIC" | "SOURCE_MODEL" }[]
    readonly liquidationDate: string
    readonly liquidationHour: string
  }
  readonly breadth: {
    readonly request: MarketsRequestObservation
    readonly source: SourceMetadataEnvelope | null
    readonly universeSize: number | null
    readonly advancers: number | null
    readonly decliners: number | null
    readonly registryAssets: number | null
    readonly heuristicClassification: string | null
  }
  readonly movers: readonly {
    readonly symbol: string
    readonly priceChangePercent: number | null
    readonly quoteVolume: number | null
    readonly qualityState: string | null
    readonly action: string | null
    readonly reason: string | null
  }[]
}

function requestLifecycle(request: MarketsRequestObservation): LifecycleState {
  if (request.loading && !request.hasPayload) return "LOADING"
  if (request.loading && request.hasPayload) return "REFRESHING"
  if (request.error && request.hasPayload) return "PARTIAL"
  if (request.error) return "ERROR"
  return request.hasPayload ? "READY" : "EMPTY"
}

function requestAvailability(request: MarketsRequestObservation): AvailabilityModel {
  if (request.hasPayload) return { state: "AVAILABLE" }
  if (request.loading) return { state: "MISSING", reason: "The source request is in progress." }
  return { state: "UNAVAILABLE", reason: request.error ?? "The source supplied no usable payload." }
}

function sourceFreshness(source: SourceMetadataEnvelope | null): FreshnessModel {
  if (!source) return { state: "UNKNOWN", reason: "No governed source freshness metadata was supplied." }
  if (source.freshnessStatus === "CURRENT") return { state: "CURRENT", observedAt: source.lastUpdatedAt }
  if (source.freshnessStatus === "STALE") return { state: "STALE", observedAt: source.lastUpdatedAt, reason: source.degradedReason ?? "Source is stale." }
  if (source.freshnessStatus === "EXPIRED") return { state: "EXPIRED", observedAt: source.lastUpdatedAt, reason: source.unavailableReason ?? "Source is expired." }
  return { state: "UNKNOWN", observedAt: source.lastUpdatedAt, reason: "Source freshness is unavailable or not governed for canonical presentation." }
}

function sourceAvailability(source: SourceMetadataEnvelope | null, request: MarketsRequestObservation): AvailabilityModel {
  if (!source) return requestAvailability(request)
  if (source.sourceStatus === "UNAVAILABLE" || source.sourceStatus === "DISABLED") return { state: "UNAVAILABLE", reason: source.unavailableReason ?? "Source is unavailable." }
  if (source.freshnessStatus === "STALE") return { state: "STALE", reason: source.degradedReason ?? "Source is stale." }
  return { state: "AVAILABLE" }
}

function provenance(source: SourceMetadataEnvelope | null): ProvenanceViewModel | null {
  if (!source) return null
  return { sourceId: source.sourceId, sourceName: source.sourceName, providerTier: "UNKNOWN", observedAt: source.lastUpdatedAt }
}

function metric(id: string, label: string, value: string | number | null, available: boolean, unit?: string | null, source?: string | null): MetricViewModel {
  return {
    id,
    label,
    value: available ? value : null,
    unit: unit ?? null,
    lifecycle: available ? "READY" : "PARTIAL",
    availability: available ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: `${label} was not supplied.` },
    freshness: { state: "UNKNOWN", reason: "No governed observation freshness was supplied for this metric." },
    provenance: source ? { sourceId: source, sourceName: source, providerTier: "UNKNOWN" } : null,
  }
}

function sectorCoverage(mapped: number | null, registry: number | null): CoverageModel {
  if (mapped === null || registry === null || registry <= 0) return { state: "UNKNOWN", reason: "Complete sector universe coverage was not supplied." }
  const percent = Math.min(100, (mapped / registry) * 100)
  return { state: mapped >= registry ? "COMPLETE" : "PARTIAL", actualRecords: mapped, expectedRecords: registry, percent, reason: mapped >= registry ? null : "Some registered sector constituents are missing." }
}

function adaptSector(item: MarketsPresentationInput["sectorRotation"]["sectors"][number]): SectorItemViewModel {
  const numeric = (id: string, label: string, value: number | null | undefined, unit?: string) => metric(`${item.sector}-${id}`, label, value ?? null, Number.isFinite(value), unit, "sector-rotation-model")
  return {
    id: item.sector,
    rank: item.rank,
    sector: item.sector,
    score: item.rotationScore,
    modelClassification: item.direction,
    classificationBasis: "Source-owned sector rotation model using supplied volume, volatility, price momentum, breadth, premium, and regime-fit inputs.",
    metrics: [numeric("volume-share", "Volume share", item.volumeShare, "%"), numeric("price-change", "Average 24h price change", item.avgPriceChange, "%"), numeric("breadth", "Model breadth", item.breadth, "%"), numeric("assets", "Constituents", item.assetCount)],
    topSymbols: item.topSymbols,
    limitations: ["INFLOW and OUTFLOW are model classifications, not observed fund flow.", "Rank and score are preserved from the source model and are not reranked by presentation."],
  }
}

function unavailableCategory(id: CapitalFlowCategoryViewModel["id"], label: string): CapitalFlowCategoryViewModel {
  return { id, label, lifecycle: "PARTIAL", availability: { state: "UNAVAILABLE", reason: `No active ${label.toLowerCase()} contract is supplied to Markets.` }, metric: null, limitation: "Price, volume, CVD, sector score, and reserve balance are not substitutes for flow." }
}

function adaptVenue(venue: MarketsPresentationInput["derivatives"]["venues"][number]): DerivativesVenueViewModel {
  const hasFunding = Number.isFinite(venue.fundingRate)
  const hasOi = Number.isFinite(venue.openInterestNotional)
  const available = venue.ok && (hasFunding || hasOi)
  return { id: venue.name.toLowerCase(), name: venue.name, lifecycle: available ? "READY" : "PARTIAL", availability: available ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: venue.reason ?? "Venue metrics are unavailable." }, fundingRate: hasFunding ? venue.fundingRate! : null, openInterestNotional: hasOi ? venue.openInterestNotional! : null, source: venue.source ?? null, limitation: available && (!hasFunding || !hasOi) ? "The venue supplied only part of the requested derivatives context." : null }
}

export function buildMarketsV2ViewModel(input: MarketsPresentationInput): MarketsV2ViewModel {
  const availableModules = input.moduleAvailability.filter(Boolean).length
  const totalModules = input.moduleAvailability.length
  const readinessLabel = availableModules === 0 ? "UNAVAILABLE" : availableModules === totalModules ? "AVAILABLE" : "PARTIAL"
  const sectorAvailability = sourceAvailability(input.sectorRotation.source, input.sectorRotation.request)
  const sectorLifecycle = input.sectorRotation.source?.sourceStatus === "DEGRADED" ? "PARTIAL" : requestLifecycle(input.sectorRotation.request)
  const coverage = sectorCoverage(input.sectorRotation.mappedAssets, input.sectorRotation.registryAssets)
  const etfAvailability = sourceAvailability(input.etf.source, input.etf.request)
  const etfFreshness = sourceFreshness(input.etf.source)
  const etfRow = input.etf.row
  const reserveRow = input.reserve.row
  const fundingAvailable = Number.isFinite(input.derivatives.fundingRate)
  const oiAvailable = Number.isFinite(input.derivatives.openInterestNotional)
  const liquidationsAvailable = input.derivatives.liquidationState === "ready" && Number.isFinite(input.derivatives.longLiquidationNotional) && Number.isFinite(input.derivatives.shortLiquidationNotional)
  const derivativesMetrics = [
    metric("funding", "Funding", input.derivatives.fundingRate, fundingAvailable, null, input.derivatives.fundingSource),
    metric("open-interest", "Open interest notional", input.derivatives.openInterestNotional, oiAvailable, "USD", input.derivatives.openInterestSource),
    metric("long-liquidations", "Long liquidations", input.derivatives.longLiquidationNotional, liquidationsAvailable, "USD", "bounded-liquidation-history"),
    metric("short-liquidations", "Short liquidations", input.derivatives.shortLiquidationNotional, liquidationsAvailable, "USD", "bounded-liquidation-history"),
  ]
  const heuristics: DerivativesHeuristicViewModel[] = input.derivatives.heuristics.map((item) => ({ ...item, qualification: item.qualification ?? "LOCAL_HEURISTIC" }))
  const breadthCoverage = sectorCoverage(input.breadth.universeSize, input.breadth.registryAssets)
  const breadthComplete = breadthCoverage.state === "COMPLETE"
  const breadthAvailable = input.breadth.universeSize !== null && input.breadth.advancers !== null && input.breadth.decliners !== null
  const movers: SecondaryMoverViewModel[] = input.movers.map((item) => ({ id: item.symbol, symbol: item.symbol, lifecycle: "READY", availability: { state: "AVAILABLE" }, observedPriceChangePercent: item.priceChangePercent, observedQuoteVolume: item.quoteVolume, sourceClassification: item.qualityState, sourceAction: item.action, sourceReason: item.reason, limitation: "Secondary discovery context only. Scanner owns investigation priority; this is not a trade recommendation." }))

  return {
    summary: {
      symbol: input.symbol,
      exchange: input.exchange,
      timeframe: input.timeframe,
      lifecycle: availableModules === totalModules ? "READY" : availableModules ? "PARTIAL" : "EMPTY",
      availability: availableModules ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: "No source modules have supplied usable data." },
      sourceReadiness: { lifecycle: availableModules ? (availableModules === totalModules ? "READY" : "PARTIAL") : "EMPTY", availability: availableModules ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: "No source modules are available." }, availableModules, totalModules, label: readinessLabel, basis: `${availableModules} of ${totalModules} existing Markets modules supplied usable payloads. This is source readiness, not freshness or confidence.` },
      regime: { value: null, lifecycle: "PARTIAL", availability: { state: "UNAVAILABLE", reason: "No approved supplied market-regime contract exists." }, reason: "Price, CVD, funding, color, and module availability cannot establish a canonical regime." },
      metrics: input.summaryMetrics.map((item) => metric(item.id, item.label, item.value, item.available, item.unit, item.source)),
      inheritedContext: {
        lifecycle: input.inheritedDashboard.label === "LOADING" ? "LOADING" : input.inheritedDashboard.label === "UNAVAILABLE" ? "EMPTY" : "PARTIAL",
        availability: input.inheritedDashboard.label === "UNAVAILABLE" ? { state: "UNAVAILABLE", reason: input.inheritedDashboard.detail } : { state: "AVAILABLE" },
        direction: input.inheritedDashboard.direction,
        driverCount: input.inheritedDashboard.driverCount,
        evidenceCount: input.inheritedDashboard.evidenceCount,
        freshness: input.inheritedDashboard.freshness === "CURRENT" ? { state: "CURRENT" } : input.inheritedDashboard.freshness === "STALE" ? { state: "STALE", reason: input.inheritedDashboard.detail } : { state: "UNKNOWN", reason: "Inherited context freshness is unavailable or unknown." },
        limitation: "Inherited Dashboard context is display-only and does not establish Markets regime, direction, or confidence.",
      },
    },
    sectorRotation: { lifecycle: sectorLifecycle, availability: sectorAvailability, freshness: sourceFreshness(input.sectorRotation.source), coverage, provenance: provenance(input.sectorRotation.source), sectors: input.sectorRotation.sectors.map(adaptSector), limitation: "Sector direction and leadership are source-model classifications. They are not factual fund flow or Scanner priority." },
    capitalFlow: {
      etf: { lifecycle: requestLifecycle(input.etf.request), availability: etfAvailability, freshness: etfFreshness, asset: etfRow?.asset ?? null, value: etfRow?.netFlow ?? null, unit: etfRow?.unit ?? null, sourceDate: etfRow?.sourceDate ?? null, observedAt: etfRow?.sourceTimestamp ?? input.etf.source?.lastUpdatedAt ?? null, provenance: provenance(input.etf.source), limitation: "ETF flow is one supplied flow category and does not establish broad capital-flow certainty." },
      reserve: { lifecycle: requestLifecycle(input.reserve.request), availability: reserveRow ? { state: "AVAILABLE" } : requestAvailability(input.reserve.request), freshness: input.reserve.freshness === "stale" ? { state: "STALE", observedAt: input.reserve.observedAt } : { state: "UNKNOWN", observedAt: input.reserve.observedAt, reason: "Reserve freshness is not a canonical Markets regime input." }, asset: reserveRow?.asset ?? null, balance: reserveRow?.currentBalance ?? null, balanceUsd: reserveRow?.currentBalanceUsd ?? null, balanceChange: reserveRow?.balanceChange ?? null, balanceUsdChange: reserveRow?.balanceUsdChange ?? null, observationType: reserveRow?.observationType ?? null, limitation: "Reserve balance is balance evidence. Only a supplied delta is balance-change evidence; neither is labeled fund flow." },
      categories: [unavailableCategory("STABLECOIN", "Stablecoin flow"), unavailableCategory("EXCHANGE", "Exchange flow"), unavailableCategory("ON_CHAIN", "On-chain flow")],
    },
    derivatives: { lifecycle: fundingAvailable || oiAvailable || liquidationsAvailable ? "PARTIAL" : "EMPTY", availability: fundingAvailable || oiAvailable || liquidationsAvailable ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: "No supported derivatives metrics are available." }, metrics: derivativesMetrics, venues: input.derivatives.venues.map(adaptVenue), relationships: input.derivatives.relationships, heuristics, liquidationWindow: { date: input.derivatives.liquidationDate, hour: input.derivatives.liquidationHour }, limitation: "OI, Funding, liquidations, and venue observations are factual metrics. Pressure, trend, and structure labels remain visibly qualified local heuristics." },
    macro: { lifecycle: "PARTIAL", availability: { state: "UNAVAILABLE", reason: "Markets has no active Macro request or supplied Macro contract." }, reason: "Macro context cannot be inferred from price, ETF flow, or another page's local state." },
    predictionMarkets: { lifecycle: "PARTIAL", availability: { state: "UNAVAILABLE", reason: "Markets has no active Prediction Market request." }, reason: "No event, probability, consensus, or confidence is inferred." },
    breadth: { lifecycle: breadthAvailable ? (breadthComplete ? "READY" : "PARTIAL") : requestLifecycle(input.breadth.request), availability: breadthAvailable ? (breadthComplete ? { state: "AVAILABLE" } : { state: "STALE", reason: "Constituent coverage is incomplete; classification is limited." }) : requestAvailability(input.breadth.request), freshness: sourceFreshness(input.breadth.source), coverage: breadthCoverage, universeSize: input.breadth.universeSize, advancers: input.breadth.advancers, decliners: input.breadth.decliners, unchanged: null, missingConstituents: input.breadth.registryAssets !== null && input.breadth.universeSize !== null ? Math.max(0, input.breadth.registryAssets - input.breadth.universeSize) : null, heuristicClassification: breadthAvailable ? input.breadth.heuristicClassification : null, heuristicBasis: breadthAvailable ? `${input.breadth.advancers} advancers versus ${input.breadth.decliners} decliners across ${input.breadth.universeSize} supplied constituents.` : null, limitation: breadthComplete ? "Breadth label is a local heuristic, not a canonical regime or direction." : "Incomplete constituent coverage cannot support a canonical breadth conclusion." },
    secondaryMovers: movers,
    scannerHandoff: { id: "SCANNER", label: "Open Scanner", available: true, description: "Continue with the selected symbol and existing Markets-to-Scanner context contract.", limitation: "Scanner owns prioritization. Markets supplies secondary discovery context only." },
    repository: { lifecycle: "PARTIAL", availability: { state: "UNAVAILABLE", reason: "Markets has no active Repository audit or record-level traceability contract." }, handoff: { available: false, unavailableReason: "No valid Repository record identity and destination were supplied." }, reason: "Source availability does not imply Repository record traceability." },
    selection: { symbol: input.symbol, liquidationDate: input.derivatives.liquidationDate, liquidationHour: input.derivatives.liquidationHour },
    filters: { searchSupported: false, filtersSupported: false, tabsSupported: false, sortingSupported: false, sectorSelectionSupported: false },
    pageLimitations: ["No approved canonical market-regime contract is supplied.", "Macro and Prediction Markets remain unavailable because Markets has no active requests.", "Repository audit remains unavailable without a query and record identity contract.", "Sector and breadth classifications are qualified model or local heuristics.", "Stablecoin, exchange, and on-chain flow contracts are unavailable.", "Market Movers is secondary discovery context; Scanner owns prioritization."],
  }
}
