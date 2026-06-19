import type {
  HistoricalAnalogHorizon,
  HistoricalAnalogOutcome,
  HistoricalMarketStateV2,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
import type { HistoricalInterval, MarketOhlcvRow } from "@/types/historical"

const INTERVAL_HOURS: Record<HistoricalInterval, number> = {
  "1h": 1,
  "4h": 4,
  "1d": 24,
}

const HORIZON_HOURS: Record<HistoricalAnalogHorizon, number> = {
  "1h": 1,
  "4h": 4,
  "24h": 24,
  "7d": 168,
}

function futureBars(interval: HistoricalInterval, horizon: HistoricalAnalogHorizon) {
  const hours = HORIZON_HOURS[horizon]
  const intervalHours = INTERVAL_HOURS[interval]
  if (hours < intervalHours || hours % intervalHours !== 0) return null
  return hours / intervalHours
}

function forwardReturn(rows: MarketOhlcvRow[], index: number, horizon: HistoricalAnalogHorizon) {
  const bars = futureBars(rows[index].interval, horizon)
  if (bars === null || index + bars >= rows.length || rows[index].close === 0) return null
  return ((rows[index + bars].close - rows[index].close) / rows[index].close) * 100
}

export function buildHistoricalAnalogOutcomes(
  rowsInput: MarketOhlcvRow[],
  states: HistoricalMarketStateV2[],
): HistoricalAnalogOutcome[] {
  const rows = [...rowsInput].sort((left, right) => left.openTime - right.openTime)
  const stateByTimestamp = new Map(states.map((state) => [state.timestamp, state]))

  return rows.flatMap((row, index) => {
    const state = stateByTimestamp.get(row.openTime)
    if (!state) return []
    return [{
      stateId: state.id,
      symbol: state.symbol,
      timestamp: state.timestamp,
      returns: {
        "1h": forwardReturn(rows, index, "1h"),
        "4h": forwardReturn(rows, index, "4h"),
        "24h": forwardReturn(rows, index, "24h"),
        "7d": forwardReturn(rows, index, "7d"),
      },
    }]
  })
}
