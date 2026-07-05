const BINANCE_FAPI = "https://fapi.binance.com"
const REQUEST_TIMEOUT_MS = 5_500

interface BinanceOpenInterestPayload {
  readonly symbol?: string
  readonly openInterest?: string
  readonly time?: number
}

interface BinancePremiumIndexPayload {
  readonly symbol?: string
  readonly markPrice?: string
  readonly indexPrice?: string
  readonly lastFundingRate?: string
  readonly time?: number
}

export interface BinanceFuturesObservation {
  readonly sourceId: "binance-live"
  readonly exchange: "Binance Futures"
  readonly symbol: string
  readonly observedAt: string
  readonly price: number
  readonly fundingRate: number | null
  readonly openInterest: number | null
  readonly sourceTimestamps: {
    readonly priceObservedAt: string
    readonly openInterestAt: string | null
  }
}

export type BinanceFuturesObservationResult =
  | { readonly status: "SUCCESS"; readonly observation: BinanceFuturesObservation }
  | { readonly status: "UNAVAILABLE"; readonly reason: string }

function normalizeSymbol(value: string): string | null {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!normalized) return null
  return normalized.endsWith("USDT") ? normalized : `${normalized}USDT`
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function sourceTimestamp(value: unknown): string | null {
  const timestamp = numberValue(value)
  return timestamp !== null && timestamp > 0
    ? new Date(timestamp).toISOString()
    : null
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
    headers: { accept: "application/json" },
  })
  if (!response.ok) throw new Error(`Binance returned HTTP ${response.status}.`)
  return await response.json() as T
}

export async function observeBinanceFutures(
  inputSymbol: string,
): Promise<BinanceFuturesObservationResult> {
  const symbol = normalizeSymbol(inputSymbol)
  if (!symbol) {
    return Object.freeze({ status: "UNAVAILABLE", reason: "Signal symbol is unavailable." })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const [premium, openInterest] = await Promise.all([
      fetchJson<BinancePremiumIndexPayload>(
        `${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
        controller.signal,
      ),
      fetchJson<BinanceOpenInterestPayload>(
        `${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`,
        controller.signal,
      ),
    ])
    const price = numberValue(premium.markPrice)
    const observedAt = sourceTimestamp(premium.time)
    if (price === null || price <= 0 || observedAt === null) {
      return Object.freeze({
        status: "UNAVAILABLE",
        reason: "Binance Futures returned no source-timestamped price.",
      })
    }
    const fundingRate = numberValue(premium.lastFundingRate)
    const openInterestValue = numberValue(openInterest.openInterest)
    return Object.freeze({
      status: "SUCCESS",
      observation: Object.freeze({
        sourceId: "binance-live",
        exchange: "Binance Futures",
        symbol,
        observedAt,
        price,
        fundingRate,
        openInterest: openInterestValue !== null && openInterestValue >= 0
          ? openInterestValue
          : null,
        sourceTimestamps: Object.freeze({
          priceObservedAt: observedAt,
          openInterestAt: sourceTimestamp(openInterest.time),
        }),
      }),
    })
  } catch {
    return Object.freeze({
      status: "UNAVAILABLE",
      reason: "Binance Futures observation source is unavailable.",
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function observeBinanceFuturesAt(
  inputSymbol: string,
  requestedObservedAt: string,
): Promise<BinanceFuturesObservationResult> {
  const symbol = normalizeSymbol(inputSymbol)
  const targetMs = Date.parse(requestedObservedAt)
  if (!symbol || !Number.isFinite(targetMs) || targetMs > Date.now()) {
    return Object.freeze({
      status: "UNAVAILABLE",
      reason: "Requested Binance Futures observation boundary is unavailable.",
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const url = new URL(`${BINANCE_FAPI}/fapi/v1/klines`)
    url.searchParams.set("symbol", symbol)
    url.searchParams.set("interval", "1m")
    url.searchParams.set("startTime", String(targetMs - 60_000))
    url.searchParams.set("endTime", String(targetMs))
    url.searchParams.set("limit", "2")
    const rows = await fetchJson<unknown[]>(url.toString(), controller.signal)
    const row = Array.isArray(rows)
      ? rows.find((candidate) => Array.isArray(candidate) && numberValue(candidate[6]) === targetMs)
      : undefined
    const price = Array.isArray(row) ? numberValue(row[4]) : null
    if (price === null || price <= 0) {
      return Object.freeze({
        status: "UNAVAILABLE",
        reason: "Binance Futures has no exact source price at the evaluation-window end.",
      })
    }
    const observedAt = new Date(targetMs).toISOString()
    return Object.freeze({
      status: "SUCCESS",
      observation: Object.freeze({
        sourceId: "binance-live",
        exchange: "Binance Futures",
        symbol,
        observedAt,
        price,
        fundingRate: null,
        openInterest: null,
        sourceTimestamps: Object.freeze({
          priceObservedAt: observedAt,
          openInterestAt: null,
        }),
      }),
    })
  } catch {
    return Object.freeze({
      status: "UNAVAILABLE",
      reason: "Binance Futures window-end observation source is unavailable.",
    })
  } finally {
    clearTimeout(timeout)
  }
}
