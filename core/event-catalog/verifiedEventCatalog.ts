import {
  VERIFIED_EVENT_CATALOG_VERSION,
  VERIFIED_EVENT_CATEGORIES,
  VERIFIED_EVENT_SCHEMA_VERSION,
  type VerifiedEvent,
  type VerifiedEventCatalog,
  type VerifiedEventCatalogReader,
  type VerifiedEventCategory,
  type VerifiedEventDateRange,
} from "./verifiedEventTypes"

const CATEGORY_SET = new Set<VerifiedEventCategory>(VERIFIED_EVENT_CATEGORIES)

function normalizeSymbol(symbol: string) {
  return symbol.replace("/", "").trim().toUpperCase()
}

function normalizedTimestamp(value: string, field: string) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid ${field}: ${value}`)
  return new Date(timestamp).toISOString()
}

function uniqueSorted(values: string[], normalize: (value: string) => string = (value) => value.trim()) {
  return [...new Set(values.map(normalize).filter(Boolean))].sort((left, right) => left.localeCompare(right))
}

function normalizeEvent(event: VerifiedEvent): VerifiedEvent {
  if (event.schemaVersion !== VERIFIED_EVENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported verified event schema version for ${event.eventId}`)
  }
  if (!event.eventId.trim()) throw new Error("Verified event id is required")
  if (!event.title.trim()) throw new Error(`Verified event title is required for ${event.eventId}`)
  if (!CATEGORY_SET.has(event.category)) throw new Error(`Unsupported verified event category: ${event.category}`)
  if (!event.source.id.trim() || !event.source.name.trim() || !event.source.url.trim()) {
    throw new Error(`Verified event source is incomplete for ${event.eventId}`)
  }
  if (!event.evidence.length) throw new Error(`Verified event evidence is required for ${event.eventId}`)

  return {
    ...event,
    eventId: event.eventId.trim(),
    title: event.title.trim(),
    timestamp: normalizedTimestamp(event.timestamp, "event timestamp"),
    source: {
      id: event.source.id.trim(),
      name: event.source.name.trim(),
      url: event.source.url.trim(),
    },
    evidence: event.evidence.map((evidence) => ({
      ...evidence,
      evidenceId: evidence.evidenceId.trim(),
      observedAt: normalizedTimestamp(evidence.observedAt, "evidence timestamp"),
      source: {
        id: evidence.source.id.trim(),
        name: evidence.source.name.trim(),
        url: evidence.source.url.trim(),
      },
    })),
    affectedSymbols: uniqueSorted(event.affectedSymbols, normalizeSymbol),
    affectedExchanges: uniqueSorted(event.affectedExchanges, (exchange) => exchange.trim().toLowerCase()),
    tags: event.tags ? uniqueSorted(event.tags, (tag) => tag.trim().toLowerCase()) : undefined,
  }
}

function compareEvents(left: VerifiedEvent, right: VerifiedEvent) {
  const timestampDifference = Date.parse(right.timestamp) - Date.parse(left.timestamp)
  return timestampDifference || left.eventId.localeCompare(right.eventId)
}

export class InMemoryVerifiedEventCatalog implements VerifiedEventCatalogReader {
  private readonly events: VerifiedEvent[]
  private readonly eventsById: Map<string, VerifiedEvent>

  constructor(catalog: VerifiedEventCatalog) {
    if (catalog.catalogVersion !== VERIFIED_EVENT_CATALOG_VERSION) {
      throw new Error(`Unsupported verified event catalog version: ${catalog.catalogVersion}`)
    }
    if (catalog.schemaVersion !== VERIFIED_EVENT_SCHEMA_VERSION) {
      throw new Error(`Unsupported verified event schema version: ${catalog.schemaVersion}`)
    }
    normalizedTimestamp(catalog.generatedAt, "catalog generated timestamp")

    const events = catalog.events.map(normalizeEvent).sort(compareEvents)
    const eventsById = new Map<string, VerifiedEvent>()
    for (const event of events) {
      if (eventsById.has(event.eventId)) throw new Error(`Duplicate verified event id: ${event.eventId}`)
      eventsById.set(event.eventId, event)
    }
    this.events = events
    this.eventsById = eventsById
  }

  getById(eventId: string) {
    return this.eventsById.get(eventId.trim()) ?? null
  }

  findByCategory(category: VerifiedEventCategory) {
    return this.events.filter((event) => event.category === category)
  }

  findBySymbol(symbol: string) {
    const normalized = normalizeSymbol(symbol)
    if (!normalized) return []
    return this.events.filter((event) => event.affectedSymbols.includes(normalized))
  }

  findByDateRange(range: VerifiedEventDateRange) {
    const start = Date.parse(normalizedTimestamp(range.start, "date range start"))
    const end = Date.parse(normalizedTimestamp(range.end, "date range end"))
    if (start > end) throw new Error("Verified event date range start must not be after end")
    return this.events.filter((event) => {
      const timestamp = Date.parse(event.timestamp)
      return timestamp >= start && timestamp <= end
    })
  }
}
