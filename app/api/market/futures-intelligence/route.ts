import { NextResponse } from "next/server"

import { SECTOR_REGISTRY } from "@/core/registry/sectorRegistry"
import { buildFuturesIntelligence, mapFuturesSymbol } from "@/core/futures/buildFuturesIntelligence"
import type { FuturesConnectorTelemetry, FuturesSymbolSnapshot } from "@/core/futuresTypes"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BINANCE_FAPI = "https://fapi.binance.com"
const REQUEST_TIMEOUT_MS = 5500
const MAX_FUTURES_SYMBOLS = 72
const CONCURRENCY = 8
const EXCHANGE_INFO_TTL_MS = 10 * 60 * 1000

type FuturesExchangeInfo = {
  symbols?: Array<{
    symbol: string
    contractType?: string
    quoteAsset?: string
    status?: string
  }>
}

type OpenInterestPayload = {
  symbol: string
  openInterest?: string
}

type PremiumIndexPayload = {
  symbol: string
  markPrice?: string
  indexPrice?: string
  lastFundingRate?: string
  nextFundingTime?: number
}

type ExchangeInfoCache = {
  expiresAt: number
  symbols: Set<string>
}

type FailedSymbolFetch = {
  symbol: string
  stage: "openInterest" | "premiumIndex" | "combined"
  message: string
}

declare global {
  // eslint-disable-next-line no-var
  var __qtBinanceFuturesExchangeInfoCache: ExchangeInfoCache | undefined
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

async function fetchJson<T>(url: string): Promise<T> {
  const timeout = timeoutSignal(REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: timeout.signal,
      headers: {
        accept: "application/json",
      },
    })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return (await response.json()) as T
  } finally {
    timeout.cancel()
  }
}

async function timed<T>(name: FuturesConnectorTelemetry["name"], fn: () => Promise<T>, records?: (value: T) => number) {
  const started = Date.now()
  try {
    const value = await fn()
    return {
      value,
      connector: {
        name,
        status: "connected" as const,
        latencyMs: Date.now() - started,
        records: records?.(value),
      },
    }
  } catch (error) {
    return {
      value: null,
      connector: {
        name,
        status: "error" as const,
        latencyMs: Date.now() - started,
        records: 0,
        message: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

async function getFuturesExchangeSymbols() {
  const cached = globalThis.__qtBinanceFuturesExchangeInfoCache
  if (cached && cached.expiresAt > Date.now()) {
    return { symbols: cached.symbols, cache: "hit" as const }
  }

  const payload = await fetchJson<FuturesExchangeInfo>(`${BINANCE_FAPI}/fapi/v1/exchangeInfo`)
  const symbols = new Set(
    (payload.symbols ?? [])
      .filter((item) => item.status === "TRADING")
      .filter((item) => item.contractType === "PERPETUAL")
      .filter((item) => item.quoteAsset === "USDT")
      .map((item) => item.symbol)
  )

  globalThis.__qtBinanceFuturesExchangeInfoCache = {
    expiresAt: Date.now() + EXCHANGE_INFO_TTL_MS,
    symbols,
  }

  return { symbols, cache: "miss" as const }
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R | null>) {
  const output: R[] = []
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      const result = await worker(items[index])
      if (result) output.push(result)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return output
}

function requestedSymbols() {
  return unique(
    SECTOR_REGISTRY.flatMap((sector) => sector.symbols.map((symbol) => `${symbol}USDT`))
  )
}

export async function GET() {
  try {
    const requested = requestedSymbols()
    const connectors: FuturesConnectorTelemetry[] = []
    const failedSymbolFetches: FailedSymbolFetch[] = []
    const recordSymbolFailure = (failure: FailedSymbolFetch) => {
      if (failedSymbolFetches.length >= 5) return
      failedSymbolFetches.push(failure)
    }

    const exchangeInfo = await timed(
      "binance-futures-exchange-info",
      getFuturesExchangeSymbols,
      (value) => value.symbols.size
    )
    connectors.push(exchangeInfo.connector)

    const validSet = exchangeInfo.value?.symbols ?? new Set<string>()
    const validSymbols = requested.filter((symbol) => validSet.has(symbol)).slice(0, MAX_FUTURES_SYMBOLS)
    const invalidSymbols = requested.filter((symbol) => !validSet.has(symbol))

    const started = Date.now()
    const symbols = await mapLimit(validSymbols, CONCURRENCY, async (symbol) => {
      const mapped = mapFuturesSymbol(symbol)
      if (!mapped) return null

      let openInterest: OpenInterestPayload
      let premium: PremiumIndexPayload

      try {
        openInterest = await fetchJson<OpenInterestPayload>(`${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`)
      } catch (error) {
        recordSymbolFailure({ symbol, stage: "openInterest", message: errorMessage(error) })
        return null
      }

      try {
        premium = await fetchJson<PremiumIndexPayload>(`${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`)
      } catch (error) {
        recordSymbolFailure({ symbol, stage: "premiumIndex", message: errorMessage(error) })
        return null
      }

      try {
        const markPrice = num(premium.markPrice || premium.indexPrice)
        const openInterestValue = num(openInterest.openInterest)
        const oiNotional = openInterestValue * markPrice
        if (!markPrice || !openInterestValue || !oiNotional) {
          recordSymbolFailure({ symbol, stage: "combined", message: "Missing mark price, open interest, or OI notional." })
          return null
        }
        return {
          symbol,
          baseAsset: mapped.baseAsset,
          sector: mapped.sector,
          openInterest: openInterestValue,
          markPrice,
          oiNotional,
          fundingRate: num(premium.lastFundingRate),
          nextFundingTime: premium.nextFundingTime,
        } satisfies FuturesSymbolSnapshot
      } catch (error) {
        recordSymbolFailure({ symbol, stage: "combined", message: errorMessage(error) })
        return null
      }
    })

    connectors.push({
      name: "binance-futures-open-interest",
      status: symbols.length ? (symbols.length < validSymbols.length * 0.65 ? "partial" : "connected") : "error",
      latencyMs: Date.now() - started,
      records: symbols.length,
      message: symbols.length ? undefined : "No futures OI records returned.",
    })
    connectors.push({
      name: "binance-futures-funding",
      status: symbols.length ? "connected" : "error",
      latencyMs: Date.now() - started,
      records: symbols.filter((item) => Number.isFinite(item.fundingRate)).length,
    })

    const payload = buildFuturesIntelligence({
      symbols,
      requestedSymbols: requested.length,
      validSymbols: validSymbols.length,
      invalidSymbols,
      connectors,
      maxSymbols: MAX_FUTURES_SYMBOLS,
      concurrency: CONCURRENCY,
    })

    return NextResponse.json({
      ...payload,
      ...(failedSymbolFetches.length ? { diagnostics: { failedSymbolFetches } } : {}),
    }, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    const fallback = buildFuturesIntelligence({
      symbols: [],
      requestedSymbols: 0,
      validSymbols: 0,
      invalidSymbols: [],
      connectors: [{
        name: "binance-futures-open-interest",
        status: "error",
        latencyMs: 0,
        records: 0,
        message: error instanceof Error ? error.message : String(error),
      }],
      maxSymbols: MAX_FUTURES_SYMBOLS,
      concurrency: CONCURRENCY,
    })
    return NextResponse.json({
      ...fallback,
      ok: false,
      notes: [...(fallback.notes ?? []), error instanceof Error ? error.message : "Unknown futures route error"],
    }, { status: 500 })
  }
}
