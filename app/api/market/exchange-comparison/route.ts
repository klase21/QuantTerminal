import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BINANCE_FAPI = "https://fapi.binance.com"
const BYBIT_API = "https://api.bybit.com/v5/market/tickers"
const REQUEST_TIMEOUT_MS = 5500

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
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
        "user-agent": "QuantTerminal/1.0 Markets",
      },
    })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return await response.json() as T
  } finally {
    timeout.cancel()
  }
}

async function getBinance(symbol: string) {
  try {
    const [openInterest, premium] = await Promise.all([
      fetchJson<{ openInterest?: string }>(`${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`),
      fetchJson<{ markPrice?: string; indexPrice?: string; lastFundingRate?: string }>(`${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`),
    ])
    const markPrice = num(premium.markPrice || premium.indexPrice)
    const openInterestValue = num(openInterest.openInterest)
    const fundingRate = num(premium.lastFundingRate)
    if (markPrice === null || openInterestValue === null || fundingRate === null) {
      return { ok: false, source: "binance-futures", reason: "Binance response missing funding, mark price, or open interest." }
    }
    return {
      ok: true,
      source: "binance-futures",
      fundingRate,
      openInterest: openInterestValue,
      oiNotional: openInterestValue * markPrice,
    }
  } catch (error) {
    return {
      ok: false,
      source: "binance-futures",
      reason: error instanceof Error ? error.message : "Binance futures request failed.",
    }
  }
}

async function getBybit(symbol: string) {
  try {
    const payload = await fetchJson<{
      retCode?: number
      retMsg?: string
      result?: {
        list?: Array<{
          symbol?: string
          fundingRate?: string
          openInterest?: string
          lastPrice?: string
        }>
      }
    }>(`${BYBIT_API}?category=linear&symbol=${encodeURIComponent(symbol)}`)
    const row = payload.result?.list?.find((item) => item.symbol === symbol) ?? payload.result?.list?.[0]
    if (!row || payload.retCode !== 0) {
      return { ok: false, source: "bybit-linear", reason: payload.retMsg || "Bybit returned no linear ticker row." }
    }
    const fundingRate = num(row.fundingRate)
    const openInterest = num(row.openInterest)
    const lastPrice = num(row.lastPrice)
    if (fundingRate === null || openInterest === null || lastPrice === null) {
      return { ok: false, source: "bybit-linear", reason: "Bybit response missing funding, price, or open interest." }
    }
    return {
      ok: true,
      source: "bybit-linear",
      fundingRate,
      openInterest,
      oiNotional: openInterest * lastPrice,
    }
  } catch (error) {
    return {
      ok: false,
      source: "bybit-linear",
      reason: error instanceof Error ? error.message : "Bybit public ticker request failed.",
    }
  }
}

function relationship(left?: number | null, right?: number | null) {
  if (left === null || left === undefined || right === null || right === undefined) return "Unavailable"
  if (Math.sign(left) !== Math.sign(right)) return "Divergent"
  const denominator = Math.max(Math.abs(left), Math.abs(right), 1)
  return Math.abs(left - right) / denominator > 0.35 ? "Divergent" : "Aligned"
}

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.toUpperCase() || "BTCUSDT"
  const [binance, bybit] = await Promise.all([
    getBinance(symbol),
    getBybit(symbol),
  ])

  return NextResponse.json({
    ok: Boolean(binance.ok || bybit.ok),
    symbol,
    updatedAt: new Date().toISOString(),
    binance,
    bybit,
    fundingRelationship: relationship(binance.ok ? binance.fundingRate : null, bybit.ok ? bybit.fundingRate : null),
    openInterestRelationship: relationship(binance.ok ? binance.oiNotional : null, bybit.ok ? bybit.oiNotional : null),
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
