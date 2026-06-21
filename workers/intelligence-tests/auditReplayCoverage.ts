import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
  historicalAnalogCacheIdentity,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogCache"
import type {
  HistoricalAnalogCachePayloadV2,
  HistoricalAnalogCase,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
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

const REQUIRED_SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const
const OPTIONAL_SYMBOLS = ["SOLUSDT"] as const
const EXCHANGE = "binance_futures"
const TIMEFRAME = "1h"
const CRYPTO_HFT_COVERAGE_START = "2025-07-01"

type AvailabilityState =
  | "available"
  | "missing"
  | "unavailable"
  | "outside_retention"

interface ReplayCaseCoverage {
  caseId: string
  date: string
  hour: number
  timestamp: string
  similarity: number
  replaySource: {
    state: AvailabilityState
    reason: string
  }
  orderbookCache: {
    state: AvailabilityState
    reason: string
    generatedAt: string | null
  }
  replayLearning: {
    state: AvailabilityState
    reason: string
    artifactIds: string[]
  }
}

interface ReplaySymbolCoverage {
  symbol: string
  exchange: string
  timeframe: string
  historicalAnalog: {
    state: AvailabilityState
    reason: string
    generatedAt: string | null
  }
  totalAnalogCases: number
  replayCompatibleCases: number
  replayCompatiblePercent: number
  replaySourceAvailableCases: number
  orderbookCacheAvailableCases: number
  replayLearningAvailableCases: number
  earliestReplayCompatibleDate: string | null
  latestReplayCompatibleDate: string | null
  cases: ReplayCaseCoverage[]
}

function coordinates(analogCase: HistoricalAnalogCase) {
  const timestamp = new Date(analogCase.state.timestamp)
  return {
    date: timestamp.toISOString().slice(0, 10),
    hour: timestamp.getUTCHours(),
    timestamp: timestamp.toISOString(),
  }
}

function unavailableReason(result: { state: string; reason?: string }) {
  return result.reason ?? `Cache state is ${result.state}.`
}

function replayLearningMatches(
  metadata: Record<string, unknown>,
  symbol: string,
  date: string,
  hour: number,
) {
  return (
    metadata.symbol === symbol
    && metadata.exchange === EXCHANGE
    && metadata.date === date
    && metadata.hour === hour
  )
}

async function readAnalog(symbol: string) {
  return readHistoricalCache<HistoricalAnalogCachePayloadV2>(
    historicalAnalogCacheIdentity({ symbol, interval: TIMEFRAME }),
    {
      expectedSchemaVersion: HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
      allowExpired: false,
    },
  )
}

async function auditSymbol(
  symbol: string,
  registry: FileBackedIntelligenceArtifactRegistry,
): Promise<ReplaySymbolCoverage> {
  const analogResult = await readAnalog(symbol)
  if (!analogResult.ok) {
    return {
      symbol,
      exchange: EXCHANGE,
      timeframe: TIMEFRAME,
      historicalAnalog: {
        state: analogResult.state === "missing" ? "missing" : "unavailable",
        reason: unavailableReason(analogResult),
        generatedAt: analogResult.manifest?.generatedAt ?? null,
      },
      totalAnalogCases: 0,
      replayCompatibleCases: 0,
      replayCompatiblePercent: 0,
      replaySourceAvailableCases: 0,
      orderbookCacheAvailableCases: 0,
      replayLearningAvailableCases: 0,
      earliestReplayCompatibleDate: null,
      latestReplayCompatibleDate: null,
      cases: [],
    }
  }

  const coverageStart = CRYPTO_HFT_COVERAGE_START
  const replayLearningArtifacts = (await registry.listBySymbol(symbol))
    .filter((artifact) => artifact.type === "replay_learning")
  const sortedCases = [...analogResult.data.cases].sort(
    (left, right) => left.state.timestamp - right.state.timestamp,
  )
  const cases = await Promise.all(sortedCases.map(async (analogCase) => {
    const window = coordinates(analogCase)
    const sourceAvailable = window.date >= coverageStart
    const matchingLearning = replayLearningArtifacts.filter((artifact) => (
      replayLearningMatches(artifact.metadata, symbol, window.date, window.hour)
    ))

    if (!sourceAvailable) {
      return {
        caseId: analogCase.state.id,
        date: window.date,
        hour: window.hour,
        timestamp: window.timestamp,
        similarity: analogCase.similarity,
        replaySource: {
          state: "outside_retention",
          reason: `Case predates CryptoHFTData coverage starting ${coverageStart}.`,
        },
        orderbookCache: {
          state: "outside_retention",
          reason: "Orderbook source is outside the documented retention window.",
          generatedAt: null,
        },
        replayLearning: {
          state: matchingLearning.length ? "available" : "missing",
          reason: matchingLearning.length
            ? `${matchingLearning.length} Replay Learning artifact(s) are available.`
            : "No Replay Learning artifact exists for this case window.",
          artifactIds: matchingLearning.map((artifact) => artifact.id),
        },
      } satisfies ReplayCaseCoverage
    }

    const orderbookResult = await readHistoricalCache<ReplayOrderbookCachePayload>(
      replayOrderbookCacheIdentity({
        exchange: EXCHANGE,
        symbol,
        date: window.date,
        hour: window.hour,
      }),
      {
        expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
        allowExpired: false,
      },
    )

    return {
      caseId: analogCase.state.id,
      date: window.date,
      hour: window.hour,
      timestamp: window.timestamp,
      similarity: analogCase.similarity,
      replaySource: {
        state: "available",
        reason: `Case is within CryptoHFTData coverage starting ${coverageStart}.`,
      },
      orderbookCache: {
        state: orderbookResult.ok
          ? "available"
          : orderbookResult.state === "missing"
            ? "missing"
            : "unavailable",
        reason: orderbookResult.ok
          ? "Replay orderbook cache is available."
          : unavailableReason(orderbookResult),
        generatedAt: orderbookResult.manifest?.generatedAt ?? null,
      },
      replayLearning: {
        state: matchingLearning.length ? "available" : "missing",
        reason: matchingLearning.length
          ? `${matchingLearning.length} Replay Learning artifact(s) are available.`
          : "No Replay Learning artifact exists for this case window.",
        artifactIds: matchingLearning.map((artifact) => artifact.id),
      },
    } satisfies ReplayCaseCoverage
  }))

  const compatible = cases.filter((item) => item.replaySource.state === "available")
  const orderbookAvailable = compatible.filter(
    (item) => item.orderbookCache.state === "available",
  )
  const learningAvailable = compatible.filter(
    (item) => item.replayLearning.state === "available",
  )

  return {
    symbol,
    exchange: EXCHANGE,
    timeframe: TIMEFRAME,
    historicalAnalog: {
      state: "available",
      reason: `${cases.length} cached Historical Analog cases were audited.`,
      generatedAt: analogResult.manifest.generatedAt,
    },
    totalAnalogCases: cases.length,
    replayCompatibleCases: compatible.length,
    replayCompatiblePercent: cases.length
      ? Number(((compatible.length / cases.length) * 100).toFixed(2))
      : 0,
    replaySourceAvailableCases: compatible.length,
    orderbookCacheAvailableCases: orderbookAvailable.length,
    replayLearningAvailableCases: learningAvailable.length,
    earliestReplayCompatibleDate: compatible.at(0)?.date ?? null,
    latestReplayCompatibleDate: compatible.at(-1)?.date ?? null,
    cases,
  }
}

export async function auditReplayCoverage() {
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const optionalSymbols: string[] = []
  for (const symbol of OPTIONAL_SYMBOLS) {
    const result = await readAnalog(symbol)
    if (result.ok && result.data.cases.length > 0) optionalSymbols.push(symbol)
  }
  const symbols = [...REQUIRED_SYMBOLS, ...optionalSymbols]
  const coverage = []
  for (const symbol of symbols) coverage.push(await auditSymbol(symbol, registry))

  const compatibleCases = coverage.flatMap((target) => (
    target.cases
      .filter((item) => item.replaySource.state === "available")
      .map((item) => ({ symbol: target.symbol, ...item }))
  ))
  const outsideRetention = coverage.flatMap((target) => (
    target.cases
      .filter((item) => item.replaySource.state === "outside_retention")
      .map((item) => ({ symbol: target.symbol, ...item }))
  ))

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    methodology: {
      exchange: EXCHANGE,
      timeframe: TIMEFRAME,
      replaySource: "CryptoHFTData documented coverage window; no provider request is made.",
      replaySourceCoverageStart: CRYPTO_HFT_COVERAGE_START,
      orderbook: "Validated local replay/orderbook-snapshot cache only.",
      replayLearning: "Validated active durable replay_learning artifacts only.",
    },
    coverageSummary: coverage,
    priorities: {
      P0: compatibleCases
        .filter((item) => item.orderbookCache.state !== "available")
        .map((item) => ({
          symbol: item.symbol,
          caseId: item.caseId,
          date: item.date,
          hour: item.hour,
          similarity: item.similarity,
          reason: item.orderbookCache.reason,
        })),
      P1: compatibleCases
        .filter((item) => item.replayLearning.state !== "available")
        .map((item) => ({
          symbol: item.symbol,
          caseId: item.caseId,
          date: item.date,
          hour: item.hour,
          similarity: item.similarity,
          reason: item.replayLearning.reason,
        })),
      P2: outsideRetention.map((item) => ({
        symbol: item.symbol,
        caseId: item.caseId,
        date: item.date,
        hour: item.hour,
        similarity: item.similarity,
        reason: item.replaySource.reason,
      })),
    },
    recommendedBackfillTargets: compatibleCases
      .filter((item) => item.orderbookCache.state !== "available")
      .sort((left, right) => (
        right.similarity - left.similarity
        || left.timestamp.localeCompare(right.timestamp)
      ))
      .map((item) => ({
        symbol: item.symbol,
        exchange: EXCHANGE,
        date: item.date,
        hour: item.hour,
        similarity: item.similarity,
        caseId: item.caseId,
      })),
  }
}

async function main() {
  const report = await auditReplayCoverage()
  process.stdout.write("REPLAY COVERAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `REPLAY COVERAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
