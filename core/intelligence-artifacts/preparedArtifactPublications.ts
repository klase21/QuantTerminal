import type { EventImpactCachePayload } from "@/core/event-impact"
import type { HistoricalAnalogCachePayloadV2 } from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
import { createIntelligenceArtifact } from "@/core/intelligence-artifacts/artifactLifecycle"
import type { IntelligenceArtifact } from "@/core/intelligence-artifacts/artifactTypes"
import type { ReplayOrderbookCachePayload } from "@/core/replay/replayOrderbookCache"

export interface HistoricalAnalogArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  symbol: string
  timeframe: string
  currentStateTimestamp: number
  totalCases: number
  dominantOutcome: string
  statistics: HistoricalAnalogCachePayloadV2["statistics"]
}

export interface EventImpactArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  category: string
  symbol: string
  exchange: string
  sampleCount: number
  statistics: EventImpactCachePayload["result"]["statistics"]
}

export interface ReplayEvidenceArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  exchange: string
  symbol: string
  window: ReplayOrderbookCachePayload["window"]
  timestamp: string
  bestBid: number
  bestAsk: number
  spread: number
  imbalance: number
  bidLiquidity: number
  askLiquidity: number
}

function pct(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unavailable"
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
}

function number(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 })
}

export function createHistoricalAnalogArtifact(input: {
  payload: HistoricalAnalogCachePayloadV2
  generatedAt: string
  cacheIdentity: string
  cacheSchemaVersion: string
}): IntelligenceArtifact<HistoricalAnalogArtifactMetadata> {
  const { payload } = input
  const stats24h = payload.statistics.byHorizon["24h"]
  return createIntelligenceArtifact({
    id: `historical-analog:${payload.symbol}:${payload.interval}`,
    type: "historical_analog",
    title: `${payload.symbol} ${payload.interval} Historical Analog`,
    summary: `${payload.statistics.totalCases} similar cases; 24h average ${pct(stats24h.averageReturn)}; win rate ${pct(stats24h.winRate)}; dominant outcome ${payload.statistics.dominantOutcome}.`,
    confidence: 0,
    source: {
      system: "historical-analog-v2",
      producerVersion: input.cacheSchemaVersion,
      dataset: "historical-analog-v2",
      cacheIdentity: input.cacheIdentity,
    },
    generatedAt: input.generatedAt,
    expiresAt: null,
    supportingEvidence: [
      {
        id: `${payload.symbol}:${payload.interval}:24h-outcome`,
        kind: "outcome",
        title: "24h outcome distribution",
        summary: `${stats24h.caseCount} cases; average ${pct(stats24h.averageReturn)}; win rate ${pct(stats24h.winRate)}.`,
        observedAt: new Date(payload.currentState.timestamp).toISOString(),
        source: payload.source,
        metadata: { ...stats24h },
      },
      ...payload.cases.slice(0, 10).map((item) => ({
        id: item.state.id,
        kind: "historical_case" as const,
        title: `${item.state.symbol} historical case`,
        summary: `${item.similarity.toFixed(2)}% similarity; 24h outcome ${pct(item.outcome.returns["24h"])}.`,
        observedAt: new Date(item.state.timestamp).toISOString(),
        source: item.state.source,
        metadata: {
          similarity: item.similarity,
          comparableFeatures: item.comparableFeatures,
          outcomes: item.outcome.returns,
        },
      })),
    ],
    metadata: {
      confidenceStatus: "not_calibrated",
      symbol: payload.symbol,
      timeframe: payload.interval,
      currentStateTimestamp: payload.currentState.timestamp,
      totalCases: payload.statistics.totalCases,
      dominantOutcome: payload.statistics.dominantOutcome,
      statistics: payload.statistics,
    },
    tags: ["historical-analog", payload.symbol.toLowerCase(), payload.interval],
    subjects: {
      symbols: [payload.symbol],
      caseIds: payload.cases.map((item) => item.state.id),
    },
  })
}

export function createEventImpactArtifact(input: {
  payload: EventImpactCachePayload
  cacheIdentity: string
  cacheSchemaVersion: string
}): IntelligenceArtifact<EventImpactArtifactMetadata> {
  const result = input.payload.result
  const stats24h = result.statistics.byHorizon["24h"]
  const eventIds = result.events.map((event) => event.eventId)
  const references = [...new Set(result.events.map((event) => event.source.url))]
  return createIntelligenceArtifact({
    id: `event-impact:${input.payload.category}:${input.payload.exchange}:${input.payload.symbol}`,
    type: "event_impact",
    title: `${input.payload.symbol} ${input.payload.category} Event Impact`,
    summary: `${result.sampleCount} verified observations; 24h average ${pct(stats24h.averageReturn)}; median ${pct(stats24h.medianReturn)}; win rate ${pct(stats24h.winRate)}.`,
    confidence: 0,
    source: {
      system: "event-impact-v1",
      producerVersion: input.cacheSchemaVersion,
      dataset: "event-impact-category-v1",
      cacheIdentity: input.cacheIdentity,
      references,
    },
    generatedAt: input.payload.generatedAt,
    expiresAt: null,
    supportingEvidence: [
      ...result.events.map((event) => ({
        id: event.eventId,
        kind: "event" as const,
        title: event.title,
        observedAt: event.timestamp,
        source: event.source.name,
        references: [event.source.url],
        metadata: { category: event.category },
      })),
      {
        id: `${input.payload.category}:${input.payload.symbol}:24h-outcome`,
        kind: "outcome",
        title: "24h event outcome distribution",
        summary: `${stats24h.sampleCount} observations; average ${pct(stats24h.averageReturn)}; median ${pct(stats24h.medianReturn)}; win rate ${pct(stats24h.winRate)}.`,
        source: result.source.marketData.join(", ") || "canonical-market-data",
        metadata: { ...stats24h },
      },
    ],
    metadata: {
      confidenceStatus: "not_calibrated",
      category: input.payload.category,
      symbol: input.payload.symbol,
      exchange: input.payload.exchange,
      sampleCount: result.sampleCount,
      statistics: result.statistics,
    },
    tags: ["event-impact", input.payload.category, input.payload.symbol.toLowerCase()],
    subjects: {
      symbols: [input.payload.symbol],
      exchanges: [input.payload.exchange],
      eventIds,
    },
  })
}

export function createReplayEvidenceArtifact(input: {
  payload: ReplayOrderbookCachePayload
  generatedAt: string
  cacheIdentity: string
  cacheSchemaVersion: string
  source: string
}): IntelligenceArtifact<ReplayEvidenceArtifactMetadata> {
  const { payload } = input
  const windowId = `${payload.window.date}:${String(payload.window.hour).padStart(2, "0")}`
  return createIntelligenceArtifact({
    id: `replay-intelligence:${payload.exchange}:${payload.symbol}:${windowId}`,
    type: "replay_intelligence",
    title: `${payload.symbol} Replay Evidence ${payload.window.date} ${String(payload.window.hour).padStart(2, "0")}:00 UTC`,
    summary: `Prepared orderbook evidence: spread ${number(payload.spread)}, imbalance ${pct(payload.imbalance)}, bid liquidity ${number(payload.bidLiquidity)}, ask liquidity ${number(payload.askLiquidity)}.`,
    confidence: 0,
    source: {
      system: "replay-orderbook-cache",
      producerVersion: input.cacheSchemaVersion,
      dataset: "orderbook-snapshot",
      cacheIdentity: input.cacheIdentity,
    },
    generatedAt: input.generatedAt,
    expiresAt: null,
    supportingEvidence: [{
      id: `${payload.exchange}:${payload.symbol}:${windowId}:orderbook`,
      kind: "market_data",
      title: "Prepared orderbook snapshot",
      summary: `Best bid ${number(payload.bestBid)}; best ask ${number(payload.bestAsk)}; spread ${number(payload.spread)}; imbalance ${pct(payload.imbalance)}.`,
      observedAt: payload.timestamp,
      source: input.source,
      metadata: {
        bestBid: payload.bestBid,
        bestAsk: payload.bestAsk,
        spread: payload.spread,
        imbalance: payload.imbalance,
        bidLiquidity: payload.bidLiquidity,
        askLiquidity: payload.askLiquidity,
      },
    }],
    metadata: {
      confidenceStatus: "not_calibrated",
      exchange: payload.exchange,
      symbol: payload.symbol,
      window: payload.window,
      timestamp: payload.timestamp,
      bestBid: payload.bestBid,
      bestAsk: payload.bestAsk,
      spread: payload.spread,
      imbalance: payload.imbalance,
      bidLiquidity: payload.bidLiquidity,
      askLiquidity: payload.askLiquidity,
    },
    tags: ["replay", "orderbook", payload.symbol.toLowerCase()],
    subjects: {
      symbols: [payload.symbol],
      exchanges: [payload.exchange],
    },
  })
}
