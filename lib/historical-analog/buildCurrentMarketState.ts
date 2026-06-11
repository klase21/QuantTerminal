import type { DashboardMarketStateSnapshot, HistoricalMarketSnapshot } from "@/types/historical"

export type CurrentHistoricalAnalogState = {
  symbol: string
  direction: "bullish" | "bearish" | "neutral"
  drivers: string[]
  momentumState: HistoricalMarketSnapshot["momentumState"]
  breakoutState: HistoricalMarketSnapshot["breakoutState"]
  liquidityState: DashboardMarketStateSnapshot["liquidityState"]
  narratives: string[]
  narrativeHeat: NonNullable<DashboardMarketStateSnapshot["narrativeHeat"]>
  dominantNarrative: string | null
  sectorRotationState: NonNullable<DashboardMarketStateSnapshot["sectorRotationState"]>
  etfFlowState: DashboardMarketStateSnapshot["etfFlowState"]
  predictionState: DashboardMarketStateSnapshot["predictionState"]
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

function momentumFromDirection(direction: DashboardMarketStateSnapshot["direction"]): HistoricalMarketSnapshot["momentumState"] {
  if (direction === "bullish") return "bullish_momentum"
  if (direction === "bearish") return "bearish_momentum"
  return "neutral_momentum"
}

function breakoutFromDrivers(drivers: string[]): HistoricalMarketSnapshot["breakoutState"] {
  if (drivers.some((driver) => driver.includes("breakout") || driver.includes("buying_pressure") || driver.includes("sector_rotation"))) {
    return "testing_upper_range"
  }
  if (drivers.some((driver) => driver.includes("selling_pressure"))) {
    return "testing_lower_range"
  }
  return "range_middle"
}

export function buildCurrentMarketState(snapshot: DashboardMarketStateSnapshot): CurrentHistoricalAnalogState {
  const drivers = parseJsonArray(snapshot.driversJson)

  return {
    symbol: snapshot.symbol,
    direction: snapshot.direction,
    drivers,
    momentumState: momentumFromDirection(snapshot.direction),
    breakoutState: breakoutFromDrivers(drivers),
    liquidityState: snapshot.liquidityState,
    narratives: parseJsonArray(snapshot.narrativesJson),
    narrativeHeat: snapshot.narrativeHeat ?? "unknown",
    dominantNarrative: snapshot.dominantNarrative ?? null,
    sectorRotationState: snapshot.sectorRotationState ?? "unknown",
    etfFlowState: snapshot.etfFlowState,
    predictionState: snapshot.predictionState,
  }
}
