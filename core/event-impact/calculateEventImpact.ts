import type { VerifiedEvent } from "@/core/event-catalog"
import type { CanonicalOhlcvCandle } from "@/core/historical-intelligence/market-data"
import {
  EVENT_IMPACT_HORIZONS,
  type EventImpactEventOutcome,
  type EventImpactHorizon,
  type EventImpactHorizonStatistics,
  type EventImpactStatistics,
} from "./eventImpactTypes"

const HORIZON_MS: Record<EventImpactHorizon, number> = {
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
}

function unavailableOutcomes() {
  return Object.fromEntries(
    EVENT_IMPACT_HORIZONS.map((horizon) => [horizon, { return: null, available: false }]),
  ) as EventImpactEventOutcome["outcomes"]
}

function finitePositive(value: number) {
  return Number.isFinite(value) && value > 0
}

export function calculateEventOutcome(
  event: VerifiedEvent,
  symbol: string,
  exchange: string,
  candles: CanonicalOhlcvCandle[],
): EventImpactEventOutcome {
  const eventTime = Date.parse(event.timestamp)
  const ordered = candles
    .filter((candle) => (
      candle.symbol === symbol
      && candle.exchange === exchange
      && finitePositive(candle.close)
      && Number.isFinite(candle.openTime)
      && Number.isFinite(candle.closeTime)
    ))
    .sort((left, right) => left.openTime - right.openTime)

  const baseline = [...ordered].reverse().find((candle) => candle.closeTime < eventTime)
  const outcomes = unavailableOutcomes()
  if (!baseline) {
    return {
      eventId: event.eventId,
      category: event.category,
      eventTimestamp: event.timestamp,
      symbol,
      exchange,
      source: event.source,
      outcomes,
    }
  }

  for (const horizon of EVENT_IMPACT_HORIZONS) {
    const targetTime = eventTime + HORIZON_MS[horizon] - 1
    const target = ordered.find((candle) => candle.closeTime >= targetTime)
    if (!target || !finitePositive(target.close)) continue
    outcomes[horizon] = {
      return: ((target.close - baseline.close) / baseline.close) * 100,
      available: true,
    }
  }

  return {
    eventId: event.eventId,
    category: event.category,
    eventTimestamp: event.timestamp,
    symbol,
    exchange,
    source: event.source,
    outcomes,
  }
}

function median(values: number[]) {
  if (!values.length) return null
  const ordered = [...values].sort((left, right) => left - right)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2
}

function aggregateHorizon(
  outcomes: EventImpactEventOutcome[],
  horizon: EventImpactHorizon,
): EventImpactHorizonStatistics {
  const usable = outcomes
    .map((outcome) => ({ outcome, value: outcome.outcomes[horizon].return }))
    .filter((item): item is { outcome: EventImpactEventOutcome; value: number } => (
      item.outcome.outcomes[horizon].available
      && item.value !== null
      && Number.isFinite(item.value)
    ))
    .sort((left, right) => left.value - right.value)

  if (!usable.length) {
    return {
      sampleCount: 0,
      averageReturn: null,
      medianReturn: null,
      winRate: null,
      bestCase: null,
      worstCase: null,
    }
  }

  const values = usable.map((item) => item.value)
  const reference = (item: typeof usable[number]) => ({
    eventId: item.outcome.eventId,
    eventTimestamp: item.outcome.eventTimestamp,
    symbol: item.outcome.symbol,
    exchange: item.outcome.exchange,
    return: item.value,
  })

  return {
    sampleCount: usable.length,
    averageReturn: values.reduce((sum, value) => sum + value, 0) / values.length,
    medianReturn: median(values),
    winRate: (values.filter((value) => value > 0).length / values.length) * 100,
    bestCase: reference(usable[usable.length - 1]),
    worstCase: reference(usable[0]),
  }
}

export function aggregateEventImpact(outcomes: EventImpactEventOutcome[]): EventImpactStatistics {
  return {
    byHorizon: Object.fromEntries(
      EVENT_IMPACT_HORIZONS.map((horizon) => [horizon, aggregateHorizon(outcomes, horizon)]),
    ) as EventImpactStatistics["byHorizon"],
  }
}
