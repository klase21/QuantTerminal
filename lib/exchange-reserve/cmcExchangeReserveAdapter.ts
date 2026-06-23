import {
  EXCHANGE_RESERVE_SCHEMA_VERSION,
  type ExchangeReserveSourceFile,
} from "@/core/exchange-reserve"

export const CMC_BINANCE_RESERVE_WALLETS_URL =
  "https://api.coinmarketcap.com/data-api/v3/exchange/reserves/wallets?id=270"

export type CmcExchangeReserveFailureCategory =
  | "unavailable_source"
  | "malformed_record"
  | "incomplete_data"
  | "validation_failure"

export interface CmcExchangeReserveRejection {
  index: number
  category: Exclude<CmcExchangeReserveFailureCategory, "unavailable_source">
  reason: string
}

export interface CmcExchangeReserveAdapterReport {
  endpoint: string
  httpStatus: number
  topLevelKeys: string[]
  recordsReceived: number
  recordsIngested: number
  recordsRejected: number
  assetsDiscovered: string[]
  networksDiscovered: string[]
  rejectionCounts: Record<CmcExchangeReserveFailureCategory, number>
  rejections: CmcExchangeReserveRejection[]
}

export interface CmcExchangeReserveAdapterResult {
  sourceFile: ExchangeReserveSourceFile
  report: CmcExchangeReserveAdapterReport
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function number(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function normalizeUtcTimestamp(value: unknown) {
  const raw = text(value)
  if (!raw) return null
  const explicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)
  const normalized = explicitZone
    ? raw
    : `${raw.replace(" ", "T")}Z`
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function responseRecords(value: unknown) {
  if (!isRecord(value) || !isRecord(value.data)) return []
  return Array.isArray(value.data.exchangeWallets)
    ? value.data.exchangeWallets
    : []
}

function responseTimestamp(value: unknown) {
  if (!isRecord(value)) return null
  if (isRecord(value.data)) {
    const timestamp = normalizeUtcTimestamp(value.data.updateTime)
    if (timestamp) return timestamp
  }
  return isRecord(value.status)
    ? normalizeUtcTimestamp(value.status.timestamp)
    : null
}

export function normalizeCmcExchangeReserveResponse(input: {
  response: unknown
  endpoint: string
  httpStatus: number
}): CmcExchangeReserveAdapterResult {
  const records = responseRecords(input.response)
  const fallbackTimestamp = responseTimestamp(input.response)
  const snapshots: ExchangeReserveSourceFile["snapshots"] = []
  const rejections: CmcExchangeReserveRejection[] = []

  records.forEach((value, index) => {
    if (!isRecord(value)) {
      rejections.push({
        index,
        category: "malformed_record",
        reason: "Record is not an object.",
      })
      return
    }
    const walletAddress = text(value.walletAddress)
    const network = text(value.network)
    const asset = text(value.name)
    const balance = number(value.balance)
    const balanceUsd = number(value.balanceUsd)
    const updateTime = normalizeUtcTimestamp(value.updateTime) ?? fallbackTimestamp
    const missing = [
      !walletAddress && "walletAddress",
      !network && "network",
      !asset && "asset",
      balance === null && "balance",
      balanceUsd === null && "balanceUsd",
      !updateTime && "updateTime",
    ].filter(Boolean)
    if (missing.length) {
      rejections.push({
        index,
        category: "incomplete_data",
        reason: `Missing required field(s): ${missing.join(", ")}.`,
      })
      return
    }
    if (balance! < 0 || balanceUsd! < 0) {
      rejections.push({
        index,
        category: "validation_failure",
        reason: "Reserve balances must be non-negative.",
      })
      return
    }
    snapshots.push({
      exchange: "binance",
      walletAddress: walletAddress!,
      network: network!,
      asset: asset!.toUpperCase(),
      balance: balance!,
      balanceUsd: balanceUsd!,
      updateTime: updateTime!,
      quality: "verified",
      metadata: {
        adapter: "cmc-binance-exchange-reserve-v1",
        endpoint: input.endpoint,
        providerRecordIndex: index,
        cryptoId: number(value.cryptoId),
        platformCryptoId: number(value.platformCryptoId),
      },
    })
  })

  const rejectionCounts: Record<CmcExchangeReserveFailureCategory, number> = {
    unavailable_source: 0,
    malformed_record: rejections.filter((item) => item.category === "malformed_record").length,
    incomplete_data: rejections.filter((item) => item.category === "incomplete_data").length,
    validation_failure: rejections.filter((item) => item.category === "validation_failure").length,
  }
  return {
    sourceFile: {
      schemaVersion: EXCHANGE_RESERVE_SCHEMA_VERSION,
      source: "coinmarketcap-binance-reserve-wallets",
      snapshots,
    },
    report: {
      endpoint: input.endpoint,
      httpStatus: input.httpStatus,
      topLevelKeys: isRecord(input.response) ? Object.keys(input.response) : [],
      recordsReceived: records.length,
      recordsIngested: snapshots.length,
      recordsRejected: rejections.length,
      assetsDiscovered: [...new Set(snapshots.map((item) => item.asset))].sort(),
      networksDiscovered: [...new Set(snapshots.map((item) => item.network))].sort(),
      rejectionCounts,
      rejections,
    },
  }
}

export async function fetchCmcBinanceExchangeReserves(input: {
  timeoutMs?: number
  signal?: AbortSignal
} = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new Error("CMC Binance reserve request timed out.")),
    input.timeoutMs ?? 15_000,
  )
  const abort = () => controller.abort(input.signal?.reason)
  input.signal?.addEventListener("abort", abort, { once: true })
  try {
    const response = await fetch(CMC_BINANCE_RESERVE_WALLETS_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`CMC Binance reserve source returned HTTP ${response.status}.`)
    }
    const parsed: unknown = await response.json()
    const url = new URL(CMC_BINANCE_RESERVE_WALLETS_URL)
    return normalizeCmcExchangeReserveResponse({
      response: parsed,
      endpoint: url.origin + url.pathname,
      httpStatus: response.status,
    })
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener("abort", abort)
  }
}
