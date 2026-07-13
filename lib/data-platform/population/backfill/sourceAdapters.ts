import type { HistoricalSourcePartition, SourceAvailability } from "./contracts"

const BINANCE_VISION = "https://data.binance.vision/data/futures/um"
export function createBinanceVisionOhlcvPartition(input: { readonly symbol: string; readonly resolution: string; readonly day: string }): HistoricalSourcePartition {
  const symbol = input.symbol.trim().toUpperCase()
  if (!/^[A-Z0-9]{5,30}$/.test(symbol) || !/^\d+[mhdwM]$/.test(input.resolution) || !/^\d{4}-\d{2}-\d{2}$/.test(input.day)) throw new Error("SOURCE_PARTITION_INVALID")
  const start = `${input.day}T00:00:00.000Z`; const end = new Date(Date.parse(start) + 86_400_000).toISOString()
  return Object.freeze({ datasetId: "ohlcv", providerId: "binance-public-archive", providerSymbol: symbol, venue: "BINANCE", market: "USD_M_FUTURES", resolution: input.resolution, windowStart: start, windowEnd: end, sourceUrl: `${BINANCE_VISION}/daily/klines/${symbol}/${input.resolution}/${symbol}-${input.resolution}-${input.day}.zip`, mediaType: "application/zip", compression: "ZIP" })
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
