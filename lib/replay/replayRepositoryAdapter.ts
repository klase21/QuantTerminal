import type {
  ReplayRepositoryDataset,
  ReplayRepositoryDatasetResponse,
  ReplayRepositoryRecord,
} from "@/lib/replay/replayRepositoryClient"

export interface RepositoryReplayCandle {
  readonly timestamp: string
  readonly open: number
  readonly high: number
  readonly low: number
  readonly close: number
  readonly volume: number | null
}

export interface RepositoryReplayPositioningPoint {
  readonly timestamp: string
  readonly fundingRate: number | null
  readonly openInterest: number | null
  readonly openInterestValue: number | null
  readonly source: "repository"
}

export interface RepositoryReplayLiquidation {
  readonly timestamp: string
  readonly side: string
  readonly price: number | null
  readonly size: number | null
  readonly notional: number | null
}

export interface RepositoryReplayTrade {
  readonly timestamp: string
  readonly price: number
  readonly size: number
  readonly side: "buy" | "sell"
}

export interface ReplayRepositoryAdapterResult {
  readonly status: "SUCCESS" | "EMPTY" | "INVALID_RESPONSE"
  readonly dataset: ReplayRepositoryDataset
  readonly candles: readonly RepositoryReplayCandle[]
  readonly positioning: readonly RepositoryReplayPositioningPoint[]
  readonly liquidations: readonly RepositoryReplayLiquidation[]
  readonly trades: readonly RepositoryReplayTrade[]
  readonly truncated: boolean
  readonly nextCursor: string | null
  readonly limit: number | null
  readonly errors: readonly string[]
}

function payload(record: ReplayRepositoryRecord): Record<string, unknown> | null {
  return record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
    ? record.payload as Record<string, unknown>
    : null
}

function timestamp(value: unknown, fallback: string): string | null {
  const candidate = typeof value === "string" ? value : fallback
  return Number.isFinite(Date.parse(candidate)) ? new Date(candidate).toISOString() : null
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function nullableNumber(value: unknown): number | null | undefined {
  if (value === null) return null
  return finiteNumber(value) ?? undefined
}

function empty(dataset: ReplayRepositoryDataset, response: ReplayRepositoryDatasetResponse): ReplayRepositoryAdapterResult {
  return Object.freeze({
    status: "EMPTY",
    dataset,
    candles: Object.freeze([]),
    positioning: Object.freeze([]),
    liquidations: Object.freeze([]),
    trades: Object.freeze([]),
    truncated: response.truncated,
    nextCursor: response.nextCursor,
    limit: response.limit,
    errors: Object.freeze([]),
  })
}

function invalid(
  dataset: ReplayRepositoryDataset,
  response: ReplayRepositoryDatasetResponse,
  errors: readonly string[],
): ReplayRepositoryAdapterResult {
  return Object.freeze({
    ...empty(dataset, response),
    status: "INVALID_RESPONSE",
    errors: Object.freeze([...errors]),
  })
}

export function adaptReplayRepositoryDataset(
  response: ReplayRepositoryDatasetResponse,
): ReplayRepositoryAdapterResult {
  const dataset = response.dataset
  if (!response.records.length) return empty(dataset, response)
  const errors: string[] = []
  const candles: RepositoryReplayCandle[] = []
  const positioning: RepositoryReplayPositioningPoint[] = []
  const liquidations: RepositoryReplayLiquidation[] = []
  const trades: RepositoryReplayTrade[] = []

  response.records.forEach((record, index) => {
    const value = payload(record)
    if (!value) {
      errors.push(`${dataset} record ${index} has no object payload.`)
      return
    }
    if (dataset === "market") {
      const observedAt = timestamp(value.openTime, record.observedAt)
      const open = finiteNumber(value.open)
      const high = finiteNumber(value.high)
      const low = finiteNumber(value.low)
      const close = finiteNumber(value.close)
      const volume = nullableNumber(value.volume)
      if (!observedAt || open === null || high === null || low === null || close === null
        || volume === undefined || high < low) {
        errors.push(`market record ${index} is malformed.`)
        return
      }
      candles.push(Object.freeze({ timestamp: observedAt, open, high, low, close, volume }))
      return
    }
    if (dataset === "open_interest") {
      const observedAt = timestamp(value.observedAt, record.observedAt)
      const openInterest = finiteNumber(value.openInterest)
      if (!observedAt || openInterest === null || openInterest < 0) {
        errors.push(`open_interest record ${index} is malformed.`)
        return
      }
      positioning.push(Object.freeze({
        timestamp: observedAt,
        fundingRate: null,
        openInterest,
        openInterestValue: null,
        source: "repository",
      }))
      return
    }
    if (dataset === "funding") {
      const observedAt = timestamp(value.fundingTime ?? value.observedAt, record.observedAt)
      const fundingRate = finiteNumber(value.fundingRate)
      if (!observedAt || fundingRate === null) {
        errors.push(`funding record ${index} is malformed.`)
        return
      }
      positioning.push(Object.freeze({
        timestamp: observedAt,
        fundingRate,
        openInterest: null,
        openInterestValue: null,
        source: "repository",
      }))
      return
    }
    if (dataset === "liquidation") {
      const observedAt = timestamp(value.observedAt, record.observedAt)
      const side = typeof value.side === "string" ? value.side : null
      const price = nullableNumber(value.price)
      const size = nullableNumber(value.quantity)
      const notional = nullableNumber(value.notional)
      if (!observedAt || !side || price === undefined || size === undefined || notional === undefined) {
        errors.push(`liquidation record ${index} is malformed.`)
        return
      }
      liquidations.push(Object.freeze({ timestamp: observedAt, side, price, size, notional }))
      return
    }
    const observedAt = timestamp(value.tradeTime ?? value.observedAt, record.observedAt)
    const price = finiteNumber(value.price)
    const size = finiteNumber(value.quantity)
    if (!observedAt || price === null || price <= 0 || size === null || size <= 0
      || typeof value.isBuyerMaker !== "boolean") {
      errors.push(`agg_trade record ${index} is malformed.`)
      return
    }
    trades.push(Object.freeze({
      timestamp: observedAt,
      price,
      size,
      side: value.isBuyerMaker ? "sell" : "buy",
    }))
  })

  if (errors.length > 0) return invalid(dataset, response, errors)
  return Object.freeze({
    status: "SUCCESS",
    dataset,
    candles: Object.freeze(candles),
    positioning: Object.freeze(positioning),
    liquidations: Object.freeze(liquidations),
    trades: Object.freeze(trades),
    truncated: response.truncated,
    nextCursor: response.nextCursor,
    limit: response.limit,
    errors: Object.freeze([]),
  })
}
