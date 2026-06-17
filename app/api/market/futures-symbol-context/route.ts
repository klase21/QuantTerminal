import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BINANCE_FAPI = "https://fapi.binance.com"
const REQUEST_TIMEOUT_MS = 5500

type OpenInterestPayload = {
  symbol?: string
  openInterest?: string
  time?: number
}

type PremiumIndexPayload = {
  symbol?: string
  markPrice?: string
  indexPrice?: string
  lastFundingRate?: string
  nextFundingTime?: number
  time?: number
}

function normalizeSymbol(value: string | null) {
  const cleaned = value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!cleaned) return null
  return cleaned.endsWith("USDT") ? cleaned : `${cleaned}USDT`
}

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function safeMessage(error: unknown) {
  if (!(error instanceof Error)) return "Binance Futures symbol context unavailable."
  if (/\b(403|451)\b/i.test(error.message)) return "Exchange response blocked."
  if (/abort|timeout/i.test(error.message)) return "Exchange request timed out."
  if (/\b404\b/i.test(error.message)) return "Selected symbol was not found on Binance Futures."
  return error.message || "Binance Futures symbol context unavailable."
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
    headers: { accept: "application/json" },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return (await response.json()) as T
}

export async function GET(req: Request) {
  const symbol = normalizeSymbol(new URL(req.url).searchParams.get("symbol"))
  if (!symbol) {
    return NextResponse.json({ ok: false, symbol: null, reason: "Missing or invalid symbol." }, { status: 200 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const [openInterest, premium] = await Promise.all([
      fetchJson<OpenInterestPayload>(`${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`, controller.signal),
      fetchJson<PremiumIndexPayload>(`${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`, controller.signal),
    ])

    const openInterestValue = num(openInterest.openInterest)
    const markPrice = num(premium.markPrice) ?? num(premium.indexPrice)
    const fundingRate = num(premium.lastFundingRate)

    if (openInterestValue === null && fundingRate === null && markPrice === null) {
      return NextResponse.json({
        ok: false,
        symbol,
        reason: "Binance Futures returned no funding or open interest values for selected symbol.",
        source: "binance-direct",
      }, { status: 200 })
    }

    return NextResponse.json({
      ok: true,
      symbol,
      openInterest: openInterestValue,
      openInterestTime: openInterest.time ?? premium.time ?? null,
      fundingRate,
      markPrice,
      indexPrice: num(premium.indexPrice),
      oiNotional: openInterestValue !== null && markPrice !== null ? openInterestValue * markPrice : null,
      nextFundingTime: premium.nextFundingTime ?? null,
      source: "binance-direct",
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      symbol,
      reason: safeMessage(error),
      source: "binance-direct",
    }, { status: 200 })
  } finally {
    clearTimeout(timeout)
  }
}
