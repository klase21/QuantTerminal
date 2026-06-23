import {
  ETF_SNAPSHOT_SCHEMA_VERSION,
  type EtfQuality,
  type EtfSourceFile,
} from "@/core/etf-intelligence"

export type CmcEtfFailureCategory =
  | "unavailable_source"
  | "malformed_record"
  | "incomplete_data"
  | "validation_failure"
  | "unknown"

export interface CmcEtfRejection {
  index: number
  category: Exclude<CmcEtfFailureCategory, "unavailable_source" | "unknown">
  reason: string
}

export interface CmcEtfAdapterReport {
  endpoint: string
  assetsDiscovered: string[]
  recordsReceived: number
  recordsIngested: number
  recordsRejected: number
  rejectionCounts: Record<CmcEtfFailureCategory, number>
  rejections: CmcEtfRejection[]
}

export interface CmcEtfAdapterResult {
  sourceFile: EtfSourceFile
  report: CmcEtfAdapterReport
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
    if (value === null) return null
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

function responseRecords(value: unknown): unknown[] {
  if (!isRecord(value)) return []
  if (Array.isArray(value.data)) return value.data
  if (isRecord(value.data)) {
    for (const key of ["records", "etfs", "funds", "items", "flows"]) {
      if (Array.isArray(value.data[key])) return value.data[key]
    }
  }
  for (const key of ["records", "etfs", "funds", "items", "flows"]) {
    if (Array.isArray(value[key])) return value[key]
  }
  return []
}

function responseTimestamp(value: unknown) {
  if (!isRecord(value)) return undefined
  if (isRecord(value.status)) return text(value.status.timestamp) ?? undefined
  return text(value.timestamp) ?? undefined
}

function recordTimestamp(record: UnknownRecord, fallback?: string) {
  const value = text(record.timestamp)
    ?? text(record.date)
    ?? text(record.last_updated)
    ?? text(record.updated_at)
    ?? text(record.observed_at)
    ?? text(fallback)
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null
}

function recordQuality(record: UnknownRecord): EtfQuality {
  const value = (text(record.quality) ?? text(record.source_quality))?.toLowerCase()
  return value === "verified" || value === "degraded"
    || value === "unavailable" || value === "unknown"
    ? value
    : "verified"
}

export function normalizeCmcEtfResponse(input: {
  response: unknown
  endpoint: string
  asset?: string
}): CmcEtfAdapterResult {
  const records = responseRecords(input.response)
  const fallbackTimestamp = responseTimestamp(input.response)
  const snapshots: EtfSourceFile["snapshots"] = []
  const rejections: CmcEtfRejection[] = []

  records.forEach((value, index) => {
    if (!isRecord(value)) {
      rejections.push({
        index,
        category: "malformed_record",
        reason: "Record is not an object.",
      })
      return
    }
    const asset = text(value.asset)
      ?? text(value.symbol)
      ?? nestedText(value, "currency", ["symbol"])
      ?? text(input.asset)
    const timestamp = recordTimestamp(value, fallbackTimestamp)
    const missing = [
      !asset && "asset",
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

    const netInflowUsd = explicitNumber(value, [
      "netInflowUsd",
      "net_inflow_usd",
      "netFlowUsd",
      "net_flow_usd",
    ])
    const inflowUsd = explicitNumber(value, ["inflowUsd", "inflow_usd"])
    const outflowUsd = explicitNumber(value, ["outflowUsd", "outflow_usd"])
    const holdings = explicitNumber(value, ["holdings", "total_holdings", "totalHoldings"])
    const holdingsValueUsd = explicitNumber(value, [
      "holdingsValueUsd",
      "holdings_value_usd",
      "assets_under_management_usd",
      "aum_usd",
    ])
    const invalid = [
      netInflowUsd,
      inflowUsd,
      outflowUsd,
      holdings,
      holdingsValueUsd,
    ].some((metric) => metric !== undefined && metric !== null && !Number.isFinite(metric))
    const invalidNonNegative = [
      inflowUsd,
      outflowUsd,
      holdings,
      holdingsValueUsd,
    ].some((metric) => metric !== undefined && metric !== null && metric < 0)
    if (invalid || invalidNonNegative) {
      rejections.push({
        index,
        category: "validation_failure",
        reason: "ETF numeric values are invalid.",
      })
      return
    }
    if (
      netInflowUsd !== undefined
      && netInflowUsd !== null
      && inflowUsd !== undefined
      && inflowUsd !== null
      && outflowUsd !== undefined
      && outflowUsd !== null
      && Math.abs(netInflowUsd - (inflowUsd - outflowUsd)) > 1e-6
    ) {
      rejections.push({
        index,
        category: "validation_failure",
        reason: "Reported net inflow does not equal inflow minus outflow.",
      })
      return
    }

    snapshots.push({
      asset: asset!.toUpperCase(),
      timestamp: timestamp!,
      netInflowUsd: netInflowUsd ?? null,
      inflowUsd: inflowUsd ?? null,
      outflowUsd: outflowUsd ?? null,
      holdings: holdings ?? null,
      holdingsValueUsd: holdingsValueUsd ?? null,
      quality: recordQuality(value),
      metadata: {
        adapter: "cmc-etf-v1",
        endpoint: input.endpoint,
        providerRecordIndex: index,
      },
    })
  })

  const assetsDiscovered = [
    ...new Set(snapshots.map((snapshot) => snapshot.asset)),
  ].sort()
  const rejectionCounts: Record<CmcEtfFailureCategory, number> = {
    unavailable_source: 0,
    malformed_record: rejections.filter((item) => item.category === "malformed_record").length,
    incomplete_data: rejections.filter((item) => item.category === "incomplete_data").length,
    validation_failure: rejections.filter((item) => item.category === "validation_failure").length,
    unknown: 0,
  }
  return {
    sourceFile: {
      schemaVersion: ETF_SNAPSHOT_SCHEMA_VERSION,
      source: "coinmarketcap-compatible-etf",
      snapshots,
    },
    report: {
      endpoint: input.endpoint,
      assetsDiscovered,
      recordsReceived: records.length,
      recordsIngested: snapshots.length,
      recordsRejected: rejections.length,
      rejectionCounts,
      rejections,
    },
  }
}

export async function fetchCmcEtf(input: {
  apiKey: string
  endpoint?: string
  asset?: string
  timeoutMs?: number
  signal?: AbortSignal
}) {
  const endpoint = input.endpoint?.trim() || process.env.CMC_ETF_URL?.trim()
  if (!endpoint) throw new Error("CMC_ETF_URL or --endpoint is required.")
  const url = new URL(endpoint)
  if (input.asset?.trim()) url.searchParams.set("symbol", input.asset.trim().toUpperCase())
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new Error("CMC ETF request timed out.")),
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
    if (!response.ok) throw new Error(`CMC ETF source returned HTTP ${response.status}.`)
    const parsed: unknown = await response.json()
    const result = normalizeCmcEtfResponse({
      response: parsed,
      endpoint: url.origin + url.pathname,
      asset: input.asset,
    })
    if (!result.report.recordsReceived) {
      throw new Error("CMC ETF source returned no records.")
    }
    return result
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener("abort", abort)
  }
}
