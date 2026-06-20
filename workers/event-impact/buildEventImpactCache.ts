import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  VERIFIED_EVENT_CATEGORIES,
  VERIFIED_EVENT_SEED_CATALOG,
  verifiedEventCatalogReader,
  type VerifiedEvent,
  type VerifiedEventCategory,
} from "@/core/event-catalog"
import { aggregateEventImpact, calculateEventOutcome } from "@/core/event-impact/calculateEventImpact"
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
  type EventImpactEventOutcome,
  type EventImpactResult,
} from "@/core/event-impact/eventImpactTypes"
import type { CanonicalExchange } from "@/core/historical-intelligence/market-data"
import type { HistoricalIngestionJob } from "@/core/historical-intelligence/ingestion/ingestionJobTypes"
import {
  writeHistoricalCache,
  writeHistoricalCacheFailure,
} from "@/lib/historical-intelligence/cache/fileCacheStore"
import { readCanonicalOhlcvCache } from "@/lib/historical-intelligence/market-data"

const CATEGORY_SET = new Set<VerifiedEventCategory>(VERIFIED_EVENT_CATEGORIES)
const EXCHANGE_SET = new Set<CanonicalExchange>([
  "binance_futures",
  "binance_spot",
  "bybit",
  "hyperliquid",
  "deribit",
])

export interface EventImpactCacheBuildInput {
  category: VerifiedEventCategory
  symbol: string
  exchange: CanonicalExchange
}

export interface EventImpactCacheBuildResult {
  job: HistoricalIngestionJob
  categoryPayload: EventImpactCachePayload
  eventPayloads: EventImpactCachePayload[]
}

function normalizeInput(input: EventImpactCacheBuildInput): EventImpactCacheBuildInput {
  const symbol = input.symbol.replace("/", "").trim().toUpperCase()
  const exchange = input.exchange.trim().toLowerCase() as CanonicalExchange
  if (!symbol) throw new Error("Event Impact symbol is required.")
  if (!CATEGORY_SET.has(input.category)) throw new Error(`Unsupported Event Impact category: ${input.category}`)
  if (!EXCHANGE_SET.has(exchange)) throw new Error(`Unsupported canonical exchange: ${input.exchange}`)
  return { category: input.category, symbol, exchange }
}

function sourceMetadata(generatedAt: string, marketDataSource: string): EventImpactResult["source"] {
  return {
    eventCatalog: "verified-event-seed-catalog",
    marketData: [marketDataSource],
    generatedAt,
  }
}

function eventSummary(event: VerifiedEvent): EventImpactResult["events"][number] {
  return {
    eventId: event.eventId,
    title: event.title,
    category: event.category,
    timestamp: event.timestamp,
    source: event.source,
  }
}

function usableOutcome(outcome: EventImpactEventOutcome) {
  return EVENT_IMPACT_HORIZONS.some((horizon) => outcome.outcomes[horizon].available)
}

function resultFor(
  events: VerifiedEvent[],
  outcomes: EventImpactEventOutcome[],
  input: EventImpactCacheBuildInput,
  generatedAt: string,
  marketDataSource: string,
  eventId?: string,
): EventImpactResult {
  const usable = outcomes.filter(usableOutcome)
  return {
    schemaVersion: EVENT_IMPACT_SCHEMA_VERSION,
    ok: usable.length > 0,
    status: usable.length ? "available" : "unavailable",
    reason: usable.length ? undefined : "Canonical OHLCV coverage is unavailable for the verified event windows.",
    query: {
      ...(eventId ? { eventId } : { category: input.category }),
      symbol: input.symbol,
      exchange: input.exchange,
    },
    events: events.map(eventSummary),
    outcomes: usable,
    statistics: aggregateEventImpact(usable),
    sampleCount: usable.length,
    source: sourceMetadata(generatedAt, marketDataSource),
  }
}

function cachePayload(
  result: EventImpactResult,
  input: EventImpactCacheBuildInput,
  generatedAt: string,
  eventId: string | null,
): EventImpactCachePayload {
  return {
    eventId,
    category: input.category,
    symbol: input.symbol,
    exchange: input.exchange,
    source: result.source,
    generatedAt,
    result,
  }
}

function metadata(payload: EventImpactCachePayload): EventImpactCacheMetadata {
  return {
    eventId: payload.eventId,
    category: payload.category,
    symbol: payload.symbol,
    exchange: payload.exchange,
    eventCount: payload.result.events.length,
    sampleCount: payload.result.sampleCount,
    eventCatalog: payload.source.eventCatalog,
    marketData: payload.source.marketData,
  }
}

function buildJob(input: EventImpactCacheBuildInput): HistoricalIngestionJob {
  const now = new Date().toISOString()
  return {
    id: `event-impact-v1:${input.category}:${input.exchange}:${input.symbol}:${now}`,
    kind: "cache_generation",
    source: {
      id: "verified-event-catalog+canonical-ohlcv",
      kind: "derived",
    },
    target: {
      cache: eventImpactCategoryCacheIdentity(input),
      schemaVersion: EVENT_IMPACT_CACHE_SCHEMA_VERSION,
    },
    status: "running",
    dimensions: {
      category: input.category,
      exchange: input.exchange,
      symbol: input.symbol,
    },
    options: {
      eventCatalogVersion: VERIFIED_EVENT_SEED_CATALOG.catalogVersion,
      eventSchemaVersion: VERIFIED_EVENT_SEED_CATALOG.schemaVersion,
      marketInterval: "1h",
    },
    progress: { completed: 0, unit: "records" },
    attempt: 1,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
  }
}

export async function buildEventImpactCache(
  rawInput: EventImpactCacheBuildInput,
): Promise<EventImpactCacheBuildResult> {
  const input = normalizeInput(rawInput)
  const events = verifiedEventCatalogReader.findByCategory(input.category).filter((event) => (
    event.affectedSymbols.includes(input.symbol)
    && event.affectedExchanges.includes(input.exchange)
  ))
  if (!events.length) {
    throw new Error(`No verified ${input.category} events cover ${input.exchange} ${input.symbol}.`)
  }

  const categoryIdentity = eventImpactCategoryCacheIdentity(input)
  const source = {
    id: "event-impact-v1-builder",
    kind: "derived" as const,
    metadata: {
      eventCatalog: "verified-event-seed-catalog",
      marketData: "canonical-ohlcv",
    },
  }
  const job = buildJob(input)

  await writeHistoricalCacheFailure({
    identity: categoryIdentity,
    source,
    schemaVersion: EVENT_IMPACT_CACHE_SCHEMA_VERSION,
    status: "generating",
    metadata: { jobId: job.id, category: input.category, symbol: input.symbol, exchange: input.exchange },
  })

  try {
    const marketData = await readCanonicalOhlcvCache({
      exchange: input.exchange,
      symbol: input.symbol,
      interval: "1h",
    })
    if (!marketData.ok) {
      throw new Error(`Canonical OHLCV cache unavailable: ${"reason" in marketData ? marketData.reason : marketData.state}`)
    }

    const generatedAt = new Date().toISOString()
    const outcomes = events.map((event) => (
      calculateEventOutcome(event, input.symbol, input.exchange, marketData.data.records)
    ))
    const categoryResult = resultFor(
      events,
      outcomes,
      input,
      generatedAt,
      marketData.manifest.source.id,
    )
    if (!categoryResult.ok) throw new Error(categoryResult.reason ?? "Event Impact produced no usable outcomes.")
    const categoryPayload = cachePayload(categoryResult, input, generatedAt, null)
    await writeHistoricalCache({
      identity: categoryIdentity,
      source,
      schemaVersion: EVENT_IMPACT_CACHE_SCHEMA_VERSION,
      data: categoryPayload,
      metadata: metadata(categoryPayload),
      expiresAt: null,
      recordCount: categoryResult.sampleCount,
    })

    const eventPayloads: EventImpactCachePayload[] = []
    for (const event of events) {
      const eventOutcomes = outcomes.filter((outcome) => outcome.eventId === event.eventId)
      const result = resultFor(
        [event],
        eventOutcomes,
        input,
        generatedAt,
        marketData.manifest.source.id,
        event.eventId,
      )
      if (!result.ok) continue
      const payload = cachePayload(result, input, generatedAt, event.eventId)
      await writeHistoricalCache({
        identity: eventImpactEventCacheIdentity({ ...input, eventId: event.eventId }),
        source,
        schemaVersion: EVENT_IMPACT_CACHE_SCHEMA_VERSION,
        data: payload,
        metadata: metadata(payload),
        expiresAt: null,
        recordCount: result.sampleCount,
      })
      eventPayloads.push(payload)
    }

    const completedAt = new Date().toISOString()
    job.status = "succeeded"
    job.completedAt = completedAt
    job.updatedAt = completedAt
    job.progress = { completed: events.length, total: events.length, unit: "records" }
    return { job, categoryPayload, eventPayloads }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Event Impact cache generation failed."
    await writeHistoricalCacheFailure({
      identity: categoryIdentity,
      source,
      schemaVersion: EVENT_IMPACT_CACHE_SCHEMA_VERSION,
      status: "failed",
      metadata: { jobId: job.id, category: input.category, symbol: input.symbol, exchange: input.exchange },
      error: {
        code: "event_impact_cache_generation_failed",
        message,
      },
    })
    throw error
  }
}

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const category = argument("category")
  const symbol = argument("symbol")
  const exchange = argument("exchange")
  if (!category || !CATEGORY_SET.has(category as VerifiedEventCategory) || !symbol || !exchange) {
    throw new Error("Usage: --category <category> --symbol <symbol> --exchange <exchange>")
  }
  const result = await buildEventImpactCache({
    category: category as VerifiedEventCategory,
    symbol,
    exchange: exchange as CanonicalExchange,
  })
  process.stdout.write(`${JSON.stringify({
    cache: result.job.target.cache,
    schemaVersion: result.job.target.schemaVersion,
    categorySamples: result.categoryPayload.result.sampleCount,
    eventCaches: result.eventPayloads.length,
    generatedAt: result.categoryPayload.generatedAt,
  }, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
