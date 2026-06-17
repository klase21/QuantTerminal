import { NextResponse } from "next/server"

export const runtime = "nodejs"

const BINANCE_FAPI = "https://fapi.binance.com"

type BinanceFundingRate = {
  fundingRate?: string
  fundingTime?: number
}

type BinanceOpenInterestHist = {
  sumOpenInterest?: string
  sumOpenInterestValue?: string
  timestamp?: number
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
}

function windowBounds(date: string, hour: number) {
  const startMs = Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`)
  return { startMs, endMs: startMs + 60 * 60 * 1000 }
}

function num(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal })
  if (!response.ok) throw new Error(`Binance request failed with ${response.status}`)
  return response.json() as Promise<T>
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase()
  const date = searchParams.get("date") ?? ""
  const hour = Number(searchParams.get("hour") ?? "0")

  if (!/^[A-Z0-9]{5,30}$/.test(symbol)) {
    return NextResponse.json({ ok: false, source: "binance-historical", reason: "Valid symbol is required." }, { status: 400 })
  }
  if (!validDate(date)) {
    return NextResponse.json({ ok: false, source: "binance-historical", reason: "Date must use YYYY-MM-DD." }, { status: 400 })
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return NextResponse.json({ ok: false, source: "binance-historical", reason: "Hour must be an integer from 0 to 23 UTC." }, { status: 400 })
  }

  const { startMs, endMs } = windowBounds(date, hour)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)

  try {
    const fundingUrl = new URL(`${BINANCE_FAPI}/fapi/v1/fundingRate`)
    fundingUrl.searchParams.set("symbol", symbol)
    fundingUrl.searchParams.set("startTime", String(startMs))
    fundingUrl.searchParams.set("endTime", String(endMs))
    fundingUrl.searchParams.set("limit", "100")

    const oiUrl = new URL(`${BINANCE_FAPI}/futures/data/openInterestHist`)
    oiUrl.searchParams.set("symbol", symbol)
    oiUrl.searchParams.set("period", "5m")
    oiUrl.searchParams.set("startTime", String(startMs))
    oiUrl.searchParams.set("endTime", String(endMs))
    oiUrl.searchParams.set("limit", "500")

    const [fundingResult, openInterestResult] = await Promise.allSettled([
      fetchJson<BinanceFundingRate[]>(fundingUrl.toString(), controller.signal),
      fetchJson<BinanceOpenInterestHist[]>(oiUrl.toString(), controller.signal),
    ])

    const fundingRows = fundingResult.status === "fulfilled" && Array.isArray(fundingResult.value)
      ? fundingResult.value
      : []
    const openInterestRows = openInterestResult.status === "fulfilled" && Array.isArray(openInterestResult.value)
      ? openInterestResult.value
      : []
    const fundingByTime = new Map<number, number | null>()
    for (const row of fundingRows) {
      if (typeof row.fundingTime === "number") fundingByTime.set(row.fundingTime, num(row.fundingRate))
    }
    const timestamps = new Set<number>([
      ...openInterestRows.map((row) => row.timestamp).filter((value): value is number => typeof value === "number"),
      ...fundingByTime.keys(),
    ])

    const funding = [...timestamps].sort((left, right) => left - right).map((timestamp) => {
      const oi = openInterestRows.find((row) => row.timestamp === timestamp)
      return {
        timestamp: new Date(timestamp).toISOString(),
        fundingRate: fundingByTime.get(timestamp) ?? null,
        openInterest: num(oi?.sumOpenInterest),
        openInterestValue: num(oi?.sumOpenInterestValue),
        source: "binance-historical",
      }
    }).filter((row) => row.fundingRate !== null || row.openInterest !== null || row.openInterestValue !== null)

    return NextResponse.json({
      ok: funding.length > 0,
      source: "binance-historical",
      symbol,
      window: {
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
      },
      funding,
      reason: funding.length ? null : "Binance historical funding/open interest returned no rows for selected window.",
      diagnostics: {
        fundingRows: fundingRows.length,
        openInterestRows: openInterestRows.length,
        fundingError: fundingResult.status === "rejected" ? String(fundingResult.reason instanceof Error ? fundingResult.reason.message : fundingResult.reason) : null,
        openInterestError: openInterestResult.status === "rejected" ? String(openInterestResult.reason instanceof Error ? openInterestResult.reason.message : openInterestResult.reason) : null,
      },
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: "binance-historical",
      symbol,
      funding: [],
      reason: error instanceof Error ? error.message : "Binance historical positioning unavailable.",
    })
  } finally {
    clearTimeout(timeout)
  }
}
