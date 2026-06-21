import { access, readdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  VERIFIED_EVENT_CATEGORIES,
  verifiedEventCatalogReader,
  type VerifiedEventCategory,
} from "@/core/event-catalog"
import {
  EVENT_IMPACT_CACHE_SCHEMA_VERSION,
  eventImpactCategoryCacheIdentity,
  type EventImpactCachePayload,
} from "@/core/event-impact"
import {
  HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
  historicalAnalogCacheIdentity,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogCache"
import type {
  HistoricalAnalogCachePayloadV2,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
import {
  CANONICAL_MARKET_DATA_SCHEMA_VERSIONS,
  canonicalMarketDataCacheIdentity,
  type CanonicalMarketDataPayload,
  type CanonicalOhlcvCandle,
} from "@/core/historical-intelligence/market-data"
import {
  REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
  replayOrderbookCacheIdentity,
  type ReplayOrderbookCachePayload,
} from "@/core/replay/replayOrderbookCache"
import {
  readHistoricalCache,
} from "@/lib/historical-intelligence/cache/fileCacheStore"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

const TARGETS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"] as const
const EXCHANGE = "binance_futures"
const TIMEFRAME = "1h"
const REPLAY_CASE_LIMIT = 3
const CRYPTO_HFT_COVERAGE_START = "2025-07-01"

type CoverageState =
  | "available"
  | "partial"
  | "missing"
  | "unavailable"
  | "blocked"
  | "not_applicable"
  | "not_locally_inspectable"

interface CoverageItem {
  state: CoverageState
  reason: string
  generatedAt?: string | null
  source?: string | null
  details?: Record<string, unknown>
}

interface TargetCoverage {
  symbol: string
  exchange: string
  timeframe: string
  canonicalOhlcv: CoverageItem
  historicalAnalog: CoverageItem
  eventImpact: CoverageItem
  marketMemory: CoverageItem
  replayAccess: CoverageItem
  replayOrderbook: CoverageItem
  replayLearning: CoverageItem
}

function unavailableReason(result: {
  state: string
  reason?: string
}) {
  return result.reason ?? `Cache state is ${result.state}.`
}

async function inspectCanonicalOhlcv(symbol: string): Promise<CoverageItem> {
  const result = await readHistoricalCache<
    CanonicalMarketDataPayload<CanonicalOhlcvCandle>
  >(
    canonicalMarketDataCacheIdentity({
      dataset: "ohlcv",
      exchange: EXCHANGE,
      symbol,
      interval: TIMEFRAME,
    }),
    {
      expectedSchemaVersion: CANONICAL_MARKET_DATA_SCHEMA_VERSIONS.ohlcv,
      allowExpired: false,
    },
  )
  if (!result.ok) {
    return {
      state: result.state === "missing" ? "missing" : "unavailable",
      reason: unavailableReason(result),
      generatedAt: result.manifest?.generatedAt ?? null,
      source: result.manifest?.source.id ?? null,
    }
  }
  return {
    state: result.data.records.length ? "available" : "unavailable",
    reason: result.data.records.length
      ? `${result.data.records.length} canonical OHLCV records are cached.`
      : "Canonical OHLCV cache contains no records.",
    generatedAt: result.manifest.generatedAt,
    source: result.manifest.source.id,
    details: {
      recordCount: result.data.records.length,
      firstOpenTime: result.data.records[0]?.openTime ?? null,
      lastOpenTime: result.data.records.at(-1)?.openTime ?? null,
    },
  }
}

async function inspectHistoricalAnalog(symbol: string) {
  const result = await readHistoricalCache<HistoricalAnalogCachePayloadV2>(
    historicalAnalogCacheIdentity({ symbol, interval: TIMEFRAME }),
    {
      expectedSchemaVersion: HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
      allowExpired: false,
    },
  )
  if (!result.ok) {
    return {
      item: {
        state: result.state === "missing" ? "missing" : "unavailable",
        reason: unavailableReason(result),
        generatedAt: result.manifest?.generatedAt ?? null,
        source: result.manifest?.source.id ?? null,
      } satisfies CoverageItem,
      payload: null,
    }
  }
  const analogCount = result.data.cases.length
  return {
    item: {
      state: analogCount ? "available" : "unavailable",
      reason: analogCount
        ? `${analogCount} cached analog cases are available.`
        : "Historical Analog cache is valid but contains no cases.",
      generatedAt: result.manifest.generatedAt,
      source: result.manifest.source.id,
      details: {
        analogCount,
        candidateCount: result.data.search.candidateCount,
        currentStateId: result.data.currentState.id,
        currentStateTimestamp: new Date(result.data.currentState.timestamp).toISOString(),
      },
    } satisfies CoverageItem,
    payload: result.data,
  }
}

function supportedEventCategories(symbol: string) {
  const events = verifiedEventCatalogReader
    .findBySymbol(symbol)
    .filter((event) => event.affectedExchanges.includes(EXCHANGE))
  return [...new Set(events.map((event) => event.category))].sort()
}

async function inspectEventImpact(symbol: string): Promise<CoverageItem> {
  const categories = supportedEventCategories(symbol)
  if (!categories.length) {
    return {
      state: "not_applicable",
      reason: `Verified Event Catalog has no ${EXCHANGE} events scoped to ${symbol}.`,
      source: "verified-event-seed-catalog",
      details: {
        supportedCatalogCategories: [],
        catalogCategories: VERIFIED_EVENT_CATEGORIES,
      },
    }
  }

  const results = await Promise.all(categories.map(async (category) => {
    const result = await readHistoricalCache<EventImpactCachePayload>(
      eventImpactCategoryCacheIdentity({
        category: category as VerifiedEventCategory,
        exchange: EXCHANGE,
        symbol,
      }),
      {
        expectedSchemaVersion: EVENT_IMPACT_CACHE_SCHEMA_VERSION,
        allowExpired: false,
      },
    )
    return {
      category,
      ready: result.ok && result.data.result.sampleCount > 0,
      state: result.state,
      reason: result.ok
        ? `${result.data.result.sampleCount} event outcomes are cached.`
        : unavailableReason(result),
      sampleCount: result.ok ? result.data.result.sampleCount : 0,
      generatedAt: result.manifest?.generatedAt ?? null,
    }
  }))
  const ready = results.filter((result) => result.ready)
  return {
    state: ready.length === results.length
      ? "available"
      : ready.length
        ? "partial"
        : "missing",
    reason: ready.length
      ? `${ready.length}/${results.length} supported event categories have cache coverage.`
      : "No supported Event Impact category cache is available.",
    generatedAt: ready.map((result) => result.generatedAt).filter(Boolean).sort().at(-1) ?? null,
    source: "verified-event-seed-catalog+canonical-ohlcv",
    details: { categories: results },
  }
}

function replayCoordinates(timestamp: number) {
  const date = new Date(timestamp)
  return {
    exchange: EXCHANGE,
    symbol: "",
    date: date.toISOString().slice(0, 10),
    hour: date.getUTCHours(),
  }
}

async function inspectReplayOrderbook(
  symbol: string,
  analog: HistoricalAnalogCachePayloadV2 | null,
): Promise<CoverageItem> {
  if (!analog?.cases.length) {
    return {
      state: "blocked",
      reason: "Replay orderbook coverage cannot be targeted until a Historical Analog case is available.",
    }
  }

  const coverageStart = CRYPTO_HFT_COVERAGE_START
  const replayCompatibleCases = analog.cases.filter((analogCase) => (
    new Date(analogCase.state.timestamp).toISOString().slice(0, 10) >= coverageStart
  ))
  if (!replayCompatibleCases.length) {
    return {
      state: "blocked",
      reason: `Historical Analog cases exist, but none fall within CryptoHFTData coverage starting ${coverageStart}.`,
      source: "replay/orderbook-snapshot",
      details: {
        analogCaseCount: analog.cases.length,
        replayCompatibleCaseCount: 0,
        coverageStart,
      },
    }
  }

  const windows = await Promise.all(
    replayCompatibleCases.slice(0, REPLAY_CASE_LIMIT).map(async (analogCase) => {
      const coordinates = {
        ...replayCoordinates(analogCase.state.timestamp),
        symbol,
      }
      const result = await readHistoricalCache<ReplayOrderbookCachePayload>(
        replayOrderbookCacheIdentity(coordinates),
        {
          expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
          allowExpired: false,
        },
      )
      return {
        caseId: analogCase.state.id,
        similarity: analogCase.similarity,
        date: coordinates.date,
        hour: coordinates.hour,
        state: result.ok ? "available" : result.state,
        reason: result.ok ? "Replay orderbook cache is ready." : unavailableReason(result),
        generatedAt: result.manifest?.generatedAt ?? null,
      }
    }),
  )
  const available = windows.filter((window) => window.state === "available")
  return {
    state: available.length === windows.length
      ? "available"
      : available.length
        ? "partial"
        : "missing",
    reason: available.length
      ? `${available.length}/${windows.length} inspected analog windows have Replay orderbook cache.`
      : "No inspected Historical Analog window has a Replay orderbook cache.",
    generatedAt: available.map((window) => window.generatedAt).filter(Boolean).sort().at(-1) ?? null,
    source: "replay/orderbook-snapshot",
    details: {
      analogCaseCount: analog.cases.length,
      replayCompatibleCaseCount: replayCompatibleCases.length,
      coverageStart,
      inspectedWindows: windows,
    },
  }
}

async function inspectLocalMetadata(paths: string[]): Promise<CoverageItem> {
  const present: Array<{ root: string; fileCount: number }> = []
  for (const root of paths) {
    try {
      await access(root)
      const files = await readdir(root, { recursive: true, withFileTypes: true })
      present.push({
        root,
        fileCount: files.filter((entry) => entry.isFile()).length,
      })
    } catch {
      // Missing optional local metadata roots are expected.
    }
  }
  if (!present.length) {
    return {
      state: "not_locally_inspectable",
      reason: "No local cache contract or persisted metadata was found for this live data source.",
    }
  }
  return {
    state: "partial",
    reason: "Local files exist, but no canonical Research coverage contract is available for deterministic validation.",
    details: { roots: present },
  }
}

function aggregateState(items: CoverageItem[]): CoverageState {
  const available = items.filter((item) => item.state === "available").length
  if (available === items.length) return "available"
  if (available > 0) return "partial"
  if (items.every((item) => item.state === "not_applicable")) return "not_applicable"
  if (items.some((item) => item.state === "blocked")) return "blocked"
  if (items.every((item) => item.state === "not_locally_inspectable")) {
    return "not_locally_inspectable"
  }
  return "unavailable"
}

export async function auditResearchCoverage() {
  const auditedAt = new Date().toISOString()
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const artifactSearch = await registry.search({
    includeArchived: true,
    includeExpired: true,
    limit: 500,
  })
  const artifactCounts = artifactSearch.artifacts.reduce<Record<string, number>>(
    (counts, artifact) => {
      counts[artifact.type] = (counts[artifact.type] ?? 0) + 1
      return counts
    },
    {},
  )

  const targets: TargetCoverage[] = []
  for (const symbol of TARGETS) {
    const canonicalOhlcv = await inspectCanonicalOhlcv(symbol)
    const historical = await inspectHistoricalAnalog(symbol)
    const eventImpact = await inspectEventImpact(symbol)
    const symbolArtifacts = artifactSearch.artifacts.filter((artifact) => (
      artifact.subjects.symbols?.includes(symbol)
    ))
    const marketMemoryArtifacts = symbolArtifacts.filter((artifact) => (
      artifact.type === "market_memory"
    ))
    const replayLearningArtifacts = symbolArtifacts.filter((artifact) => (
      artifact.type === "replay_learning"
    ))
    const replayOrderbook = await inspectReplayOrderbook(symbol, historical.payload)

    targets.push({
      symbol,
      exchange: EXCHANGE,
      timeframe: TIMEFRAME,
      canonicalOhlcv,
      historicalAnalog: historical.item,
      eventImpact,
      marketMemory: {
        state: "unavailable",
        reason: marketMemoryArtifacts.length
          ? `${marketMemoryArtifacts.length} durable Market Memory artifacts exist, but Research reads a process-local catalog that is not durable across restarts.`
          : "No durable Market Memory artifact exists and Research reads a process-local catalog.",
        source: "durable-artifact-store+process-local-market-memory-catalog",
        details: {
          durableArtifactCount: marketMemoryArtifacts.length,
          durableArtifactIds: marketMemoryArtifacts.map((artifact) => artifact.id),
          researchCatalogDurable: false,
        },
      },
      replayAccess: historical.payload?.cases.length
        ? {
            state: "available",
            reason: `${historical.payload.cases.length} Historical Analog cases provide exact Replay coordinates.`,
            details: {
              firstCaseId: historical.payload.cases[0].state.id,
              firstCaseTimestamp: new Date(
                historical.payload.cases[0].state.timestamp,
              ).toISOString(),
              cryptoHftCoverageStart: CRYPTO_HFT_COVERAGE_START,
              replayCompatibleCaseCount: historical.payload.cases.filter((analogCase) => (
                new Date(analogCase.state.timestamp).toISOString().slice(0, 10)
                  >= CRYPTO_HFT_COVERAGE_START
              )).length,
            },
          }
        : {
            state: "blocked",
            reason: "Replay access requires a cached Historical Analog case selection.",
          },
      replayOrderbook,
      replayLearning: {
        state: replayLearningArtifacts.length ? "available" : "missing",
        reason: replayLearningArtifacts.length
          ? `${replayLearningArtifacts.length} Replay Learning artifacts are durable.`
          : "No durable Replay Learning artifact exists for this symbol.",
        source: "durable-artifact-store",
        details: {
          artifactCount: replayLearningArtifacts.length,
          artifactIds: replayLearningArtifacts.map((artifact) => artifact.id),
        },
      },
    })
  }

  const narrativeContext = await inspectLocalMetadata([
    path.join(process.cwd(), ".data", "narratives"),
    path.join(process.cwd(), ".data", "cache", "narratives"),
    path.join(process.cwd(), ".data", "intelligence", "narratives"),
  ])
  const predictionMarkets = await inspectLocalMetadata([
    path.join(process.cwd(), ".data", "prediction-markets"),
    path.join(process.cwd(), ".data", "cache", "prediction-markets"),
    path.join(process.cwd(), ".data", "intelligence", "prediction-markets"),
  ])

  const dependencyMap = [
    {
      section: "Narrative Context",
      dependency: "Live /api/narratives tagged items; no canonical local cache",
      status: narrativeContext.state,
      userImpact: "Research cannot distinguish a quiet narrative window from a live-provider or tagging failure using local metadata alone.",
    },
    {
      section: "Prediction Markets",
      dependency: "Live Polymarket Gamma attention markets; no canonical local cache",
      status: predictionMarkets.state,
      userImpact: "Research has no prepared fallback when live attention filtering returns zero markets.",
    },
    {
      section: "Historical Analog Summary",
      dependency: "historical-intelligence/historical-analog-v2 by symbol and 1h",
      status: aggregateState(targets.map((target) => target.historicalAnalog)),
      userImpact: "Missing symbols cannot enter the analog-case and outcome workflow.",
    },
    {
      section: "Event Impact",
      dependency: "verified event catalog plus canonical OHLCV plus event-impact category cache",
      status: aggregateState(targets.map((target) => target.eventImpact)),
      userImpact: "Supported symbols without prepared caches cannot show deterministic post-event outcomes.",
    },
    {
      section: "Market Memory",
      dependency: "Durable market_memory artifacts plus a durable Research catalog reader",
      status: aggregateState(targets.map((target) => target.marketMemory)),
      userImpact: "Research reports the catalog as unavailable after process restart even when durable memory artifacts exist.",
    },
    {
      section: "Replay Access",
      dependency: "Selected Historical Analog case with exact date and UTC hour",
      status: aggregateState(targets.map((target) => target.replayAccess)),
      userImpact: "Symbols without Historical Analog coverage cannot hand off an exact Replay window.",
    },
    {
      section: "Orderbook",
      dependency: "replay/orderbook-snapshot cache for the selected analog window",
      status: aggregateState(targets.map((target) => target.replayOrderbook)),
      userImpact: "Replay remains usable, but cached orderbook evidence is unavailable for inspected analog cases.",
    },
  ]

  const p0Missing = [
    ...targets
      .filter((target) => target.historicalAnalog.state !== "available")
      .map((target) => `Historical Analog ${target.symbol} ${TIMEFRAME}`),
    ...targets
      .filter((target) => (
        target.eventImpact.state !== "available"
        && target.eventImpact.state !== "not_applicable"
      ))
      .map((target) => `Event Impact ${target.symbol} supported verified-event categories`),
    "Durable Market Memory catalog consumption for Research",
  ]

  return {
    schemaVersion: 1,
    auditedAt,
    readOnly: true,
    target: {
      symbols: TARGETS,
      exchange: EXCHANGE,
      timeframe: TIMEFRAME,
    },
    targets,
    inventory: {
      durableArtifactTotal: artifactSearch.total,
      durableArtifactsByType: artifactCounts,
      narrativeContext,
      predictionMarkets,
      verifiedEventCatalog: {
        source: "verified-event-seed-catalog",
        categories: VERIFIED_EVENT_CATEGORIES,
        eventsByTarget: Object.fromEntries(TARGETS.map((symbol) => [
          symbol,
          supportedEventCategories(symbol),
        ])),
      },
    },
    dependencyMap,
    priorities: {
      P0: p0Missing,
      P1: [
        "Replay orderbook cache for selected Historical Analog cases",
        "Replay Learning artifacts for BTCUSDT, ETHUSDT, and SOLUSDT",
      ],
      P2: [
        "Persisted Narrative tagged-item coverage metadata",
        "Persisted Prediction Market attention coverage metadata",
      ],
    },
    recommendedBackfillOrder: [
      "Generate Historical Analog 1h caches for ETHUSDT and SOLUSDT after verifying source OHLCV coverage.",
      "Generate canonical ETHUSDT 1h OHLCV and macro Event Impact; SOLUSDT requires verified event catalog expansion before Event Impact.",
      "Make Research consume durable Market Memory artifacts or add a durable catalog adapter; existing process-local catalog generation is not sufficient.",
      "Generate Replay orderbook caches only for selected analog windows with available CryptoHFTData source files.",
      "Add a manual Replay Learning publication command before attempting Replay Learning backfill.",
      "Treat Narrative and Prediction Markets as live-source operational coverage until canonical local snapshot contracts exist.",
    ],
  }
}

async function main() {
  const report = await auditResearchCoverage()
  process.stdout.write("RESEARCH COVERAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`RESEARCH COVERAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
