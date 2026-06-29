import { NextResponse } from "next/server"

import { SECTOR_REGISTRY } from "@/core/registry/sectorRegistry"
import { buildRealMarketRotation, type BinanceTicker24h, type UpbitTicker } from "@/core/market/realMarketRotation"
import type { ConnectorQualityStatus } from "@/core/marketDataTypes"
import {
  createSourceDegraded,
  createSourceSuccess,
  createSourceUnavailable,
  normalizeSourceMetadata,
} from "@/lib/data-governance/envelope"
import { evaluateFreshness } from "@/lib/data-governance/freshnessPolicy"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BINANCE_TICKER_BASE_URL = "https://api.binance.com/api/v3/ticker/24hr"
const BINANCE_EXCHANGE_INFO_URL = "https://api.binance.com/api/v3/exchangeInfo"
const UPBIT_MARKETS_URL = "https://api.upbit.com/v1/market/all?isDetails=false"
const DATALAB_OVERVIEW_URL = "https://datalab-api.upbit.com/api/v1/indicator/overview"
const BINANCE_TICKER_CHUNK_SIZE = 30
const EXCHANGE_INFO_TTL_MS = 1000 * 60 * 30
const UPBIT_MARKETS_TTL_MS = 1000 * 60 * 10
const FETCH_TIMEOUT_MS = 8500

type TimedCache<T> = {
  expiresAt: number
  value: T
}

let exchangeInfoSymbolCache: TimedCache<Set<string>> | null = null
let upbitMarketCache: TimedCache<Array<{ market: string }>> | null = null

interface BinanceExchangeInfoSymbol {
  symbol: string
  status?: string
  quoteAsset?: string
  isSpotTradingAllowed?: boolean
}

interface BinanceExchangeInfoResponse {
  symbols?: BinanceExchangeInfoSymbol[]
}

type TimestampedBinanceTicker = BinanceTicker24h & { closeTime?: number }
type TimestampedUpbitTicker = UpbitTicker & { timestamp?: number }

function sourceTimestamp(value: unknown): string | null {
  const timestamp = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null
  const date = new Date(timestamp)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function oldestSourceTimestamp(values: Array<string | null>): string | null {
  const valid = values.filter((value): value is string => Boolean(value))
  if (!valid.length) return null
  return valid.reduce((oldest, value) => Date.parse(value) < Date.parse(oldest) ? value : oldest)
}

function aggregateSourceTimestamp(
  binance: BinanceTicker24h[],
  upbit: UpbitTicker[],
): string | null {
  const contributorTimestamps: string[] = []

  if (binance.length) {
    const timestamps = binance.map((ticker) => sourceTimestamp((ticker as TimestampedBinanceTicker).closeTime))
    if (timestamps.some((timestamp) => timestamp === null)) return null
    const oldest = oldestSourceTimestamp(timestamps)
    if (!oldest) return null
    contributorTimestamps.push(oldest)
  }

  if (upbit.length) {
    const timestamps = upbit.map((ticker) => sourceTimestamp((ticker as TimestampedUpbitTicker).timestamp))
    if (timestamps.some((timestamp) => timestamp === null)) return null
    const oldest = oldestSourceTimestamp(timestamps)
    if (!oldest) return null
    contributorTimestamps.push(oldest)
  }

  return oldestSourceTimestamp(contributorTimestamps)
}

function uniqueRegistryBinanceSymbols() {
  return [...new Set(
    SECTOR_REGISTRY
      .flatMap((sector) => sector.symbols)
      .map((symbol) => `${symbol.toUpperCase()}USDT`)
  )]
}

function buildBinanceTickerUrl(symbols: string[]) {
  const params = new URLSearchParams({ symbols: JSON.stringify(symbols) })
  return `${BINANCE_TICKER_BASE_URL}?${params.toString()}`
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function extractNumberByKeys(value: unknown, keys: string[]): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (!value || typeof value !== "object") return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractNumberByKeys(item, keys)
      if (found !== null) return found
    }
    return null
  }

  const record = value as Record<string, unknown>
  for (const key of keys) {
    const raw = record[key]
    const parsed = typeof raw === "number" ? raw : Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }

  for (const nested of Object.values(record)) {
    const found = extractNumberByKeys(nested, keys)
    if (found !== null) return found
  }

  return null
}

async function fetchJson<T>(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      // Keep this route fully dynamic. Large upstream payloads must never enter
      // the Next.js data cache, otherwise dev/build can fail on cache item limits.
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "QuantTerminal/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`)
    }

    return response.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

async function timedFetchJson<T>(name: ConnectorQualityStatus["name"], url: string): Promise<{ data: T | null; quality: ConnectorQualityStatus }> {
  const started = Date.now()
  try {
    const data = await fetchJson<T>(url)
    const records = Array.isArray(data) ? data.length : undefined
    return {
      data,
      quality: {
        name,
        status: records === 0 ? "partial" : "connected",
        latencyMs: Date.now() - started,
        records,
      },
    }
  } catch (error) {
    return {
      data: null,
      quality: {
        name,
        status: "error",
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

async function getTradableBinanceUsdtSymbols(): Promise<{ symbols: Set<string>; cache: "hit" | "miss"; latencyMs: number }> {
  const now = Date.now()
  if (exchangeInfoSymbolCache && exchangeInfoSymbolCache.expiresAt > now) {
    return { symbols: exchangeInfoSymbolCache.value, cache: "hit", latencyMs: 0 }
  }

  const started = Date.now()
  const exchangeInfo = await fetchJson<BinanceExchangeInfoResponse>(BINANCE_EXCHANGE_INFO_URL)
  const symbols = new Set(
    (exchangeInfo.symbols ?? [])
      .filter((symbol) =>
        symbol.status === "TRADING" &&
        symbol.quoteAsset === "USDT" &&
        symbol.isSpotTradingAllowed !== false
      )
      .map((symbol) => symbol.symbol)
  )

  exchangeInfoSymbolCache = {
    expiresAt: now + EXCHANGE_INFO_TTL_MS,
    value: symbols,
  }

  return { symbols, cache: "miss", latencyMs: Date.now() - started }
}

async function getUpbitMarkets(): Promise<{ markets: Array<{ market: string }>; cache: "hit" | "miss"; quality: ConnectorQualityStatus }> {
  const now = Date.now()
  if (upbitMarketCache && upbitMarketCache.expiresAt > now) {
    return {
      markets: upbitMarketCache.value,
      cache: "hit",
      quality: {
        name: "upbit-markets",
        status: "connected",
        latencyMs: 0,
        records: upbitMarketCache.value.length,
        message: "served from in-memory TTL cache",
      },
    }
  }

  const result = await timedFetchJson<Array<{ market: string }>>("upbit-markets", UPBIT_MARKETS_URL)
  if (result.data) {
    upbitMarketCache = {
      expiresAt: now + UPBIT_MARKETS_TTL_MS,
      value: result.data,
    }
  }
  return {
    markets: result.data ?? [],
    cache: "miss",
    quality: result.quality,
  }
}

async function fetchValidatedBinanceTickers(): Promise<{
  tickers: BinanceTicker24h[]
  qualities: ConnectorQualityStatus[]
  invalidSymbols: string[]
  requestedSymbols: number
  validSymbols: number
  chunkCount: number
  exchangeInfoCache: "hit" | "miss"
  failedChunks: number
}> {
  const requestedSymbols = uniqueRegistryBinanceSymbols()
  let tradableUsdtSymbols = new Set<string>()
  let exchangeInfoCache: "hit" | "miss" = "miss"
  const qualities: ConnectorQualityStatus[] = []

  try {
    const exchangeInfoResult = await getTradableBinanceUsdtSymbols()
    tradableUsdtSymbols = exchangeInfoResult.symbols
    exchangeInfoCache = exchangeInfoResult.cache
    qualities.push({
      name: "binance-exchange-info",
      status: tradableUsdtSymbols.size ? "connected" : "partial",
      latencyMs: exchangeInfoResult.latencyMs,
      records: tradableUsdtSymbols.size,
      message: exchangeInfoResult.cache === "hit" ? "served from in-memory TTL cache" : undefined,
    })
  } catch (error) {
    qualities.push({
      name: "binance-exchange-info",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    })

    return {
      tickers: [],
      qualities,
      invalidSymbols: requestedSymbols,
      requestedSymbols: requestedSymbols.length,
      validSymbols: 0,
      chunkCount: 0,
      exchangeInfoCache,
      failedChunks: 0,
    }
  }

  const validSymbols = requestedSymbols.filter((symbol) => tradableUsdtSymbols.has(symbol))
  const invalidSymbols = requestedSymbols.filter((symbol) => !tradableUsdtSymbols.has(symbol))
  const chunks = chunkArray(validSymbols, BINANCE_TICKER_CHUNK_SIZE)
  const tickerStarted = Date.now()

  const chunkResults = await Promise.all(
    chunks.map(async (symbols) => {
      try {
        return await fetchJson<BinanceTicker24h[]>(buildBinanceTickerUrl(symbols))
      } catch {
        return []
      }
    })
  )

  const tickers = chunkResults.flat()
  const failedChunks = chunkResults.filter((chunk) => chunk.length === 0).length
  qualities.push({
    name: "binance",
    status: !validSymbols.length
      ? "idle"
      : failedChunks === 0
        ? "connected"
        : tickers.length
          ? "partial"
          : "error",
    latencyMs: Date.now() - tickerStarted,
    records: tickers.length,
    message: invalidSymbols.length
      ? `${invalidSymbols.length} registry symbols are not active Binance spot USDT pairs.`
      : undefined,
  })

  return {
    tickers,
    qualities,
    invalidSymbols,
    requestedSymbols: requestedSymbols.length,
    validSymbols: validSymbols.length,
    chunkCount: chunks.length,
    exchangeInfoCache,
    failedChunks,
  }
}

function buildUpbitTickerUrl(markets: string[]) {
  const unique = [...new Set(markets)].slice(0, 120)
  return `https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(unique.join(","))}`
}

export async function GET() {
  const notes: string[] = []

  try {
    const [binanceResult, upbitMarketsResult, dataLabResult] = await Promise.all([
      fetchValidatedBinanceTickers(),
      getUpbitMarkets(),
      timedFetchJson<unknown>("datalab", DATALAB_OVERVIEW_URL),
    ])

    const connectorQuality: ConnectorQualityStatus[] = [
      ...binanceResult.qualities,
      upbitMarketsResult.quality,
      dataLabResult.quality,
    ]

    const binance = binanceResult.tickers
    if (binanceResult.invalidSymbols.length) {
      notes.push(
        `Binance validation excluded ${binanceResult.invalidSymbols.length} inactive/nonexistent spot USDT symbols: ${binanceResult.invalidSymbols.slice(0, 12).join(", ")}${binanceResult.invalidSymbols.length > 12 ? ", ..." : ""}`
      )
    }

    const registrySymbols = new Set(SECTOR_REGISTRY.flatMap((sector) => sector.symbols))
    const krwMarkets = upbitMarketsResult.markets
      .map((item) => item.market)
      .filter((market) => market.startsWith("KRW-") && registrySymbols.has(market.replace("KRW-", "")))

    if (upbitMarketsResult.quality.status === "error") notes.push(`Upbit market list failed: ${upbitMarketsResult.quality.message}`)

    let upbitTickers: UpbitTicker[] = []
    if (krwMarkets.length) {
      const upbitTickerResult = await timedFetchJson<UpbitTicker[]>("upbit-ticker", buildUpbitTickerUrl(krwMarkets))
      connectorQuality.push(upbitTickerResult.quality)
      upbitTickers = upbitTickerResult.data ?? []
      if (upbitTickerResult.quality.status === "error") notes.push(`Upbit ticker failed: ${upbitTickerResult.quality.message}`)
    } else {
      connectorQuality.push({ name: "upbit-ticker", status: "idle", records: 0, message: "No KRW registry markets matched." })
    }

    const premium = dataLabResult.data
      ? extractNumberByKeys(dataLabResult.data, ["premium", "value", "index", "score"])
      : null
    if (dataLabResult.quality.status === "error") notes.push(`DataLab overview failed: ${dataLabResult.quality.message}`)

    const result = buildRealMarketRotation({
      binanceTickers: binance,
      upbitTickers,
      premium,
      updatedAt: new Date().toISOString(),
      connectorQuality,
    })
    const responseMode = result.ok && notes.length ? "partial" : result.mode
    const lastUpdatedAt = aggregateSourceTimestamp(binance, upbitTickers)
    const freshness = evaluateFreshness({
      sourceId: "sector-rotation",
      lastUpdatedAt,
      retrievedAt: result.updatedAt,
    })
    const partial = responseMode === "partial" || result.dataQuality?.status !== "healthy"
    const sourceResult = !result.ok || !result.sectors.length
      ? createSourceUnavailable("sector-rotation", "EMPTY_RESPONSE")
      : freshness.status === "EXPIRED" || freshness.status === "UNAVAILABLE"
        ? createSourceUnavailable("sector-rotation", freshness.status === "EXPIRED" ? "EXPIRED" : "INVALID_RESPONSE")
        : freshness.status === "STALE"
          ? createSourceDegraded("sector-rotation", result, "STALE_DATA", undefined, {
              freshnessStatus: freshness.status,
              qualityLevel: "LOW",
              lastUpdatedAt,
              retrievedAt: result.updatedAt,
              cacheStatus: "BYPASS",
            })
          : partial
            ? createSourceDegraded("sector-rotation", result, "PARTIAL_DATA", undefined, {
                freshnessStatus: freshness.status,
                qualityLevel: "MEDIUM",
                lastUpdatedAt,
                retrievedAt: result.updatedAt,
                cacheStatus: "BYPASS",
              })
            : createSourceSuccess("sector-rotation", result, {
                freshnessStatus: freshness.status,
                qualityLevel: "MEDIUM",
                lastUpdatedAt,
                retrievedAt: result.updatedAt,
                cacheStatus: "BYPASS",
              })
    const sourceMetadata = sourceResult.status === "UNAVAILABLE"
      ? normalizeSourceMetadata("sector-rotation", {
          freshnessStatus: freshness.status,
          qualityLevel: sourceResult.metadata.qualityLevel,
          sourceStatus: sourceResult.metadata.sourceStatus,
          lastUpdatedAt,
          retrievedAt: result.updatedAt,
          unavailableReason: sourceResult.metadata.unavailableReason,
          cacheStatus: sourceResult.metadata.cacheStatus,
        })
      : sourceResult.metadata

    return NextResponse.json({
      ...result,
      mode: responseMode,
      notes: [...result.notes, ...notes],
      binanceValidation: {
        requestedSymbols: binanceResult.requestedSymbols,
        validSymbols: binanceResult.validSymbols,
        invalidSymbols: binanceResult.invalidSymbols,
        chunkSize: BINANCE_TICKER_CHUNK_SIZE,
        chunkCount: binanceResult.chunkCount,
        exchangeInfoCache: binanceResult.exchangeInfoCache,
        failedChunks: binanceResult.failedChunks,
      },
      _source: sourceMetadata,
    })
  } catch (error) {
    const retrievedAt = new Date().toISOString()
    const unavailable = createSourceUnavailable("sector-rotation", "SOURCE_UNAVAILABLE")
    const sourceMetadata = normalizeSourceMetadata("sector-rotation", {
      freshnessStatus: unavailable.metadata.freshnessStatus,
      qualityLevel: unavailable.metadata.qualityLevel,
      sourceStatus: unavailable.metadata.sourceStatus,
      retrievedAt,
      unavailableReason: unavailable.metadata.unavailableReason,
      cacheStatus: unavailable.metadata.cacheStatus,
    })

    return NextResponse.json(
      {
        ok: false,
        source: "binance-upbit-real-market",
        updatedAt: retrievedAt,
        mode: "error",
        sectors: [],
        assets: [],
        endpoints: {
          binanceExchangeInfo: BINANCE_EXCHANGE_INFO_URL,
          binanceTicker24h: BINANCE_TICKER_BASE_URL,
          upbitMarkets: UPBIT_MARKETS_URL,
          dataLabOverview: DATALAB_OVERVIEW_URL,
        },
        coverage: {
          binanceSymbols: 0,
          upbitSymbols: 0,
          mappedAssets: 0,
          sectors: 0,
        },
        coverageAudit: [],
        dataQuality: {
          status: "error",
          stale: true,
          generatedAt: new Date().toISOString(),
          connectors: [],
        },
        notes: [error instanceof Error ? error.message : "Unknown sector rotation error"],
        _source: sourceMetadata,
      },
      { status: 500 }
    )
  }
}
