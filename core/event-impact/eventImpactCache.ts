import type { HistoricalCacheIdentity } from "@/core/historical-intelligence/cache/cacheTypes"
import type { EventImpactResult } from "./eventImpactTypes"

export const EVENT_IMPACT_CACHE_SCHEMA_VERSION = "1"
export const EVENT_IMPACT_CACHE_NAMESPACE = "historical-intelligence"
export const EVENT_IMPACT_EVENT_DATASET_ID = "event-impact-event-v1"
export const EVENT_IMPACT_CATEGORY_DATASET_ID = "event-impact-category-v1"

export interface EventImpactCacheCoordinates {
  symbol: string
  exchange: string
}

export interface EventImpactEventCacheCoordinates extends EventImpactCacheCoordinates {
  eventId: string
}

export interface EventImpactCategoryCacheCoordinates extends EventImpactCacheCoordinates {
  category: string
}

export interface EventImpactCachePayload {
  eventId: string | null
  category: string
  symbol: string
  exchange: string
  source: EventImpactResult["source"]
  generatedAt: string
  result: EventImpactResult
}

export interface EventImpactCacheMetadata extends Record<string, unknown> {
  eventId: string | null
  category: string
  symbol: string
  exchange: string
  eventCount: number
  sampleCount: number
  eventCatalog: string
  marketData: string[]
}

function normalizedBase(coordinates: EventImpactCacheCoordinates) {
  return {
    symbol: coordinates.symbol.replace("/", "").trim().toUpperCase(),
    exchange: coordinates.exchange.trim().toLowerCase(),
  }
}

export function eventImpactEventCacheIdentity(
  coordinates: EventImpactEventCacheCoordinates,
): HistoricalCacheIdentity {
  return {
    namespace: EVENT_IMPACT_CACHE_NAMESPACE,
    datasetId: EVENT_IMPACT_EVENT_DATASET_ID,
    partition: {
      ...normalizedBase(coordinates),
      eventId: coordinates.eventId.trim(),
    },
  }
}

export function eventImpactCategoryCacheIdentity(
  coordinates: EventImpactCategoryCacheCoordinates,
): HistoricalCacheIdentity {
  return {
    namespace: EVENT_IMPACT_CACHE_NAMESPACE,
    datasetId: EVENT_IMPACT_CATEGORY_DATASET_ID,
    partition: {
      ...normalizedBase(coordinates),
      category: coordinates.category.trim().toLowerCase(),
    },
  }
}
