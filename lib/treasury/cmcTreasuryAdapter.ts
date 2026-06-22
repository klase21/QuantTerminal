import {
  TREASURY_SNAPSHOT_SCHEMA_VERSION,
  type TreasuryQuality,
  type TreasurySourceFile,
} from "@/core/treasury-intelligence"

export type CmcTreasuryFailureCategory =
  | "unavailable_source"
  | "malformed_record"
  | "incomplete_data"
  | "validation_failure"

export interface CmcTreasuryRejection {
  index: number
  category: Exclude<CmcTreasuryFailureCategory, "unavailable_source">
  reason: string
}

export interface CmcTreasuryAdapterReport {
  endpoint: string
  holdersDiscovered: string[]
  assetsDiscovered: string[]
  recordsReceived: number
  recordsIngested: number
  recordsRejected: number
  rejectionCounts: Record<CmcTreasuryFailureCategory, number>
  rejections: CmcTreasuryRejection[]
}

export interface CmcTreasuryAdapterResult {
  sourceFile: TreasurySourceFile
  report: CmcTreasuryAdapterReport
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function explicitNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    if (!(key in record)) continue
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
    return Number.NaN
  }
  return undefined
}

function nestedText(record: UnknownRecord, parent: string, keys: string[]) {
  const nested = record[parent]
  if (!isRecord(nested)) return null
  for (const key of keys) {
    const value = text(nested[key])
    if (value) return value
  }
  return null
}

function recordsFrom(value: unknown): unknown[] {
  if (!isRecord(value)) return []
  if (Array.isArray(value.data)) return value.data
  if (isRecord(value.data)) {
    for (const key of ["records", "holdings", "companies", "treasuries", "items"]) {
      if (Array.isArray(value.data[key])) return value.data[key]
    }
  }
  for (const key of ["records", "holdings", "companies", "treasuries", "items"]) {
    if (Array.isArray(value[key])) return value[key]
  }
  return []
}

function responseTimestamp(value: unknown) {
  if (!isRecord(value)) return undefined
  if (isRecord(value.status)) return text(value.status.timestamp) ?? undefined
  return text(value.timestamp) ?? undefined
}

function observedTimestamp(record: UnknownRecord, fallback?: string) {
  const value = text(record.timestamp)
    ?? text(record.last_updated)
    ?? text(record.updated_at)
    ?? text(record.observed_at)
    ?? text(fallback)
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null
}

function quality(record: UnknownRecord): TreasuryQuality {
  const value = (text(record.quality) ?? text(record.source_quality))?.toLowerCase()
  return value === "verified" || value === "degraded"
    || value === "unavailable" || value === "unknown"
    ? value
    : "verified"
}

export function normalizeCmcTreasuryResponse(input: {
  response: unknown
  endpoint: string
  asset?: string
}): CmcTreasuryAdapterResult {
  const records = recordsFrom(input.response)
  const fallbackTimestamp = responseTimestamp(input.response)
  const snapshots: TreasurySourceFile["snapshots"] = []
  const rejections: CmcTreasuryRejection[] = []

  records.forEach((value, index) => {
    if (!isRecord(value)) {
      rejections.push({
        index,
        category: "malformed_record",
        reason: "Record is not an object.",
      })
      return
    }

    const holder = text(value.holder)
      ?? text(value.name)
      ?? text(value.company_name)
      ?? text(value.companyName)
      ?? text(value.entity_name)
      ?? nestedText(value, "company", ["name"])
    const asset = text(value.asset)
      ?? text(value.symbol)
      ?? nestedText(value, "currency", ["symbol"])
      ?? text(input.asset)
    const holdings = explicitNumber(value, [
      "holdings",
      "total_holdings",
      "totalHoldings",
      "amount",
      "balance",
    ])
    const timestamp = observedTimestamp(value, fallbackTimestamp)
    const missing = [
      !holder && "holder",
      !asset && "asset",
      holdings === undefined && "holdings",
      !timestamp && "timestamp",
    ].filter(Boolean)
    if (missing.length) {
      rejections.push({
        index,
        category: "incomplete_data",
        reason: `Missing required field(s): ${missing.join(", ")}.`,
      })
      return
    }

    const holdingsValueUsd = explicitNumber(value, [
      "holdingsValueUsd",
      "holdings_value_usd",
      "value_usd",
      "valueUsd",
    ])
    const changeAmount = explicitNumber(value, [
      "changeAmount",
      "change_amount",
      "holdings_change",
    ])
    const changePercent = explicitNumber(value, [
      "changePercent",
      "change_percent",
      "holdings_change_percent",
    ])
    if (
      !Number.isFinite(holdings)
      || holdings! < 0
      || (holdingsValueUsd !== undefined
        && (!Number.isFinite(holdingsValueUsd) || holdingsValueUsd < 0))
      || (changeAmount !== undefined && !Number.isFinite(changeAmount))
      || (changePercent !== undefined && !Number.isFinite(changePercent))
    ) {
      rejections.push({
        index,
        category: "validation_failure",
        reason: "Treasury numeric values are invalid.",
      })
      return
    }

    const holderType = text(value.holderType)
      ?? text(value.holder_type)
      ?? text(value.type)
      ?? text(value.entity_type)
      ?? "unknown"
    const recordQuality = quality(value)
    snapshots.push({
      holder: holder!,
      holderType,
      asset: asset!.toUpperCase(),
      holdings: holdings!,
      holdingsValueUsd: holdingsValueUsd ?? null,
      changeAmount: changeAmount ?? null,
      changePercent: changePercent ?? null,
      timestamp: timestamp!,
      quality: holderType === "unknown" && recordQuality === "verified"
        ? "degraded"
        : recordQuality,
      metadata: {
        adapter: "cmc-treasury-v1",
        endpoint: input.endpoint,
        providerRecordIndex: index,
      },
    })
  })

  const holdersDiscovered = [
    ...new Set(snapshots.map((snapshot) => snapshot.holder)),
  ].sort()
  const assetsDiscovered = [
    ...new Set(snapshots.map((snapshot) => snapshot.asset)),
  ].sort()
  const rejectionCounts: Record<CmcTreasuryFailureCategory, number> = {
    unavailable_source: 0,
    malformed_record: rejections.filter((item) => item.category === "malformed_record").length,
    incomplete_data: rejections.filter((item) => item.category === "incomplete_data").length,
    validation_failure: rejections.filter((item) => item.category === "validation_failure").length,
  }

  return {
    sourceFile: {
      schemaVersion: TREASURY_SNAPSHOT_SCHEMA_VERSION,
      source: "coinmarketcap-compatible-treasury",
      snapshots,
    },
    report: {
      endpoint: input.endpoint,
      holdersDiscovered,
      assetsDiscovered,
      recordsReceived: records.length,
      recordsIngested: snapshots.length,
      recordsRejected: rejections.length,
      rejectionCounts,
      rejections,
    },
  }
}

export async function fetchCmcTreasury(input: {
  apiKey: string
  endpoint?: string
  asset?: string
  timeoutMs?: number
  signal?: AbortSignal
}) {
  const endpoint = input.endpoint?.trim() || process.env.CMC_TREASURY_URL?.trim()
  if (!endpoint) {
    throw new Error("CMC_TREASURY_URL or --endpoint is required.")
  }
  const url = new URL(endpoint)
  if (input.asset?.trim()) url.searchParams.set("symbol", input.asset.trim().toUpperCase())
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new Error("CMC treasury request timed out.")),
    input.timeoutMs ?? 10_000,
  )
  const abort = () => controller.abort(input.signal?.reason)
  input.signal?.addEventListener("abort", abort, { once: true })
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-CMC_PRO_API_KEY": input.apiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`CMC treasury source returned HTTP ${response.status}.`)
    }
    const parsed: unknown = await response.json()
    const result = normalizeCmcTreasuryResponse({
      response: parsed,
      endpoint: url.origin + url.pathname,
      asset: input.asset,
    })
    if (!result.report.recordsReceived) {
      throw new Error("CMC treasury source returned no records.")
    }
    return result
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener("abort", abort)
  }
}
