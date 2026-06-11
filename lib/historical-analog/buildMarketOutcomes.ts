import type { DominantOutcome, HistoricalMarketSnapshot, MarketOutcome, MarketStateDirection } from "@/types/historical"

function setupKey(snapshot: HistoricalMarketSnapshot) {
  return [
    snapshot.marketDirection,
    snapshot.momentumState,
    snapshot.breakoutState,
    snapshot.volatilityState,
  ].join(":")
}

function success(direction: MarketStateDirection, value: number | null) {
  if (value === null) return null
  if (direction === "bullish") return value > 0
  if (direction === "bearish") return value < 0
  return Math.abs(value) <= 2
}

function dominantOutcome(direction: MarketStateDirection, returns: Array<number | null>): DominantOutcome {
  const usable = returns.filter((value): value is number => value !== null)
  if (!usable.length) return "mixed"
  const average = usable.reduce((total, value) => total + value, 0) / usable.length

  if (direction === "bullish" && average > 0) return "bullish_continuation"
  if (direction === "bearish" && average < 0) return "bearish_continuation"
  if (direction === "neutral" && Math.abs(average) <= 2) return "range_continuation"
  return "mixed"
}

export function buildMarketOutcomes(snapshots: HistoricalMarketSnapshot[]): MarketOutcome[] {
  const now = new Date().toISOString()

  return snapshots
    .filter((snapshot) => snapshot.forwardReturn1d !== null || snapshot.forwardReturn7d !== null || snapshot.forwardReturn30d !== null)
    .map((snapshot) => {
    const direction = snapshot.marketDirection
    return {
      id: `outcome:${snapshot.id}`,
      snapshotId: snapshot.id,
      symbol: snapshot.symbol,
      interval: snapshot.interval,
      timestamp: snapshot.timestamp,
      setupKey: setupKey(snapshot),
      direction,
      momentumState: snapshot.momentumState,
      breakoutState: snapshot.breakoutState,
      volatilityState: snapshot.volatilityState,
      narrativeTagsJson: "[]",
      liquidityState: "unknown",
      sectorRotationState: "unknown",
      forwardReturn1d: snapshot.forwardReturn1d,
      forwardReturn7d: snapshot.forwardReturn7d,
      forwardReturn30d: snapshot.forwardReturn30d,
      success1d: success(direction, snapshot.forwardReturn1d),
      success7d: success(direction, snapshot.forwardReturn7d),
      success30d: success(direction, snapshot.forwardReturn30d),
      dominantOutcome: dominantOutcome(direction, [snapshot.forwardReturn1d, snapshot.forwardReturn7d, snapshot.forwardReturn30d]),
      createdAt: now,
    }
  })
}
