import type { HistoricalSourcePartition, SourceAvailability } from "./contracts"

const BINANCE_VISION = "https://data.binance.vision/data/futures/um"
const BINANCE_FUNDING_REST = "https://fapi.binance.com/fapi/v1/fundingRate"
export function createBinanceVisionOhlcvPartition(input: { readonly symbol: string; readonly resolution: string; readonly day: string }): HistoricalSourcePartition {
  const symbol = input.symbol.trim().toUpperCase()
  if (!/^[A-Z0-9]{5,30}$/.test(symbol) || !/^\d+[mhdwM]$/.test(input.resolution) || !/^\d{4}-\d{2}-\d{2}$/.test(input.day)) throw new Error("SOURCE_PARTITION_INVALID")
  const start = `${input.day}T00:00:00.000Z`; const end = new Date(Date.parse(start) + 86_400_000).toISOString()
  return Object.freeze({ datasetId: "ohlcv", providerId: "binance-public-archive", providerSymbol: symbol, venue: "BINANCE", market: "USD_M_FUTURES", resolution: input.resolution, windowStart: start, windowEnd: end, sourceUrl: `${BINANCE_VISION}/daily/klines/${symbol}/${input.resolution}/${symbol}-${input.resolution}-${input.day}.zip`, mediaType: "application/zip", compression: "ZIP" })
}

export function createBinanceVisionFundingPartition(input: { readonly symbol: string; readonly month: string }): HistoricalSourcePartition {
  const symbol = input.symbol.trim().toUpperCase()
  if (!/^[A-Z0-9]{5,30}$/.test(symbol) || !/^\d{4}-\d{2}$/.test(input.month)) throw new Error("FUNDING_SOURCE_PARTITION_INVALID")
  const start = `${input.month}-01T00:00:00.000Z`
  const end = new Date(Date.UTC(Number(input.month.slice(0, 4)), Number(input.month.slice(5, 7)), 1)).toISOString()
  return Object.freeze({ datasetId: "funding", providerId: "binance-vision", providerSymbol: symbol, venue: "BINANCE", market: "USD_M_FUTURES", resolution: "EVENT_8H", windowStart: start, windowEnd: end, sourceUrl: `${BINANCE_VISION}/monthly/fundingRate/${symbol}/${symbol}-fundingRate-${input.month}.zip`, mediaType: "application/zip", compression: "ZIP" })
}

export function createBinanceVisionOpenInterestPartition(input: { readonly symbol: string; readonly day: string }): HistoricalSourcePartition {
  const symbol = input.symbol.trim().toUpperCase()
  if (!/^[A-Z0-9]{5,30}$/.test(symbol) || !/^\d{4}-\d{2}-\d{2}$/.test(input.day)) throw new Error("OPEN_INTEREST_SOURCE_PARTITION_INVALID")
  const start = `${input.day}T00:00:00.000Z`
  const end = new Date(Date.parse(start) + 86_400_000).toISOString()
  return Object.freeze({ datasetId: "open-interest", providerId: "binance-vision", providerSymbol: symbol, venue: "BINANCE", market: "USD_M_FUTURES", resolution: "5m", windowStart: start, windowEnd: end, sourceUrl: `${BINANCE_VISION}/daily/metrics/${symbol}/${symbol}-metrics-${input.day}.zip`, mediaType: "application/zip", compression: "ZIP" })
}

export function createBinanceOfficialFundingTailPartition(input: { readonly symbol: string; readonly windowStart: string; readonly windowEnd: string }): HistoricalSourcePartition {
  const symbol = input.symbol.trim().toUpperCase()
  const start = Date.parse(input.windowStart)
  const end = Date.parse(input.windowEnd)
  if (!/^[A-Z0-9]{5,30}$/.test(symbol) || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error("FUNDING_REST_PARTITION_INVALID")
  const sourceUrl = new URL(BINANCE_FUNDING_REST)
  sourceUrl.searchParams.set("symbol", symbol)
  sourceUrl.searchParams.set("startTime", String(start))
  sourceUrl.searchParams.set("endTime", String(end - 1))
  sourceUrl.searchParams.set("limit", "1000")
  return Object.freeze({ datasetId: "funding", providerId: "binance-official-rest-funding-rate", providerSymbol: symbol, venue: "BINANCE", market: "USD_M_FUTURES", resolution: "EVENT_8H", windowStart: new Date(start).toISOString(), windowEnd: new Date(end).toISOString(), sourceUrl: sourceUrl.toString(), mediaType: "application/json", compression: "NONE" })
}

export async function inspectSourceAvailability(partition: HistoricalSourcePartition, fetchImpl: typeof fetch = fetch): Promise<SourceAvailability> {
  try {
    const response = await fetchImpl(partition.sourceUrl, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(15_000) })
    if (response.status === 404) return { status: "SOURCE_NOT_AVAILABLE_FOR_PERIOD" }
    if (response.status === 429 || response.status >= 500) return { status: "RETRYABLE_FAILURE", reason: `HTTP_${response.status}` }
    if (!response.ok) return { status: "PERMANENT_FAILURE", reason: `HTTP_${response.status}` }
    const length = response.headers.get("content-length")
    return { status: "AVAILABLE", contentLength: length && /^\d+$/.test(length) ? Number(length) : null, etag: response.headers.get("etag"), lastModified: response.headers.get("last-modified") }
  } catch (cause) { return { status: "RETRYABLE_FAILURE", reason: cause instanceof Error ? cause.name : "NETWORK_FAILURE" } }
}

export async function openSourceStream(partition: HistoricalSourcePartition, fetchImpl: typeof fetch = fetch): Promise<{ readonly contentLength: number | null; readonly content: AsyncIterable<Uint8Array> }> {
  const response = await fetchImpl(partition.sourceUrl, { cache: "no-store", signal: AbortSignal.timeout(30_000) })
  if (!response.ok || !response.body) throw new Error(response.status === 404 ? "SOURCE_NOT_AVAILABLE_FOR_PERIOD" : `SOURCE_HTTP_${response.status}`)
  const length = response.headers.get("content-length")
  const body = response.body
  const content: AsyncIterable<Uint8Array> = { async *[Symbol.asyncIterator]() { const reader = body.getReader(); try { for (;;) { const value = await reader.read(); if (value.done) return; yield value.value } } finally { reader.releaseLock() } } }
  return Object.freeze({ contentLength: length && /^\d+$/.test(length) ? Number(length) : null, content })
}
