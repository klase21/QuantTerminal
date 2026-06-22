import {
  FLOW_REPLAY_SCHEMA_VERSION,
  flowReplayId,
  type FlowReplayContext,
  type FlowReplayCoverageState,
  type FlowReplayEvidence,
  type FlowReplayEvidenceKind,
  type FlowReplayEvidenceSource,
  type FlowReplayMetric,
  type FlowReplayPriceMovement,
  type FlowReplayPositioningEvidence,
  type FlowReplaySourceQuality,
  type FlowReplayStructureObservation,
} from "@/core/flow-replay"
import type {
  CanonicalExchange,
  CanonicalMarketInterval,
} from "@/core/historical-intelligence/market-data/canonicalMarketDataTypes"
import {
  REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
  replayOrderbookCacheIdentity,
  type ReplayOrderbookCacheMetadata,
  type ReplayOrderbookCachePayload,
} from "@/core/replay/replayOrderbookCache"
import {
  REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
  replayOrderbookCacheIdentityV2,
  type ReplayOrderbookCacheManifestMetadataV2,
  type ReplayOrderbookCachePayloadV2,
} from "@/core/replay-cache-v2"
import { readHistoricalCache } from "@/lib/historical-intelligence/cache/fileCacheStore"
import {
  readCanonicalFundingCache,
  readCanonicalLiquidationCache,
  readCanonicalOhlcvCache,
  readCanonicalOpenInterestCache,
} from "@/lib/historical-intelligence/market-data/canonicalMarketDataCache"
import { loadBinanceHistoricalPositioning } from "@/lib/replay/binanceHistoricalPositioning"
import {
  loadCryptoHftDataReplay,
  type ReplayFundingPoint,
} from "@/lib/replay/cryptoHftDataClient"

export interface FlowReplayBuildCoordinates {
  exchange: CanonicalExchange
  symbol: string
  date: string
  hour: number
  timeframe?: CanonicalMarketInterval
}

function source(input: {
  sourceId: string
  kind: FlowReplayEvidenceKind
  quality: FlowReplaySourceQuality
  source: string
  observedAt?: string | null
  summary: string
  reason?: string
  metrics?: FlowReplayMetric[]
}): FlowReplayEvidenceSource {
  return {
    sourceId: input.sourceId,
    kind: input.kind,
    quality: input.quality,
    source: input.source,
    observedAt: input.observedAt ?? null,
    summary: input.summary,
    reason: input.reason,
    metrics: input.metrics ?? [],
  }
}

function metric(
  key: string,
  label: string,
  value: number,
  unit: FlowReplayMetric["unit"],
): FlowReplayMetric {
  return { key, label, value, unit }
}

function unavailable(
  kind: FlowReplayEvidenceKind,
  reason: string,
): FlowReplayEvidenceSource {
  return source({
    sourceId: `flow-replay:${kind}`,
    kind,
    quality: "unavailable",
    source: "prepared-cache",
    summary: `${kind.replace(/_/g, " ")} evidence is unavailable.`,
    reason,
  })
}

function movement(open: number, high: number, low: number, close: number, volume: number) {
  const returnPercent = open === 0 ? 0 : ((close - open) / open) * 100
  const rangePercent = open === 0 ? 0 : ((high - low) / open) * 100
  return {
    direction: returnPercent > 0 ? "up" : returnPercent < 0 ? "down" : "flat",
    open,
    high,
    low,
    close,
    returnPercent,
    rangePercent,
    volume,
  } satisfies FlowReplayPriceMovement
}

function windowContext(
  coordinates: FlowReplayBuildCoordinates,
): FlowReplayContext {
  const hour = String(coordinates.hour).padStart(2, "0")
  const start = new Date(`${coordinates.date}T${hour}:00:00.000Z`)
  if (!Number.isFinite(start.getTime())) throw new Error("Flow Replay date/hour is invalid.")
  return {
    exchange: coordinates.exchange,
    symbol: coordinates.symbol.trim().toUpperCase(),
    timeframe: coordinates.timeframe ?? "1h",
    date: coordinates.date,
    hour: coordinates.hour,
    windowStart: start.toISOString(),
    windowEnd: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
  }
}

async function priceEvidence(
  context: FlowReplayContext,
): Promise<{
  evidence: FlowReplayEvidenceSource
  movement: FlowReplayPriceMovement | null
  observation: FlowReplayStructureObservation | null
}> {
  const result = await readCanonicalOhlcvCache({
    exchange: context.exchange as CanonicalExchange,
    symbol: context.symbol,
    interval: context.timeframe as CanonicalMarketInterval,
  })
  if (!result.ok) {
    return {
      evidence: unavailable(
        "price",
        `Canonical OHLCV cache ${result.state}: ${"reason" in result ? result.reason : result.state}`,
      ),
      movement: null,
      observation: null,
    }
  }
  const start = Date.parse(context.windowStart)
  const end = Date.parse(context.windowEnd)
  const candles = result.data.records
    .filter((item) => item.openTime >= start && item.openTime < end)
    .sort((left, right) => left.openTime - right.openTime)
  if (!candles.length) {
    return {
      evidence: unavailable("price", "Canonical OHLCV has no candle for the selected replay window."),
      movement: null,
      observation: null,
    }
  }
  const firstCandle = candles[0]
  const lastCandle = candles[candles.length - 1]
  const open = firstCandle.open
  const high = Math.max(...candles.map((item) => item.high))
  const low = Math.min(...candles.map((item) => item.low))
  const close = lastCandle.close
  const volume = candles.reduce((sum, item) => sum + item.volume, 0)
  const priceMovement = movement(
    open,
    high,
    low,
    close,
    volume,
  )
  const metrics = [
    metric("open", "Open", open, "price"),
    metric("high", "High", high, "price"),
    metric("low", "Low", low, "price"),
    metric("close", "Close", close, "price"),
    metric("return_percent", "Return", priceMovement.returnPercent, "percent"),
    metric("range_percent", "Range", priceMovement.rangePercent, "percent"),
    metric("volume", "Volume", volume, "quantity"),
    metric("candle_count", "Source candles", candles.length, "count"),
  ]
  return {
    evidence: source({
      sourceId: "flow-replay:price",
      kind: "price",
      quality: "verified",
      source: firstCandle.source,
      observedAt: new Date(lastCandle.closeTime).toISOString(),
      summary: `Price moved ${priceMovement.direction} from ${open} to ${close}.`,
      metrics,
    }),
    movement: priceMovement,
    observation: {
      observationId: "price-window-movement",
      sourceId: "flow-replay:price",
      quality: "verified",
      statement: `The selected 1h candle closed ${priceMovement.returnPercent.toFixed(4)}% from its open and covered a ${priceMovement.rangePercent.toFixed(4)}% high-low range.`,
      metrics,
    },
  }
}

function positioningSection(input: {
  context: FlowReplayContext
  points: ReplayFundingPoint[]
  kind: "funding" | "open_interest"
  source: string | null
  quality: FlowReplaySourceQuality
  reason?: string
}): FlowReplayPositioningEvidence {
  const usable = input.kind === "funding"
    ? input.points.filter((item) => item.fundingRate !== null)
    : input.points.filter((item) => item.openInterest !== null)
  const latest = usable.at(-1)
  return {
    availability: latest ? "available" : "unavailable",
    source: latest ? input.source : null,
    coverage: {
      windowStart: input.context.windowStart,
      windowEnd: input.context.windowEnd,
      pointCount: usable.length,
    },
    observedValue: input.kind === "funding"
      ? latest?.fundingRate ?? null
      : latest?.openInterest ?? null,
    observedAt: latest?.timestamp ?? null,
    quality: latest ? input.quality : "unavailable",
    reason: latest ? input.reason : input.reason ?? `${input.kind} evidence is unavailable.`,
  }
}

function sourceFromPositioning(
  kind: "funding" | "open_interest",
  positioning: FlowReplayPositioningEvidence,
): FlowReplayEvidenceSource {
  if (positioning.availability !== "available" || positioning.observedValue === null) {
    return unavailable(kind, positioning.reason ?? `${kind} evidence is unavailable.`)
  }
  const label = kind === "funding" ? "Funding rate" : "Open interest"
  const unit = kind === "funding" ? "percent" : "quantity"
  const displayedValue = kind === "funding"
    ? positioning.observedValue * 100
    : positioning.observedValue
  return source({
    sourceId: `flow-replay:${kind.replace("_", "-")}`,
    kind,
    quality: positioning.quality,
    source: positioning.source ?? "unknown",
    observedAt: positioning.observedAt,
    summary: `${label} has ${positioning.coverage.pointCount} historical point(s) in the selected window.`,
    reason: positioning.reason,
    metrics: [
      metric("observed_value", label, displayedValue, unit),
      metric("point_count", `${label} points`, positioning.coverage.pointCount, "count"),
    ],
  })
}

function positioningObservation(
  kind: "funding" | "open_interest",
  evidence: FlowReplayEvidenceSource,
): FlowReplayStructureObservation | null {
  if (evidence.quality === "unavailable") return null
  const observed = evidence.metrics.find((item) => item.key === "observed_value")
  if (!observed) return null
  return {
    observationId: `${kind}-positioning`,
    sourceId: evidence.sourceId,
    quality: evidence.quality,
    statement: `${observed.label} was observed at ${observed.value} from ${evidence.source}.`,
    metrics: evidence.metrics,
  }
}

async function derivativeEvidence(
  context: FlowReplayContext,
): Promise<{
  evidence: FlowReplayEvidenceSource[]
  funding: FlowReplayPositioningEvidence
  openInterest: FlowReplayPositioningEvidence
  observations: FlowReplayStructureObservation[]
}> {
  const coordinates = {
    exchange: context.exchange as CanonicalExchange,
    symbol: context.symbol,
  }
  const [funding, openInterest, liquidations] = await Promise.all([
    readCanonicalFundingCache(coordinates),
    readCanonicalOpenInterestCache(coordinates),
    readCanonicalLiquidationCache(coordinates),
  ])
  const start = Date.parse(context.windowStart)
  const end = Date.parse(context.windowEnd)

  const fundingPoints = funding.ok
    ? funding.data.records.filter((item) => item.fundingTime >= start && item.fundingTime < end)
    : []
  const openInterestPoints = openInterest.ok
    ? openInterest.data.records.filter((item) => item.timestamp >= start && item.timestamp < end)
    : []
  const liquidationEvents = liquidations.ok
    ? liquidations.data.records.filter((item) => item.timestamp >= start && item.timestamp < end)
    : []

  let positioningPoints: ReplayFundingPoint[] = [
    ...fundingPoints.map((item) => ({
      timestamp: new Date(item.fundingTime).toISOString(),
      fundingRate: item.fundingRate,
      openInterest: null,
      openInterestValue: null,
      exchange: item.exchange,
      symbol: item.symbol,
    })),
    ...openInterestPoints.map((item) => ({
      timestamp: new Date(item.timestamp).toISOString(),
      fundingRate: null,
      openInterest: item.openInterest,
      openInterestValue: item.openInterestValue,
      exchange: item.exchange,
      symbol: item.symbol,
    })),
  ]
  let fundingSource: string | null = fundingPoints[0]?.source ?? null
  let openInterestSource: string | null = openInterestPoints[0]?.source ?? null
  const providerReasons: string[] = []

  if (!fundingPoints.length || !openInterestPoints.length) {
    try {
      const crypto = await loadCryptoHftDataReplay({
        exchange: context.exchange,
        symbol: context.symbol,
        date: context.date,
        hour: context.hour,
        datasets: ["open_interest", "mark_price"],
      })
      const cryptoPoints = crypto.funding.filter((item) => {
        const timestamp = Date.parse(item.timestamp)
        return timestamp >= start && timestamp < end
      })
      if (!fundingPoints.length && cryptoPoints.some((item) => item.fundingRate !== null)) {
        positioningPoints.push(...cryptoPoints.filter((item) => item.fundingRate !== null))
        fundingSource = "cryptohftdata"
      }
      if (!openInterestPoints.length && cryptoPoints.some((item) => item.openInterest !== null)) {
        positioningPoints.push(...cryptoPoints.filter((item) => item.openInterest !== null))
        openInterestSource = "cryptohftdata"
      }
      providerReasons.push(
        ...crypto.diagnostics.unavailable.map((item) => `${item.dataset}: ${item.reason}`),
        ...crypto.diagnostics.errors.map((item) => `${item.dataset}: ${item.message}`),
      )
    } catch (error) {
      providerReasons.push(
        error instanceof Error ? error.message : "CryptoHFTData positioning unavailable.",
      )
    }
  }

  const hasFunding = positioningPoints.some((item) => item.fundingRate !== null)
  const hasOpenInterest = positioningPoints.some((item) => item.openInterest !== null)
  if (!hasFunding || !hasOpenInterest) {
    const binance = await loadBinanceHistoricalPositioning({
      symbol: context.symbol,
      date: context.date,
      hour: context.hour,
    })
    if (!hasFunding && binance.funding.some((item) => item.fundingRate !== null)) {
      positioningPoints.push(...binance.funding.filter((item) => item.fundingRate !== null).map((item) => ({
        timestamp: item.timestamp,
        fundingRate: item.fundingRate,
        openInterest: item.openInterest,
        openInterestValue: item.openInterestValue,
        exchange: context.exchange,
        symbol: context.symbol,
      })))
      fundingSource = "binance-historical"
    }
    if (!hasOpenInterest && binance.funding.some((item) => item.openInterest !== null)) {
      positioningPoints.push(...binance.funding.filter((item) => item.openInterest !== null).map((item) => ({
        timestamp: item.timestamp,
        fundingRate: item.fundingRate,
        openInterest: item.openInterest,
        openInterestValue: item.openInterestValue,
        exchange: context.exchange,
        symbol: context.symbol,
      })))
      openInterestSource = "binance-historical"
    }
    if (binance.reason) providerReasons.push(binance.reason)
    if (binance.diagnostics.fundingError) providerReasons.push(binance.diagnostics.fundingError)
    if (binance.diagnostics.openInterestError) providerReasons.push(binance.diagnostics.openInterestError)
  }

  positioningPoints = positioningPoints.sort(
    (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp),
  )
  const missingReason = providerReasons.length
    ? [...new Set(providerReasons)].join(" ")
    : "No prepared or historical provider points exist for the selected window."
  const fundingEvidence = positioningSection({
    context,
    points: positioningPoints,
    kind: "funding",
    source: fundingSource,
    quality: "verified",
    reason: hasFunding || positioningPoints.some((item) => item.fundingRate !== null)
      ? undefined
      : missingReason,
  })
  const openInterestEvidence = positioningSection({
    context,
    points: positioningPoints,
    kind: "open_interest",
    source: openInterestSource,
    quality: "verified",
    reason: hasOpenInterest || positioningPoints.some((item) => item.openInterest !== null)
      ? undefined
      : missingReason,
  })
  const fundingSourceEvidence = sourceFromPositioning("funding", fundingEvidence)
  const openInterestSourceEvidence = sourceFromPositioning(
    "open_interest",
    openInterestEvidence,
  )
  const evidence = [
    fundingSourceEvidence,
    openInterestSourceEvidence,
    liquidationEvents.length
      ? source({
          sourceId: "flow-replay:liquidations",
          kind: "liquidation",
          quality: "verified",
          source: liquidationEvents[0].source,
          observedAt: new Date(liquidationEvents.at(-1)!.timestamp).toISOString(),
          summary: `${liquidationEvents.length} liquidation event(s) exist for the selected window.`,
          metrics: [
            metric("event_count", "Liquidation events", liquidationEvents.length, "count"),
            metric(
              "notional",
              "Liquidation notional",
              liquidationEvents.reduce((sum, item) => sum + item.notional, 0),
              "price",
            ),
          ],
        })
      : unavailable(
          "liquidation",
          liquidations.ok
            ? "Liquidation cache has no events for the selected replay window."
            : `Liquidation cache ${liquidations.state}: ${"reason" in liquidations ? liquidations.reason : liquidations.state}`,
        ),
    unavailable("trades", "No prepared canonical trades cache exists for the selected replay window."),
  ]
  return {
    evidence,
    funding: fundingEvidence,
    openInterest: openInterestEvidence,
    observations: [
      positioningObservation("funding", fundingSourceEvidence),
      positioningObservation("open_interest", openInterestSourceEvidence),
    ].filter((item): item is FlowReplayStructureObservation => item !== null),
  }
}

async function orderbookFlowEvidence(
  context: FlowReplayContext,
): Promise<{
  evidence: FlowReplayEvidenceSource
  observation: FlowReplayStructureObservation | null
}> {
  const coordinates = {
    exchange: context.exchange,
    symbol: context.symbol,
    date: context.date,
    hour: context.hour,
  }
  const v2 = await readHistoricalCache<
    ReplayOrderbookCachePayloadV2,
    ReplayOrderbookCacheManifestMetadataV2
  >(
    replayOrderbookCacheIdentityV2(coordinates),
    {
      expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
      allowExpired: false,
      allowPartial: true,
    },
  )
  if (!("reason" in v2)) {
    const counts = v2.data.updates.reduce(
      (summary, batch) => {
        summary.sourceUpdates += batch.sourceUpdateCount
        summary.compactedUpdates += batch.compactedUpdateCount
        for (const update of batch.updates) {
          summary[update.side] += 1
          if (update.quantity === 0) summary.removals += 1
          else summary.sets += 1
        }
        return summary
      },
      {
        sourceUpdates: 0,
        compactedUpdates: 0,
        bid: 0,
        ask: 0,
        removals: 0,
        sets: 0,
      },
    )
    const metrics = [
      metric("source_updates", "Source update rows", counts.sourceUpdates, "count"),
      metric("compacted_updates", "Compacted updates", counts.compactedUpdates, "count"),
      metric("bid_updates", "Bid-level updates", counts.bid, "count"),
      metric("ask_updates", "Ask-level updates", counts.ask, "count"),
      metric("level_sets", "Positive-quantity updates", counts.sets, "count"),
      metric("level_removals", "Zero-quantity removals", counts.removals, "count"),
    ]
    const limitation = [
      ...v2.data.quality.reasons,
      "Orderbook values are update-flow evidence only; complete depth, seekability, and deterministic reconstruction are not established.",
    ].join(" ")
    const evidence = source({
      sourceId: "flow-replay:orderbook-flow",
      kind: "orderbook_flow",
      quality: v2.data.quality.status === "valid" ? "verified" : "degraded",
      source: v2.data.metadata.source.provider,
      observedAt: v2.data.metadata.lastEventTimestamp,
      summary: `${counts.sourceUpdates} orderbook update rows were observed across ${v2.data.metadata.updateBatchCount} one-minute batches.`,
      reason: limitation,
      metrics,
    })
    return {
      evidence,
      observation: {
        observationId: "orderbook-update-flow",
        sourceId: evidence.sourceId,
        quality: evidence.quality,
        statement: `${counts.bid} compacted bid updates and ${counts.ask} compacted ask updates were observed; these counts do not establish a complete historical book.`,
        metrics,
      },
    }
  }

  const v1 = await readHistoricalCache<
    ReplayOrderbookCachePayload,
    ReplayOrderbookCacheMetadata
  >(
    replayOrderbookCacheIdentity(coordinates),
    {
      expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
      allowExpired: false,
    },
  )
  if (!("reason" in v1)) {
    const metrics = [
      metric("best_bid", "Terminal best bid", v1.data.bestBid, "price"),
      metric("best_ask", "Terminal best ask", v1.data.bestAsk, "price"),
      metric("spread", "Terminal spread", v1.data.spread, "price"),
    ]
    const evidence = source({
      sourceId: "flow-replay:orderbook-static",
      kind: "orderbook_flow",
      quality: "degraded",
      source: v1.manifest.source.id,
      observedAt: v1.data.timestamp,
      summary: "A static terminal orderbook summary exists.",
      reason: "The V1 cache cannot prove initialization, completeness, seekability, or deterministic progression.",
      metrics,
    })
    return {
      evidence,
      observation: {
        observationId: "orderbook-static-terminal",
        sourceId: evidence.sourceId,
        quality: evidence.quality,
        statement: "A terminal orderbook summary is available as degraded point-in-time evidence only.",
        metrics,
      },
    }
  }

  return {
    evidence: unavailable(
      "orderbook_flow",
      `V2 orderbook cache ${v2.state}: ${v2.reason}; V1 orderbook cache ${v1.state}: ${v1.reason}`,
    ),
    observation: null,
  }
}

export async function buildFlowReplayEvidence(
  coordinates: FlowReplayBuildCoordinates,
): Promise<FlowReplayEvidence> {
  const context = windowContext(coordinates)
  const [price, derivatives, orderbook] = await Promise.all([
    priceEvidence(context),
    derivativeEvidence(context),
    orderbookFlowEvidence(context),
  ])
  const sources = [price.evidence, ...derivatives.evidence, orderbook.evidence]
  const availableKinds = new Set(
    sources
      .filter((item) => item.quality === "verified" || item.quality === "degraded")
      .map((item) => item.kind),
  )
  let coverageState: FlowReplayCoverageState = "MINIMAL"
  if (
    availableKinds.has("price")
    && availableKinds.has("orderbook_flow")
  ) coverageState = "PARTIAL"
  if (
    availableKinds.has("price")
    && availableKinds.has("orderbook_flow")
    && availableKinds.has("funding")
    && availableKinds.has("open_interest")
  ) coverageState = "ENRICHED"
  if (
    coverageState === "ENRICHED"
    && availableKinds.has("liquidation")
    && availableKinds.has("trades")
  ) coverageState = "COMPREHENSIVE"
  return {
    schemaVersion: FLOW_REPLAY_SCHEMA_VERSION,
    flowReplayId: flowReplayId(context),
    context,
    generatedAt: new Date().toISOString(),
    coverageState,
    whatMoved: price.movement,
    fundingEvidence: derivatives.funding,
    openInterestEvidence: derivatives.openInterest,
    marketStructureChanges: [
      price.observation,
      ...derivatives.observations,
      orderbook.observation,
    ].filter((item): item is FlowReplayStructureObservation => item !== null),
    sources,
    supportingEvidence: sources.filter((item) => item.quality === "verified"),
    degradedEvidence: sources.filter((item) => item.quality === "degraded"),
    unavailableEvidence: sources.filter((item) => item.quality === "unavailable"),
  }
}
