import type {
  DashboardMarketStateSnapshot,
  HistoricalAnalogRecord,
  HistoricalInterval,
  HistoricalMarketSnapshot,
  MarketStateDirection,
  VerdictAccuracyStats,
  VerdictHorizon,
  VerdictRecord,
} from "@/types/historical"

const HORIZONS: Array<{ horizon: VerdictHorizon; ms: number }> = [
  { horizon: "1h", ms: 60 * 60 * 1000 },
  { horizon: "4h", ms: 4 * 60 * 60 * 1000 },
  { horizon: "24h", ms: 24 * 60 * 60 * 1000 },
  { horizon: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
]
const MIN_COMPLETED_OUTCOMES = 20

function dateKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function average(values: number[]) {
  if (!values.length) return null
  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1))
}

function successForDirection(direction: MarketStateDirection, forwardReturn: number) {
  if (direction === "bullish") return forwardReturn > 0
  if (direction === "bearish") return forwardReturn < 0
  return null
}

function findForwardSnapshot(
  snapshots: HistoricalMarketSnapshot[],
  base: HistoricalMarketSnapshot,
  targetTimestamp: number,
) {
  let best: HistoricalMarketSnapshot | null = null
  for (const snapshot of snapshots) {
    if (snapshot.symbol !== base.symbol || snapshot.interval !== base.interval) continue
    if (snapshot.timestamp < targetTimestamp) continue
    if (!best || snapshot.timestamp < best.timestamp) best = snapshot
  }
  return best
}

export function buildHistoricalAnalogRecord(input: {
  current: DashboardMarketStateSnapshot
  interval: HistoricalInterval
  match: HistoricalMarketSnapshot
  matchedConditions: string[]
  source: HistoricalAnalogRecord["source"]
  queryPath: string
}) {
  const createdAt = new Date().toISOString()
  const id = [
    "analog",
    input.current.id,
    input.interval,
    input.match.id,
  ].join(":")

  return {
    id,
    createdAt,
    currentSymbol: input.current.symbol,
    currentTimestamp: input.current.timestamp,
    currentDirection: input.current.direction,
    interval: input.interval,
    matchedSymbol: input.match.symbol,
    matchedSnapshotId: input.match.id,
    matchedTimestamp: input.match.timestamp,
    matchedDate: dateKey(input.match.timestamp),
    matchedConditionsJson: JSON.stringify(input.matchedConditions.slice(0, 3)),
    source: input.source,
    queryPath: input.queryPath,
  } satisfies HistoricalAnalogRecord
}

export function buildVerdictRecords(input: {
  analogRecord: HistoricalAnalogRecord
  match: HistoricalMarketSnapshot
  snapshots: HistoricalMarketSnapshot[]
}) {
  const createdAt = new Date().toISOString()

  return HORIZONS.map(({ horizon, ms }) => {
    const targetTimestamp = input.match.timestamp + ms
    const outcome = findForwardSnapshot(input.snapshots, input.match, targetTimestamp)
    const forwardReturn = outcome
      ? Number((((outcome.close - input.match.close) / input.match.close) * 100).toFixed(1))
      : null
    const success = forwardReturn === null ? null : successForDirection(input.analogRecord.currentDirection, forwardReturn)

    return {
      id: `verdict:${input.analogRecord.id}:${horizon}`,
      analogRecordId: input.analogRecord.id,
      createdAt,
      symbol: input.match.symbol,
      direction: input.analogRecord.currentDirection,
      horizon,
      baseTimestamp: input.match.timestamp,
      basePrice: input.match.close,
      targetTimestamp,
      outcomeTimestamp: outcome?.timestamp ?? null,
      forwardReturn,
      success,
      status: outcome ? "completed" : "insufficient_data",
    } satisfies VerdictRecord
  })
}

export function calculateVerdictAccuracy(records: VerdictRecord[]): VerdictAccuracyStats {
  const byHorizon = HORIZONS.reduce((accumulator, { horizon }) => {
    const scoped = records.filter((record) => record.horizon === horizon)
    const completed = scoped.filter((record) => record.status === "completed" && record.forwardReturn !== null)
    const directional = completed.filter((record) => record.success !== null)
    const wins = directional.filter((record) => record.success).length

    accumulator[horizon] = {
      total: scoped.length,
      completed: completed.length,
      winRate: directional.length ? Math.round((wins / directional.length) * 100) : null,
      avgForwardReturn: average(completed.map((record) => record.forwardReturn).filter((value): value is number => value !== null)),
    }
    return accumulator
  }, {} as VerdictAccuracyStats["byHorizon"])

  const completedOutcomes = records.filter((record) => record.status === "completed" && record.forwardReturn !== null).length

  return {
    status: completedOutcomes >= MIN_COMPLETED_OUTCOMES ? "available" : "insufficient_cases",
    totalVerdicts: records.length,
    completedOutcomes,
    byHorizon,
  }
}
