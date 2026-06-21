import {
  verifiedEventCatalogReader,
  type VerifiedEvent,
  type VerifiedEventCategory,
} from "@/core/event-catalog"
import {
  EVENT_IMPACT_CACHE_SCHEMA_VERSION,
  eventImpactCategoryCacheIdentity,
  eventImpactEventCacheIdentity,
  type EventImpactCacheMetadata,
  type EventImpactCachePayload,
} from "@/core/event-impact/eventImpactCache"
import {
  EVENT_IMPACT_HORIZONS,
  EVENT_IMPACT_SCHEMA_VERSION,
  type EventImpactReader,
  type EventImpactReaderOptions,
  type EventImpactResult,
  type EventImpactStatistics,
} from "@/core/event-impact/eventImpactTypes"
import { consumeHistoricalCache } from "@/lib/historical-intelligence/cache/cacheFirst"
import { eventImpactEvidenceValidity } from "@/core/evidence-validity"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function emptyStatistics(): EventImpactStatistics {
  return {
    byHorizon: Object.fromEntries(EVENT_IMPACT_HORIZONS.map((horizon) => [
      horizon,
      {
        sampleCount: 0,
        averageReturn: null,
        medianReturn: null,
        winRate: null,
        bestCase: null,
        worstCase: null,
      },
    ])) as EventImpactStatistics["byHorizon"],
  }
}

function validResult(value: unknown): value is EventImpactResult {
  if (!isRecord(value)) return false
  if (
    value.schemaVersion !== EVENT_IMPACT_SCHEMA_VERSION
    || typeof value.ok !== "boolean"
    || (value.status !== "available" && value.status !== "unavailable")
    || !isRecord(value.query)
    || !Array.isArray(value.events)
    || !Array.isArray(value.outcomes)
    || !isRecord(value.statistics)
    || !isRecord(value.statistics.byHorizon)
    || !Number.isFinite(value.sampleCount)
    || !isRecord(value.source)
    || typeof value.source.eventCatalog !== "string"
    || !Array.isArray(value.source.marketData)
    || typeof value.source.generatedAt !== "string"
  ) {
    return false
  }
  const statistics = value.statistics as Record<string, unknown>
  const byHorizon = statistics.byHorizon as Record<string, unknown>
  return EVENT_IMPACT_HORIZONS.every((horizon) => {
    const stats = byHorizon[horizon]
    return isRecord(stats)
      && Number.isFinite(stats.sampleCount)
      && (stats.averageReturn === null || Number.isFinite(stats.averageReturn))
      && (stats.medianReturn === null || Number.isFinite(stats.medianReturn))
      && (stats.winRate === null || Number.isFinite(stats.winRate))
  })
}

function validPayload(value: unknown): value is EventImpactCachePayload {
  return isRecord(value)
    && (value.eventId === null || typeof value.eventId === "string")
    && typeof value.category === "string"
    && typeof value.symbol === "string"
    && typeof value.exchange === "string"
    && isRecord(value.source)
    && typeof value.generatedAt === "string"
    && validResult(value.result)
}

function normalizeSymbol(value?: string) {
  return value?.replace("/", "").trim().toUpperCase() || undefined
}

function normalizeExchange(value?: string) {
  return value?.trim().toLowerCase() || undefined
}

function defaultCoordinates(events: VerifiedEvent[], options: EventImpactReaderOptions) {
  const requestedSymbol = normalizeSymbol(options.symbol)
  const requestedExchange = normalizeExchange(options.exchange)
  const symbols = [...new Set(events.flatMap((event) => event.affectedSymbols))].sort()
  const exchanges = [...new Set(events.flatMap((event) => event.affectedExchanges))].sort()
  return {
    symbol: requestedSymbol ?? symbols[0],
    exchange: requestedExchange ?? exchanges[0],
  }
}

function unavailable(
  query: EventImpactResult["query"],
  reason: string,
  generatedAt = new Date(0).toISOString(),
): EventImpactResult {
  const result: EventImpactResult = {
    schemaVersion: EVENT_IMPACT_SCHEMA_VERSION,
    ok: false,
    status: "unavailable",
    reason,
    query,
    events: [],
    outcomes: [],
    statistics: emptyStatistics(),
    sampleCount: 0,
    source: {
      eventCatalog: "verified-event-seed-catalog",
      marketData: [],
      generatedAt,
    },
  }
  result.validity = eventImpactEvidenceValidity({ result, generatedAt })
  return result
}

function cacheReason(state: string, reason: string) {
  if (state === "missing") return "Event Impact cache not generated."
  if (state === "corrupted") return "Event Impact cache is corrupted."
  if (state === "expired") return "Event Impact cache has expired."
  if (state === "version_mismatch") return "Event Impact cache schema is incompatible."
  if (state === "partial") return "Event Impact cache generation is incomplete."
  if (state === "generation_failed") return `Event Impact cache generation failed: ${reason}`
  return reason
}

async function readCache(
  identity: ReturnType<typeof eventImpactCategoryCacheIdentity>,
  query: EventImpactResult["query"],
) {
  const result = await consumeHistoricalCache<EventImpactCachePayload, EventImpactCacheMetadata>({
    identity,
    expectedSchemaVersion: EVENT_IMPACT_CACHE_SCHEMA_VERSION,
  })
  if (!result.ok) {
    const reason = "reason" in result ? result.reason : "Event Impact cache unavailable."
    return unavailable(query, cacheReason(result.state, reason), result.manifest?.generatedAt)
  }
  if (!validPayload(result.data)) {
    return unavailable(query, "Event Impact cache payload is invalid.", result.manifest.generatedAt)
  }
  const prepared = result.data.result
  return {
    ...prepared,
    validity: eventImpactEvidenceValidity({
      result: prepared,
      generatedAt: result.manifest.generatedAt,
    }),
  }
}

export class CachedEventImpactReader implements EventImpactReader {
  async getByEventId(eventId: string, options: EventImpactReaderOptions = {}) {
    const event = verifiedEventCatalogReader.getById(eventId)
    if (!event) return unavailable({ eventId }, "Verified event not found.")
    const coordinates = defaultCoordinates([event], options)
    const query = {
      eventId,
      symbol: coordinates.symbol,
      exchange: coordinates.exchange,
    }
    if (!coordinates.symbol || !coordinates.exchange) {
      return unavailable(query, "Verified event has no cache coordinates.")
    }
    return readCache(eventImpactEventCacheIdentity({
      eventId,
      symbol: coordinates.symbol,
      exchange: coordinates.exchange,
    }), query)
  }

  async getByCategory(category: VerifiedEventCategory, options: EventImpactReaderOptions = {}) {
    const events = verifiedEventCatalogReader.findByCategory(category)
    if (!events.length) return unavailable({ category }, "No verified events matched the category.")
    const coordinates = defaultCoordinates(events, options)
    const query = {
      category,
      symbol: coordinates.symbol,
      exchange: coordinates.exchange,
    }
    if (!coordinates.symbol || !coordinates.exchange) {
      return unavailable(query, "Verified event category has no cache coordinates.")
    }
    return readCache(eventImpactCategoryCacheIdentity({
      category,
      symbol: coordinates.symbol,
      exchange: coordinates.exchange,
    }), query)
  }
}

export const eventImpactReader = new CachedEventImpactReader()
