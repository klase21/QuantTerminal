import {
  EXCHANGE_FLOW_SCHEMA_VERSION,
  type ExchangeFlowSourceFile,
  type ExchangeFlowSourceQuality,
} from "@/core/exchange-flow"

export const DEFAULT_CMC_EXCHANGE_ASSET_ENDPOINT =
  "https://pro-api.coinmarketcap.com/v1/exchange/assets"
export const CMC_DATA_API_EXCHANGE_FLOW_URL =
  "https://api.coinmarketcap.com/data-api/v3/exchange-asset/flow/list?convertId=2781&start=1&limit=100&sortBy=exchangeRank&sortType=asc"

export type CmcExchangeFlowFailureCategory =
  | "unavailable_source"
  | "malformed_record"
  | "incomplete_data"
  | "validation_failure"

export interface CmcExchangeFlowRejection {
  index: number
  category: Exclude<CmcExchangeFlowFailureCategory, "unavailable_source">
  reason: string
}

export interface CmcExchangeFlowAdapterReport {
  endpoint: string
  exchangesDiscovered: string[]
  assetsDiscovered: string[]
  recordsReceived: number
  recordsIngested: number
  recordsRejected: number
  assetLevelRecords: number
  exchangeLevelRecords: number
  rejectionCounts: Record<CmcExchangeFlowFailureCategory, number>
  rejections: CmcExchangeFlowRejection[]
}

export interface CmcExchangeFlowAdapterResult {
  sourceFile: ExchangeFlowSourceFile
  report: CmcExchangeFlowAdapterReport
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function nonEmptyString(value: unknown) {
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

function nestedString(record: UnknownRecord, key: string, childKeys: string[]) {
  const nested = record[key]
  if (!isRecord(nested)) return null
  for (const childKey of childKeys) {
    const value = nonEmptyString(nested[childKey])
    if (value) return value
  }
  return null
}

function recordExchange(record: UnknownRecord, fallback?: string) {
  const direct = nonEmptyString(record.exchange)
    ?? nonEmptyString(record.exchange_name)
    ?? nonEmptyString(record.exchange_slug)
    ?? nonEmptyString(record.name)
    ?? nonEmptyString(record.slug)
  const nested = nestedString(record, "exchange", ["slug", "name", "id"])
  return direct ?? nested ?? nonEmptyString(fallback)
}

function recordAsset(record: UnknownRecord) {
  return (
    nonEmptyString(record.asset)
    ?? nonEmptyString(record.symbol)
    ?? nestedString(record, "currency", ["symbol"])
    ?? nestedString(record, "platform", ["symbol"])
  )
}

function recordTimestamp(record: UnknownRecord, fallback?: string) {
  const value = nonEmptyString(record.timestamp)
    ?? nonEmptyString(record.last_updated)
    ?? nonEmptyString(record.updated_at)
    ?? nonEmptyString(record.observed_at)
    ?? nonEmptyString(fallback)
  if (!value || !Number.isFinite(Date.parse(value))) return null
  return new Date(value).toISOString()
}

function recordQuality(record: UnknownRecord): ExchangeFlowSourceQuality {
  const value = (
    nonEmptyString(record.quality)
    ?? nonEmptyString(record.source_quality)
  )?.toLowerCase()
  return value === "verified" || value === "degraded"
    || value === "unavailable" || value === "unknown"
    ? value
    : "verified"
}

function responseRecords(value: unknown): unknown[] {
  if (!isRecord(value)) return []
  if (Array.isArray(value.data)) return value.data
  if (isRecord(value.data)) {
    for (const key of ["records", "assets", "items", "flows", "flowList"]) {
      if (Array.isArray(value.data[key])) return value.data[key]
    }
  }
  for (const key of ["records", "assets", "items", "flows", "flowList"]) {
    if (Array.isArray(value[key])) return value[key]
  }
  return []
}

function responseTimestamp(value: unknown) {
  if (!isRecord(value)) return undefined
  if (isRecord(value.status)) {
    return nonEmptyString(value.status.timestamp) ?? undefined
  }
  return nonEmptyString(value.timestamp) ?? undefined
}

export function normalizeCmcExchangeFlowResponse(input: {
  response: unknown
  endpoint: string
  exchange?: string
}): CmcExchangeFlowAdapterResult {
  const records = responseRecords(input.response)
  const observedAt = responseTimestamp(input.response)
  const snapshots: ExchangeFlowSourceFile["snapshots"] = []
  const rejections: CmcExchangeFlowRejection[] = []

  records.forEach((value, index) => {
    if (!isRecord(value)) {
      rejections.push({
        index,
        category: "malformed_record",
        reason: "Record is not an object.",
      })
      return
    }

    const exchange = recordExchange(value, input.exchange)
    const asset = recordAsset(value)
    const timestamp = recordTimestamp(value, observedAt)
    const holdings = explicitNumber(value, [
      "holdings",
      "balance",
      "balance_amount",
      "balanceAmount",
      "totalAsset",
    ])
    const inflow = explicitNumber(value, [
      "inflow",
      "inflow_amount",
      "inflowAmount",
    ])
    const outflow = explicitNumber(value, [
      "outflow",
      "outflow_amount",
      "outflowAmount",
    ])
    const reportedNetFlow = explicitNumber(value, [
      "netFlow",
      "net_flow",
      "netflow",
      "netFlow24hUsd",
    ])

    const assetLevelComplete = Boolean(
      exchange
      && asset
      && holdings !== undefined
      && inflow !== undefined
      && outflow !== undefined
      && timestamp,
    )
    const exchangeLevelComplete = Boolean(
      exchange
      && holdings !== undefined
      && reportedNetFlow !== undefined
      && timestamp,
    )
    if (!assetLevelComplete && !exchangeLevelComplete) {
      const assetMissing = [
        !exchange && "exchange",
        !asset && "asset",
        holdings === undefined && "holdings",
        inflow === undefined && "inflow",
        outflow === undefined && "outflow",
        !timestamp && "timestamp",
      ].filter(Boolean)
      const exchangeMissing = [
        !exchange && "exchange",
        holdings === undefined && "totalAssetsUsd",
        reportedNetFlow === undefined && "netFlow24hUsd",
        !timestamp && "timestamp",
      ].filter(Boolean)
      rejections.push({
        index,
        category: "incomplete_data",
        reason: `No usable flow scope. Asset-level missing: ${assetMissing.join(", ")}. Exchange-level missing: ${exchangeMissing.join(", ")}.`,
      })
      return
    }

    if (
      !Number.isFinite(holdings)
      || holdings! < 0
      || (reportedNetFlow !== undefined && !Number.isFinite(reportedNetFlow))
      || (
        assetLevelComplete
        && (
          !Number.isFinite(inflow)
          || !Number.isFinite(outflow)
          || inflow! < 0
          || outflow! < 0
        )
      )
    ) {
      rejections.push({
        index,
        category: "validation_failure",
        reason: "Holdings and flow values must be finite; gross values must be non-negative.",
      })
      return
    }

    const metadata = {
      adapter: "cmc-exchange-flow-v2",
      endpoint: input.endpoint,
      providerRecordIndex: index,
      flowInterval: nonEmptyString(value.flow_interval) ?? (
        "netFlow24hUsd" in value ? "24h" : null
      ),
    }
    if (assetLevelComplete) {
      const netFlow = inflow! - outflow!
      if (
        reportedNetFlow !== undefined
        && Math.abs(reportedNetFlow - netFlow) > 1e-8
      ) {
        rejections.push({
          index,
          category: "validation_failure",
          reason: "Reported net flow does not equal inflow minus outflow.",
        })
        return
      }
      snapshots.push({
        scope: "asset_level",
        exchange: exchange!.toLowerCase(),
        asset: asset!.toUpperCase(),
        holdings: holdings!,
        inflow: inflow!,
        outflow: outflow!,
        netFlow,
        timestamp: timestamp!,
        sourceQuality: recordQuality(value),
        metadata: {
          ...metadata,
          holdingsUnit: nonEmptyString(value.holdings_unit)
            ?? nonEmptyString(value.balance_unit)
            ?? "provider_native_asset_units",
        },
      })
    } else {
      snapshots.push({
        scope: "exchange_level",
        exchange: exchange!.toLowerCase(),
        totalAssetsUsd: holdings!,
        netFlow24hUsd: reportedNetFlow!,
        timestamp: timestamp!,
        sourceQuality: recordQuality(value),
        metadata: {
          ...metadata,
          totalAssetsUnit: "USD",
          netFlowUnit: "USD",
        },
      })
    }
  })

  const exchangesDiscovered = [
    ...new Set(snapshots.map((snapshot) => snapshot.exchange)),
  ].sort()
  const assetsDiscovered = [
    ...new Set(snapshots.flatMap((snapshot) => (
      snapshot.scope === "asset_level" ? [snapshot.asset] : []
    ))),
  ].sort()
  const rejectionCounts: Record<CmcExchangeFlowFailureCategory, number> = {
    unavailable_source: 0,
    malformed_record: rejections.filter((item) => item.category === "malformed_record").length,
    incomplete_data: rejections.filter((item) => item.category === "incomplete_data").length,
    validation_failure: rejections.filter((item) => item.category === "validation_failure").length,
  }

  return {
    sourceFile: {
      schemaVersion: EXCHANGE_FLOW_SCHEMA_VERSION,
      source: "coinmarketcap-compatible-exchange-assets",
      snapshots,
    },
    report: {
      endpoint: input.endpoint,
      exchangesDiscovered,
      assetsDiscovered,
      recordsReceived: records.length,
      recordsIngested: snapshots.length,
      recordsRejected: rejections.length,
      assetLevelRecords: snapshots.filter((item) => item.scope === "asset_level").length,
      exchangeLevelRecords: snapshots.filter((item) => item.scope === "exchange_level").length,
      rejectionCounts,
      rejections,
    },
  }
}

export async function fetchCmcExchangeFlow(input: {
  apiKey: string
  endpoint?: string
  exchange?: string
  exchangeId?: string
  asset?: string
  timeoutMs?: number
  signal?: AbortSignal
}): Promise<CmcExchangeFlowAdapterResult> {
  const endpoint = input.endpoint?.trim()
    || process.env.CMC_EXCHANGE_FLOW_URL?.trim()
    || DEFAULT_CMC_EXCHANGE_ASSET_ENDPOINT
  const url = new URL(endpoint)
  if (input.exchangeId?.trim()) url.searchParams.set("id", input.exchangeId.trim())
  if (input.asset?.trim()) url.searchParams.set("symbol", input.asset.trim().toUpperCase())

  const timeoutController = new AbortController()
  const timeout = setTimeout(
    () => timeoutController.abort(new Error("CMC exchange flow request timed out.")),
    input.timeoutMs ?? 10_000,
  )
  const abort = () => timeoutController.abort(input.signal?.reason)
  input.signal?.addEventListener("abort", abort, { once: true })
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-CMC_PRO_API_KEY": input.apiKey,
      },
      cache: "no-store",
      signal: timeoutController.signal,
    })
    if (!response.ok) {
      throw new Error(`CMC exchange flow source returned HTTP ${response.status}.`)
    }
    const parsed: unknown = await response.json()
    const result = normalizeCmcExchangeFlowResponse({
      response: parsed,
      endpoint: url.origin + url.pathname,
      exchange: input.exchange,
    })
    if (!result.report.recordsReceived) {
      throw new Error("CMC exchange flow source returned no records.")
    }
    return result
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener("abort", abort)
  }
}

export async function fetchCmcDataApiExchangeFlow(input: {
  timeoutMs?: number
  signal?: AbortSignal
} = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new Error("CMC data-api exchange flow request timed out.")),
    input.timeoutMs ?? 10_000,
  )
  const abort = () => controller.abort(input.signal?.reason)
  input.signal?.addEventListener("abort", abort, { once: true })
  try {
    const response = await fetch(CMC_DATA_API_EXCHANGE_FLOW_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
    const parsed: unknown = await response.json()
    const url = new URL(CMC_DATA_API_EXCHANGE_FLOW_URL)
    return {
      httpStatus: response.status,
      topLevelKeys: isRecord(parsed) ? Object.keys(parsed) : [],
      normalized: normalizeCmcExchangeFlowResponse({
        response: parsed,
        endpoint: url.origin + url.pathname,
      }),
    }
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener("abort", abort)
  }
}
