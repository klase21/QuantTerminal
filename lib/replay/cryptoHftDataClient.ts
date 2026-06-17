import { decompress } from "fzstd"
import { parquetReadObjects } from "hyparquet"

export type CryptoHftDataset = "trades" | "orderbook" | "liquidations" | "open_interest" | "mark_price" | "ticker"

export type ReplayTrade = {
  timestamp: string
  price: number
  size: number
  side: "buy" | "sell" | "unknown"
  exchange: string
  symbol: string
}

export type ReplayBookSnapshot = {
  timestamp: string
  bids: Array<[number, number]>
  asks: Array<[number, number]>
  exchange: string
  symbol: string
}

export type ReplayLiquidation = {
  timestamp: string
  side: "long" | "short" | "unknown"
  price: number | null
  size: number | null
  notional: number | null
  exchange: string
  symbol: string
}

export type ReplayFundingPoint = {
  timestamp: string
  fundingRate: number | null
  openInterest: number | null
  openInterestValue: number | null
  exchange: string
  symbol: string
}

export type ReplayCandle = {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number | null
  exchange: string
  symbol: string
}

type DatasetDiagnostic = {
  dataset: CryptoHftDataset
  file: string
  bytes: number
  decompressedBytes: number | null
  contentType: string | null
  columns: string[]
  rowCountBeforeSlice: number
  rowCountReturned: number
  usableBidCount?: number
  usableAskCount?: number
  firstRawRow?: Record<string, unknown>
  rawSample?: Record<string, unknown>[]
  rejectionReason?: string
  decodeStatus: "decoded" | "downloaded_decode_failed" | "download_failed"
  error?: string
}

export type CryptoHftReplayResponse = {
  ok: boolean
  source: "cryptohftdata"
  exchange: string
  symbol: string
  window: {
    start: string
    end: string
  }
  trades: ReplayTrade[]
  book: ReplayBookSnapshot[]
  liquidations: ReplayLiquidation[]
  funding: ReplayFundingPoint[]
  candles: ReplayCandle[]
  diagnostics: {
    downloaded: DatasetDiagnostic[]
    unavailable: Array<{ dataset: CryptoHftDataset | "provider"; reason: string }>
    errors: Array<{ dataset: CryptoHftDataset | "provider"; message: string }>
  }
}

export type CryptoHftReplayRequest = {
  exchange: string
  symbol: string
  date: string
  hour: number
  datasets?: CryptoHftDataset[]
}

const COVERAGE_START = "2025-07-01"
const DOWNLOAD_BASE_URL = "https://api.cryptohftdata.com/download"
const DATASETS: CryptoHftDataset[] = ["trades", "orderbook", "liquidations", "open_interest", "mark_price", "ticker"]

export function cryptoHftCoverageStart() {
  return COVERAGE_START
}

export function isBeforeCryptoHftCoverage(date: string) {
  return date < COVERAGE_START
}

function createWindow(date: string, hour: number) {
  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

function replayFilePath(request: CryptoHftReplayRequest, dataset: CryptoHftDataset) {
  return `${request.exchange}/${request.date}/${String(request.hour).padStart(2, "0")}/${request.symbol}_${dataset}.parquet.zst`
}

function replayDownloadUrl(file: string, apiKey: string) {
  const url = new URL(DOWNLOAD_BASE_URL)
  url.searchParams.set("file", file)
  url.searchParams.set("api_key", apiKey)
  return url.toString()
}

function asRecord(row: unknown): Record<string, unknown> {
  return row && typeof row === "object" ? row as Record<string, unknown> : {}
}

function columnsFrom(rows: Record<string, unknown>[]) {
  const columns = new Set<string>()
  for (const row of rows.slice(0, 20)) Object.keys(row).forEach((key) => columns.add(key))
  return [...columns]
}

function pick(row: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null) return row[name]
  }
  const lowerMap = new Map(Object.keys(row).map((key) => [key.toLowerCase(), key]))
  for (const name of names) {
    const key = lowerMap.get(name.toLowerCase())
    if (key && row[key] !== undefined && row[key] !== null) return row[key]
  }
  return undefined
}

function numeric(value: unknown): number | null {
  if (typeof value === "bigint") {
    const converted = Number(value)
    return Number.isFinite(converted) ? converted : null
  }
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
  return Number.isFinite(numberValue) ? numberValue : null
}

function timestamp(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "bigint") return timestamp(Number(value))
  if (typeof value === "number" && Number.isFinite(value)) {
    const abs = Math.abs(value)
    if (abs > 1_000_000_000_000_000) return new Date(value / 1000).toISOString()
    if (abs > 1_000_000_000_000) return new Date(value).toISOString()
    return new Date(value * 1000).toISOString()
  }
  if (typeof value !== "string" || !value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function tradeSide(row: Record<string, unknown>): "buy" | "sell" | "unknown" {
  const side = String(pick(row, ["side", "aggressor_side", "taker_side", "direction"]) ?? "").toLowerCase()
  if (side.includes("buy") || side === "b") return "buy"
  if (side.includes("sell") || side === "s") return "sell"
  const buyerMaker = pick(row, ["buyer_maker", "isBuyerMaker", "is_buyer_maker"])
  if (typeof buyerMaker === "boolean") return buyerMaker ? "sell" : "buy"
  if (String(buyerMaker).toLowerCase() === "true") return "sell"
  if (String(buyerMaker).toLowerCase() === "false") return "buy"
  return "unknown"
}

function liquidationSide(row: Record<string, unknown>): "long" | "short" | "unknown" {
  const side = String(pick(row, ["side", "position_side", "direction"]) ?? "").toLowerCase()
  if (side.includes("long") || side.includes("buy")) return "long"
  if (side.includes("short") || side.includes("sell")) return "short"
  return "unknown"
}

function levels(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return []
  return value.map((level) => {
    if (Array.isArray(level)) {
      const price = numeric(level[0])
      const size = numeric(level[1])
      return price !== null && size !== null ? [price, size] as [number, number] : null
    }
    const record = asRecord(level)
    const price = numeric(pick(record, ["price", "px", "p"]))
    const size = numeric(pick(record, ["size", "qty", "quantity", "q"]))
    return price !== null && size !== null ? [price, size] as [number, number] : null
  }).filter((level): level is [number, number] => Boolean(level))
}

function parallelLevels(prices: unknown, sizes: unknown): Array<[number, number]> {
  if (!Array.isArray(prices) || !Array.isArray(sizes)) return []
  const length = Math.min(prices.length, sizes.length)
  const output: Array<[number, number]> = []
  for (let index = 0; index < length; index += 1) {
    const price = numeric(prices[index])
    const size = numeric(sizes[index])
    if (price !== null && size !== null && size > 0) output.push([price, size])
  }
  return output
}

function numberedSideLevels(row: Record<string, unknown>, side: "bid" | "ask"): Array<[number, number]> {
  const sidePattern = side === "bid" ? /\bbids?\b|^b(?:_|$)/i : /\basks?\b|^a(?:_|$)/i
  const pricePattern = /price|px|rate/i
  const sizePattern = /size|qty|quantity|amount|volume/i
  const prices = new Map<string, number>()
  const sizes = new Map<string, number>()

  for (const [key, value] of Object.entries(row)) {
    const normalized = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()
    if (!sidePattern.test(normalized)) continue
    const index = normalized.match(/\d+/)?.[0] ?? "0"
    const parsed = numeric(value)
    if (parsed === null) continue
    if (pricePattern.test(normalized)) prices.set(index, parsed)
    if (sizePattern.test(normalized)) sizes.set(index, parsed)
  }

  return [...prices.entries()]
    .map(([index, price]) => {
      const size = sizes.get(index)
      return size !== undefined && size > 0 ? [price, size] as [number, number] : null
    })
    .filter((level): level is [number, number] => Boolean(level))
}

function normalizeTrades(rows: Record<string, unknown>[], exchange: string, symbol: string): ReplayTrade[] {
  return rows.map((row) => {
    const time = timestamp(pick(row, ["timestamp", "time", "ts", "T", "event_time"]))
    const price = numeric(pick(row, ["price", "px", "p"]))
    const size = numeric(pick(row, ["size", "qty", "quantity", "q"]))
    if (!time || price === null || size === null) return null
    return { timestamp: time, price, size, side: tradeSide(row), exchange, symbol }
  }).filter((item): item is ReplayTrade => Boolean(item)).slice(-100)
}

function normalizeOrderbook(rows: Record<string, unknown>[], exchange: string, symbol: string): ReplayBookSnapshot[] {
  const snapshots = rows.map((row) => {
    const time = timestamp(pick(row, ["timestamp", "time", "ts", "T", "event_time"]))
    const bids = levels(pick(row, ["bids", "bid"]))
    const asks = levels(pick(row, ["asks", "ask"]))
    if (!time || (!bids.length && !asks.length)) return null
    return { timestamp: time, bids, asks, exchange, symbol }
  }).filter((item): item is ReplayBookSnapshot => Boolean(item))
  if (snapshots.length) return snapshots.slice(-1)

  const pairedSnapshots = rows.map((row) => {
    const time = timestamp(pick(row, ["timestamp", "time", "ts", "T", "event_time", "transaction_time", "received_time"]))
    const bidPrice = numeric(pick(row, ["bid_price", "bidPrice", "bid_px", "best_bid", "bestBid", "bp"]))
    const bidSize = numeric(pick(row, ["bid_size", "bidSize", "bid_qty", "bidQty", "bid_quantity", "bid_amount", "bidAmount", "bid_volume", "bq"]))
    const askPrice = numeric(pick(row, ["ask_price", "askPrice", "ask_px", "best_ask", "bestAsk", "ap"]))
    const askSize = numeric(pick(row, ["ask_size", "askSize", "ask_qty", "askQty", "ask_quantity", "ask_amount", "askAmount", "ask_volume", "aq"]))
    const bids = [
      ...(bidPrice !== null && bidSize !== null && bidSize > 0 ? [[bidPrice, bidSize] as [number, number]] : []),
      ...parallelLevels(pick(row, ["bid_prices", "bidPrices", "bids_price", "bid_px_array"]), pick(row, ["bid_sizes", "bidSizes", "bid_qtys", "bidQtys", "bid_quantities", "bid_amounts", "bidAmount"])),
      ...numberedSideLevels(row, "bid"),
    ]
    const asks = [
      ...(askPrice !== null && askSize !== null && askSize > 0 ? [[askPrice, askSize] as [number, number]] : []),
      ...parallelLevels(pick(row, ["ask_prices", "askPrices", "asks_price", "ask_px_array"]), pick(row, ["ask_sizes", "askSizes", "ask_qtys", "askQtys", "ask_quantities", "ask_amounts", "askAmount"])),
      ...numberedSideLevels(row, "ask"),
    ]
    if (!time || (!bids.length && !asks.length)) return null
    return {
      timestamp: time,
      bids: [...new Map(bids.map((level) => [level[0], level[1]])).entries()].sort((left, right) => right[0] - left[0]).slice(0, 20),
      asks: [...new Map(asks.map((level) => [level[0], level[1]])).entries()].sort((left, right) => left[0] - right[0]).slice(0, 20),
      exchange,
      symbol,
    }
  }).filter((item): item is ReplayBookSnapshot => Boolean(item))
  if (pairedSnapshots.length) return pairedSnapshots.slice(-1)

  const bids = new Map<number, number>()
  const asks = new Map<number, number>()
  let latestTimestamp: string | null = null
  for (const row of rows) {
    const time = timestamp(pick(row, ["timestamp", "time", "ts", "T", "event_time", "transaction_time", "received_time"]))
    if (time) latestTimestamp = time
    const price = numeric(pick(row, ["price", "px", "p", "price_level", "priceLevel", "level_price", "levelPrice"]))
    const size = numeric(pick(row, ["size", "qty", "quantity", "amount", "volume", "q"]))
    if (price === null || size === null) continue
    const side = String(pick(row, ["side"]) ?? "").toLowerCase()
    const bookSide = side.includes("bid") || side === "b" || side === "buy"
      ? "bid"
      : side.includes("ask") || side === "a" || side === "sell"
        ? "ask"
        : null
    if (!bookSide) continue
    const target = bookSide === "bid" ? bids : asks
    if (size <= 0) target.delete(price)
    else target.set(price, size)
  }

  const bidLevels = [...bids.entries()].sort((left, right) => right[0] - left[0]).slice(0, 20)
  const askLevels = [...asks.entries()].sort((left, right) => left[0] - right[0]).slice(0, 20)
  return latestTimestamp && (bidLevels.length || askLevels.length)
    ? [{ timestamp: latestTimestamp, bids: bidLevels, asks: askLevels, exchange, symbol }]
    : []
}

function normalizeLiquidations(rows: Record<string, unknown>[], exchange: string, symbol: string): ReplayLiquidation[] {
  return rows.map((row) => {
    const time = timestamp(pick(row, ["timestamp", "time", "ts", "T", "event_time"]))
    if (!time) return null
    const price = numeric(pick(row, ["price", "px", "p"]))
    const size = numeric(pick(row, ["size", "qty", "quantity", "q"]))
    const notional = numeric(pick(row, ["notional", "value", "usd_value"])) ?? (price !== null && size !== null ? price * size : null)
    return { timestamp: time, side: liquidationSide(row), price, size, notional, exchange, symbol }
  }).filter((item): item is ReplayLiquidation => Boolean(item)).slice(-100)
}

function normalizeOpenInterest(rows: Record<string, unknown>[], exchange: string, symbol: string): ReplayFundingPoint[] {
  return rows.map((row) => {
    const time = timestamp(pick(row, ["timestamp", "time", "ts", "T", "event_time"]))
    if (!time) return null
    return {
      timestamp: time,
      fundingRate: null,
      openInterest: numeric(pick(row, ["open_interest", "openInterest", "oi", "sum_open_interest"])),
      openInterestValue: numeric(pick(row, ["open_interest_value", "openInterestValue", "oi_value", "sum_open_interest_value"])),
      exchange,
      symbol,
    }
  }).filter((item): item is ReplayFundingPoint => Boolean(item)).slice(-200)
}

function normalizeMarkPrice(rows: Record<string, unknown>[], exchange: string, symbol: string): ReplayFundingPoint[] {
  return rows.map((row) => {
    const time = timestamp(pick(row, ["timestamp", "time", "ts", "T", "event_time"]))
    if (!time) return null
    return {
      timestamp: time,
      fundingRate: numeric(pick(row, ["funding_rate", "fundingRate", "last_funding_rate"])),
      openInterest: numeric(pick(row, ["open_interest", "openInterest", "oi"])),
      openInterestValue: numeric(pick(row, ["open_interest_value", "openInterestValue", "oi_value", "sum_open_interest_value"])),
      exchange,
      symbol,
    }
  }).filter((item): item is ReplayFundingPoint => Boolean(item)).slice(-200)
}

function normalizeTicker(rows: Record<string, unknown>[], exchange: string, symbol: string): ReplayCandle[] {
  return rows.map((row) => {
    const time = timestamp(pick(row, ["timestamp", "time", "ts", "T", "event_time", "open_time"]))
    const close = numeric(pick(row, ["close", "c", "last", "last_price", "mark_price", "markPrice", "price", "px"]))
    if (!time || close === null) return null
    const open = numeric(pick(row, ["open", "o", "open_price"])) ?? close
    const high = numeric(pick(row, ["high", "h", "high_price"])) ?? close
    const low = numeric(pick(row, ["low", "l", "low_price"])) ?? close
    return { timestamp: time, open, high, low, close, volume: numeric(pick(row, ["volume", "v", "base_volume"])), exchange, symbol }
  }).filter((item): item is ReplayCandle => Boolean(item)).slice(-200)
}

async function decodeParquetZst(buffer: ArrayBuffer) {
  const decompressed = decompress(new Uint8Array(buffer))
  const file = decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength)
  const rows = (await parquetReadObjects({ file })).map(asRecord)
  return { decompressedBytes: decompressed.byteLength, rows, columns: columnsFrom(rows) }
}

async function downloadDataset(dataset: CryptoHftDataset, request: CryptoHftReplayRequest, apiKey: string) {
  const file = replayFilePath(request, dataset)
  const response = await fetch(replayDownloadUrl(file, apiKey), {
    cache: "no-store",
    headers: { Accept: "application/octet-stream" },
  })

  if (!response.ok) {
    return {
      dataset,
      file,
      bytes: 0,
      contentType: response.headers.get("content-type"),
      error: `Provider returned HTTP ${response.status}`,
      buffer: null,
    }
  }

  const buffer = await response.arrayBuffer()
  return {
    dataset,
    file,
    bytes: buffer.byteLength,
    contentType: response.headers.get("content-type"),
    error: null,
    buffer,
  }
}

function returnedCount(dataset: CryptoHftDataset, response: CryptoHftReplayResponse) {
  if (dataset === "trades") return response.trades.length
  if (dataset === "orderbook") return response.book.length
  if (dataset === "liquidations") return response.liquidations.length
  if (dataset === "ticker") return response.candles.length
  return response.funding.length
}

function orderbookUsability(response: CryptoHftReplayResponse) {
  const latest = response.book.at(-1)
  return {
    usableBidCount: latest?.bids.length ?? 0,
    usableAskCount: latest?.asks.length ?? 0,
  }
}

function orderbookRawDiagnostics(rows: Record<string, unknown>[], response: CryptoHftReplayResponse) {
  if (!rows.length) {
    return {
      firstRawRow: undefined,
      rawSample: [],
      rejectionReason: "Orderbook parquet decoded zero rows.",
    }
  }
  const { usableBidCount, usableAskCount } = orderbookUsability(response)
  return {
    firstRawRow: rows[0],
    rawSample: rows.slice(0, 3),
    rejectionReason: usableBidCount || usableAskCount
      ? undefined
      : "Rows decoded, but no supported bid/ask level fields produced usable levels.",
  }
}

function applyRows(dataset: CryptoHftDataset, rows: Record<string, unknown>[], response: CryptoHftReplayResponse, request: CryptoHftReplayRequest) {
  if (dataset === "trades") response.trades = normalizeTrades(rows, request.exchange, request.symbol)
  if (dataset === "orderbook") response.book = normalizeOrderbook(rows, request.exchange, request.symbol)
  if (dataset === "liquidations") response.liquidations = normalizeLiquidations(rows, request.exchange, request.symbol)
  if (dataset === "open_interest") response.funding = [...response.funding, ...normalizeOpenInterest(rows, request.exchange, request.symbol)]
  if (dataset === "mark_price") response.funding = [...response.funding, ...normalizeMarkPrice(rows, request.exchange, request.symbol)]
  if (dataset === "ticker") response.candles = normalizeTicker(rows, request.exchange, request.symbol)
}

function diagnostic(input: Omit<DatasetDiagnostic, "decodeStatus"> & { decodeStatus?: DatasetDiagnostic["decodeStatus"] }): DatasetDiagnostic {
  return { ...input, decodeStatus: input.decodeStatus ?? "decoded" }
}

export async function loadCryptoHftDataReplay(request: CryptoHftReplayRequest): Promise<CryptoHftReplayResponse> {
  const window = createWindow(request.date, request.hour)
  const diagnostics: CryptoHftReplayResponse["diagnostics"] = { downloaded: [], unavailable: [], errors: [] }
  const response: CryptoHftReplayResponse = {
    ok: false,
    source: "cryptohftdata",
    exchange: request.exchange,
    symbol: request.symbol,
    window,
    trades: [],
    book: [],
    liquidations: [],
    funding: [],
    candles: [],
    diagnostics,
  }

  if (isBeforeCryptoHftCoverage(request.date)) {
    diagnostics.unavailable.push({ dataset: "provider", reason: `CryptoHFTData replay coverage starts from ${COVERAGE_START}.` })
    return response
  }

  const apiKey = process.env.CRYPTOHFTDATA_API_KEY
  if (!apiKey) {
    diagnostics.unavailable.push({ dataset: "provider", reason: "CryptoHFTData API key is not configured." })
    return response
  }

  const requestedDatasets = request.datasets?.length ? request.datasets : DATASETS
  const results = await Promise.allSettled(requestedDatasets.map((dataset) => downloadDataset(dataset, request, apiKey)))
  for (const result of results) {
    if (result.status === "rejected") {
      diagnostics.errors.push({ dataset: "provider", message: result.reason instanceof Error ? result.reason.message : "Dataset download failed." })
      continue
    }

    const { dataset, file, bytes, contentType, error, buffer } = result.value
    if (error || !buffer) {
      diagnostics.downloaded.push(diagnostic({
        dataset,
        file,
        bytes,
        decompressedBytes: null,
        contentType,
        columns: [],
        rowCountBeforeSlice: 0,
        rowCountReturned: 0,
        decodeStatus: "download_failed",
        error: error ?? "Download failed.",
      }))
      diagnostics.errors.push({ dataset, message: error ?? "Download failed." })
      continue
    }

    try {
      const decoded = await decodeParquetZst(buffer)
      applyRows(dataset, decoded.rows, response, request)
      const count = returnedCount(dataset, response)
      const orderbookCounts = dataset === "orderbook" ? orderbookUsability(response) : {}
      const orderbookRaw = dataset === "orderbook" ? orderbookRawDiagnostics(decoded.rows, response) : {}
      diagnostics.downloaded.push(diagnostic({
        dataset,
        file,
        bytes,
        decompressedBytes: decoded.decompressedBytes,
        contentType,
        columns: decoded.columns,
        rowCountBeforeSlice: decoded.rows.length,
        rowCountReturned: count,
        ...orderbookCounts,
        ...orderbookRaw,
      }))
      if (count === 0) {
        diagnostics.unavailable.push({ dataset, reason: `${file} decoded, but no rows matched the replay normalizer. Columns: ${decoded.columns.join(", ") || "none"}` })
      }
    } catch (decodeError) {
      const message = decodeError instanceof Error ? decodeError.message : "Decode failed."
      diagnostics.downloaded.push(diagnostic({
        dataset,
        file,
        bytes,
        decompressedBytes: null,
        contentType,
        columns: [],
        rowCountBeforeSlice: 0,
        rowCountReturned: 0,
        decodeStatus: "downloaded_decode_failed",
        error: message,
      }))
      diagnostics.errors.push({ dataset, message })
    }
  }

  response.ok = Boolean(response.trades.length || response.book.length || response.liquidations.length || response.funding.length || response.candles.length)
  if (!response.ok && diagnostics.unavailable.length === 0 && diagnostics.errors.length === 0) {
    diagnostics.unavailable.push({ dataset: "provider", reason: "No replay rows decoded for this exchange / symbol / hour." })
  }

  return response
}
