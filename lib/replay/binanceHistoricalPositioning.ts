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

export interface BinanceHistoricalPositioningPoint {
  timestamp: string
  fundingRate: number | null
  openInterest: number | null
  openInterestValue: number | null
  source: "binance-historical"
}

export interface BinanceHistoricalPositioningResult {
  ok: boolean
  source: "binance-historical"
  symbol: string
  window: {
    start: string
    end: string
  }
  funding: BinanceHistoricalPositioningPoint[]
  reason: string | null
  diagnostics: {
    fundingRows: number
    openInterestRows: number
    fundingError: string | null
    openInterestError: string | null
  }
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

function rejectedReason(result: PromiseSettledResult<unknown>) {
  if (result.status !== "rejected") return null
  return result.reason instanceof Error ? result.reason.message : String(result.reason)
}

export async function loadBinanceHistoricalPositioning(input: {
  symbol: string
  date: string
  hour: number
  timeoutMs?: number
  signal?: AbortSignal
}): Promise<BinanceHistoricalPositioningResult> {
  const symbol = input.symbol.trim().toUpperCase()
  const startMs = Date.parse(
    `${input.date}T${String(input.hour).padStart(2, "0")}:00:00.000Z`,
  )
  const endMs = startMs + 60 * 60 * 1000
  const controller = new AbortController()
  const abort = () => controller.abort()
  input.signal?.addEventListener("abort", abort, { once: true })
  const timeout = setTimeout(abort, input.timeoutMs ?? 4_500)

  const emptyResult = (
    reason: string,
    diagnostics: BinanceHistoricalPositioningResult["diagnostics"],
  ): BinanceHistoricalPositioningResult => ({
    ok: false,
    source: "binance-historical",
    symbol,
    window: {
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
    },
    funding: [],
    reason,
    diagnostics,
  })

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
    const fundingRows = fundingResult.status === "fulfilled"
      && Array.isArray(fundingResult.value)
      ? fundingResult.value
      : []
    const openInterestRows = openInterestResult.status === "fulfilled"
      && Array.isArray(openInterestResult.value)
      ? openInterestResult.value
      : []
    const fundingByTime = new Map<number, number | null>()
    for (const row of fundingRows) {
      if (typeof row.fundingTime === "number") {
        fundingByTime.set(row.fundingTime, num(row.fundingRate))
      }
    }
    const openInterestByTime = new Map(
      openInterestRows
        .filter((row): row is BinanceOpenInterestHist & { timestamp: number } => (
          typeof row.timestamp === "number"
        ))
        .map((row) => [row.timestamp, row]),
    )
    const timestamps = new Set([
      ...fundingByTime.keys(),
      ...openInterestByTime.keys(),
    ])
    const funding = [...timestamps]
      .sort((left, right) => left - right)
      .map((timestamp) => {
        const oi = openInterestByTime.get(timestamp)
        return {
          timestamp: new Date(timestamp).toISOString(),
          fundingRate: fundingByTime.get(timestamp) ?? null,
          openInterest: num(oi?.sumOpenInterest),
          openInterestValue: num(oi?.sumOpenInterestValue),
          source: "binance-historical" as const,
        }
      })
      .filter((row) => (
        row.fundingRate !== null
        || row.openInterest !== null
        || row.openInterestValue !== null
      ))
    const diagnostics = {
      fundingRows: fundingRows.length,
      openInterestRows: openInterestRows.length,
      fundingError: rejectedReason(fundingResult),
      openInterestError: rejectedReason(openInterestResult),
    }
    return {
      ok: funding.length > 0,
      source: "binance-historical",
      symbol,
      window: {
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
      },
      funding,
      reason: funding.length
        ? null
        : "Binance historical funding/open interest returned no rows for selected window.",
      diagnostics,
    }
  } catch (error) {
    return emptyResult(
      error instanceof Error
        ? error.message
        : "Binance historical positioning unavailable.",
      {
        fundingRows: 0,
        openInterestRows: 0,
        fundingError: null,
        openInterestError: null,
      },
    )
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener("abort", abort)
  }
}
