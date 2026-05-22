import { NextResponse } from "next/server"

import { SECTOR_REGISTRY } from "@/core/registry/sectorRegistry"
import { buildRealMarketRotation, type BinanceTicker24h, type UpbitTicker } from "@/core/market/realMarketRotation"
import type { ConnectorQualityStatus } from "@/core/marketDataTypes"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr"
const UPBIT_MARKETS_URL = "https://api.upbit.com/v1/market/all?isDetails=false"
const DATALAB_OVERVIEW_URL = "https://datalab-api.upbit.com/api/v1/indicator/overview"

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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    // Binance 24hr ticker can exceed Next.js data cache item limits (>2MB).
    // Keep this route live/dynamic and never write upstream payloads to the Next data cache.
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "QuantTerminal/1.0",
    },
  })

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`)
  }

  return response.json() as Promise<T>
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

function buildUpbitTickerUrl(markets: string[]) {
  const unique = [...new Set(markets)].slice(0, 120)
  return `https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(unique.join(","))}`
}

export async function GET() {
  const notes: string[] = []

  try {
    const [binanceResult, upbitMarketsResult, dataLabResult] = await Promise.all([
      timedFetchJson<BinanceTicker24h[]>("binance", BINANCE_TICKER_URL),
      timedFetchJson<Array<{ market: string }>>("upbit-markets", UPBIT_MARKETS_URL),
      timedFetchJson<unknown>("datalab", DATALAB_OVERVIEW_URL),
    ])

    const connectorQuality: ConnectorQualityStatus[] = [binanceResult.quality, upbitMarketsResult.quality, dataLabResult.quality]

    const binance = binanceResult.data ?? []
    if (binanceResult.quality.status === "error") notes.push(`Binance ticker failed: ${binanceResult.quality.message}`)

    const registrySymbols = new Set(SECTOR_REGISTRY.flatMap((sector) => sector.symbols))
    const krwMarkets = upbitMarketsResult.data
      ? upbitMarketsResult.data
          .map((item) => item.market)
          .filter((market) => market.startsWith("KRW-") && registrySymbols.has(market.replace("KRW-", "")))
      : []

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

    return NextResponse.json({
      ...result,
      mode: result.ok && notes.length ? "partial" : result.mode,
      notes: [...result.notes, ...notes],
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "binance-upbit-real-market",
        updatedAt: new Date().toISOString(),
        mode: "error",
        sectors: [],
        assets: [],
        endpoints: {
          binanceTicker24h: BINANCE_TICKER_URL,
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
      },
      { status: 500 }
    )
  }
}
