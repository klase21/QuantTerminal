import type {
  HistoricalAnalogCase,
  HistoricalAnalogDominantOutcome,
  HistoricalAnalogHorizon,
  HistoricalAnalogHorizonStats,
  HistoricalAnalogStatistics,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"

const HORIZONS: HistoricalAnalogHorizon[] = ["1h", "4h", "24h", "7d"]

function horizonStats(cases: HistoricalAnalogCase[], horizon: HistoricalAnalogHorizon): HistoricalAnalogHorizonStats {
  const usable = cases.flatMap((item) => {
    const value = item.outcome.returns[horizon]
    return value === null ? [] : [{ item, value }]
  })
  if (!usable.length) {
    return {
      caseCount: 0,
      averageReturn: null,
      winRate: null,
      bestCase: null,
      worstCase: null,
    }
  }

  const sorted = [...usable].sort((left, right) => left.value - right.value)
  const averageReturn = usable.reduce((sum, item) => sum + item.value, 0) / usable.length
  const wins = usable.filter((item) => item.value > 0).length
  const best = sorted.at(-1)!
  const worst = sorted[0]
  return {
    caseCount: usable.length,
    averageReturn: Number(averageReturn.toFixed(4)),
    winRate: Number(((wins / usable.length) * 100).toFixed(2)),
    bestCase: {
      stateId: best.item.state.id,
      timestamp: best.item.state.timestamp,
      return: Number(best.value.toFixed(4)),
    },
    worstCase: {
      stateId: worst.item.state.id,
      timestamp: worst.item.state.timestamp,
      return: Number(worst.value.toFixed(4)),
    },
  }
}

function dominantOutcome(cases: HistoricalAnalogCase[]): HistoricalAnalogDominantOutcome {
  for (const horizon of ["24h", "7d", "4h", "1h"] as HistoricalAnalogHorizon[]) {
    const values = cases
      .map((item) => item.outcome.returns[horizon])
      .filter((value): value is number => value !== null)
    if (!values.length) continue
    const up = values.filter((value) => value > 0).length
    const down = values.filter((value) => value < 0).length
    if (up / values.length >= 0.6) return "up"
    if (down / values.length >= 0.6) return "down"
    return "mixed"
  }
  return "unavailable"
}

export function aggregateHistoricalAnalogOutcomes(
  cases: HistoricalAnalogCase[],
): HistoricalAnalogStatistics {
  return {
    totalCases: cases.length,
    byHorizon: Object.fromEntries(
      HORIZONS.map((horizon) => [horizon, horizonStats(cases, horizon)]),
    ) as HistoricalAnalogStatistics["byHorizon"],
    dominantOutcome: dominantOutcome(cases),
  }
}
