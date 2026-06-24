import {
  classifyReserveAsset,
  RESERVE_INTELLIGENCE_SCHEMA_VERSION,
  RESERVE_TREND_HORIZONS,
  reserveIntelligenceObservationId,
  validateReserveIntelligenceObservation,
  type ReserveIntelligenceObservation,
  type ReserveObservationType,
  type ReserveTrendHorizon,
  type ReserveTrendObservation,
} from "@/core/reserve-intelligence"
import type {
  ExchangeReserveDelta,
} from "@/core/exchange-reserve-delta"
import type {
  ExchangeReserveSnapshot,
} from "@/core/exchange-reserve"

interface AssetAggregate {
  asset: string
  observedAt: string
  balance: number
  balanceUsd: number
}

const HORIZON_MS: Record<ReserveTrendHorizon, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
}

function aggregateSnapshots(snapshots: ExchangeReserveSnapshot[]) {
  const aggregates = new Map<string, AssetAggregate>()
  for (const snapshot of snapshots) {
    const key = `${snapshot.asset}:${snapshot.updateTime}`
    const current = aggregates.get(key)
    aggregates.set(key, {
      asset: snapshot.asset,
      observedAt: snapshot.updateTime,
      balance: (current?.balance ?? 0) + snapshot.balance,
      balanceUsd: (current?.balanceUsd ?? 0) + snapshot.balanceUsd,
    })
  }
  return [...aggregates.values()]
}

function observationType(
  classification: ReturnType<typeof classifyReserveAsset>,
  delta: ExchangeReserveDelta,
): ReserveObservationType {
  if (delta.status !== "available" || delta.balanceDelta === null) return "delta_unavailable"
  if (classification === "stablecoin") {
    if (delta.balanceDelta > 0) return "stablecoin_accumulation"
    if (delta.balanceDelta < 0) return "stablecoin_decline"
    return "stablecoin_no_change"
  }
  if (delta.balanceDelta > 0) return "reserve_increase"
  if (delta.balanceDelta < 0) return "reserve_decrease"
  return "reserve_no_change"
}

function trendObservation(
  horizon: ReserveTrendHorizon,
  current: ExchangeReserveDelta,
  history: AssetAggregate[],
): ReserveTrendObservation {
  const target = Date.parse(current.currentObservedAt) - HORIZON_MS[horizon]
  const candidate = history
    .filter((item) => (
      item.asset === current.asset
      && Date.parse(item.observedAt) <= target
    ))
    .sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt))[0]
  if (!candidate) {
    return {
      horizon,
      status: "unavailable",
      previousObservedAt: null,
      quantityChange: null,
      absoluteChange: null,
      percentageChange: null,
      balanceUsdChange: null,
      reason: `No real reserve snapshot is available at or before the ${horizon} horizon.`,
    }
  }
  const quantityChange = current.currentBalance - candidate.balance
  return {
    horizon,
    status: "available",
    previousObservedAt: candidate.observedAt,
    quantityChange,
    absoluteChange: Math.abs(quantityChange),
    percentageChange: candidate.balance === 0 ? null : (quantityChange / candidate.balance) * 100,
    balanceUsdChange: current.currentBalanceUsd - candidate.balanceUsd,
    reason: candidate.balance === 0 ? "Previous balance is zero, so percentage change is unavailable." : null,
  }
}

export function buildReserveIntelligenceObservations(input: {
  deltas: ExchangeReserveDelta[]
  snapshots: ExchangeReserveSnapshot[]
  generatedAt?: string
}) {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const aggregates = aggregateSnapshots(input.snapshots)
  const observations = input.deltas.map((delta) => {
    const classification = classifyReserveAsset(delta.asset)
    const observation: ReserveIntelligenceObservation = {
      schemaVersion: RESERVE_INTELLIGENCE_SCHEMA_VERSION,
      observationId: reserveIntelligenceObservationId({
        exchange: delta.exchange,
        asset: delta.asset,
        observedAt: delta.currentObservedAt,
      }),
      exchange: delta.exchange,
      asset: delta.asset,
      classification,
      observationType: observationType(classification, delta),
      currentBalance: delta.currentBalance,
      currentBalanceUsd: delta.currentBalanceUsd,
      currentObservedAt: delta.currentObservedAt,
      previousObservedAt: delta.previousObservedAt,
      quantityChange: delta.balanceDelta,
      absoluteChange: delta.balanceDelta === null ? null : Math.abs(delta.balanceDelta),
      percentageChange: delta.balanceDeltaPct,
      balanceUsdChange: delta.balanceUsdDelta,
      trends: RESERVE_TREND_HORIZONS.map((horizon) => (
        trendObservation(horizon, delta, aggregates)
      )),
      source: "exchange_reserve_delta",
      quality: delta.status === "available" ? "verified" : "unavailable",
      generatedAt,
      reason: delta.reason,
    }
    const validation = validateReserveIntelligenceObservation(observation)
    if (!validation.valid) {
      throw new Error(`Invalid ${delta.asset} reserve intelligence: ${validation.errors.join(" ")}`)
    }
    return observation
  })
  return observations
}
