import {
  createEventImpactArtifact,
  createHistoricalAnalogArtifact,
  createReplayEvidenceArtifact,
  type IntelligenceArtifactPublicationResult,
} from "@/core/intelligence-artifacts"
import {
  EVENT_IMPACT_CACHE_SCHEMA_VERSION,
  eventImpactCategoryCacheIdentity,
  type EventImpactCacheMetadata,
  type EventImpactCachePayload,
} from "@/core/event-impact"
import {
  HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
  historicalAnalogCacheIdentity,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogCache"
import {
  REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
  replayOrderbookCacheIdentity,
  type ReplayOrderbookCacheCoordinates,
  type ReplayOrderbookCacheMetadata,
  type ReplayOrderbookCachePayload,
} from "@/core/replay/replayOrderbookCache"
import { readHistoricalAnalogCacheV2 } from "@/lib/historical-intelligence/analog-v2/readHistoricalAnalogCache"
import { consumeHistoricalCache } from "@/lib/historical-intelligence/cache/cacheFirst"
import { productionIntelligenceArtifactRegistry } from "./productionRegistry"
import type { InvestigationThesis } from "@/types/investigationThesis"
import type { DecisionBrief } from "@/core/decision-brief"

function cacheIdentity(value: ReturnType<typeof historicalAnalogCacheIdentity>) {
  const partition = Object.entries(value.partition ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, part]) => `${key}=${part}`)
    .join("/")
  return `${value.namespace}/${value.datasetId}${partition ? `/${partition}` : ""}`
}

export async function publishHistoricalAnalogArtifact(input: {
  symbol: string
  interval: "1h" | "4h" | "1d"
  thesis?: InvestigationThesis
  decisionBrief?: DecisionBrief
}): Promise<IntelligenceArtifactPublicationResult> {
  const coordinates = {
    symbol: input.symbol.trim().toUpperCase(),
    interval: input.interval,
  }
  const result = await readHistoricalAnalogCacheV2(coordinates)
  if (!result.ok) {
    throw new Error(`Historical Analog artifact publication unavailable: ${"reason" in result ? result.reason : result.state}`)
  }
  return productionIntelligenceArtifactRegistry.publish(createHistoricalAnalogArtifact({
    payload: result.data,
    generatedAt: result.manifest.generatedAt,
    cacheIdentity: cacheIdentity(historicalAnalogCacheIdentity(coordinates)),
    cacheSchemaVersion: result.manifest.schemaVersion,
    thesis: input.thesis,
    decisionBrief: input.decisionBrief,
  }))
}

export async function publishEventImpactArtifact(input: {
  category: string
  symbol: string
  exchange: string
  thesis?: InvestigationThesis
  decisionBrief?: DecisionBrief
}): Promise<IntelligenceArtifactPublicationResult> {
  const coordinates = {
    category: input.category.trim().toLowerCase(),
    symbol: input.symbol.trim().toUpperCase(),
    exchange: input.exchange.trim().toLowerCase(),
  }
  const identity = eventImpactCategoryCacheIdentity(coordinates)
  const result = await consumeHistoricalCache<EventImpactCachePayload, EventImpactCacheMetadata>({
    identity,
    expectedSchemaVersion: EVENT_IMPACT_CACHE_SCHEMA_VERSION,
  })
  if (!result.ok) {
    throw new Error(`Event Impact artifact publication unavailable: ${"reason" in result ? result.reason : result.state}`)
  }
  return productionIntelligenceArtifactRegistry.publish(createEventImpactArtifact({
    payload: result.data,
    cacheIdentity: cacheIdentity(identity),
    cacheSchemaVersion: result.manifest.schemaVersion,
    thesis: input.thesis,
    decisionBrief: input.decisionBrief,
  }))
}

export async function publishReplayEvidenceArtifact(
  coordinates: ReplayOrderbookCacheCoordinates,
  thesis?: InvestigationThesis,
  decisionBrief?: DecisionBrief,
): Promise<IntelligenceArtifactPublicationResult> {
  const identity = replayOrderbookCacheIdentity(coordinates)
  const result = await consumeHistoricalCache<ReplayOrderbookCachePayload, ReplayOrderbookCacheMetadata>({
    identity,
    expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
  })
  if (!result.ok) {
    throw new Error(`Replay evidence artifact publication unavailable: ${"reason" in result ? result.reason : result.state}`)
  }
  return productionIntelligenceArtifactRegistry.publish(createReplayEvidenceArtifact({
    payload: result.data,
    generatedAt: result.manifest.generatedAt,
    cacheIdentity: cacheIdentity(identity),
    cacheSchemaVersion: result.manifest.schemaVersion,
    source: result.manifest.source.id,
    thesis,
    decisionBrief,
  }))
}
